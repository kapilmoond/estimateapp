"""
Professional RAG Server with Vector Database
Provides semantic search capabilities using ChromaDB and sentence-transformers
"""

import os
import uuid
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import uvicorn

from document_processor import DocumentProcessor
from vector_store import VectorStore
from models import (
    RAGDocument, RAGChunk, RAGSearchResult, RAGConfig, 
    RAGServerStatus, DocumentUploadResponse, SearchRequest
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RAGServer:
    def __init__(self):
        self.app = FastAPI(title="Professional RAG Server", version="1.0.0")
        self.setup_cors()
        self.setup_routes()
        
        # Initialize components
        self.vector_store = None
        self.document_processor = None
        self.embedding_model = None
        self.config = RAGConfig(
            chunkSize=1000,
            chunkOverlap=200,
            maxResults=10,
            similarityThreshold=0.7,
            embeddingModel="all-MiniLM-L6-v2"
        )
        
        # Storage paths
        self.data_dir = "rag_data"
        self.documents_file = os.path.join(self.data_dir, "documents.json")
        
        # Initialize on startup
        self.initialize()
    
    def setup_cors(self):
        """Setup CORS middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def initialize(self):
        """Initialize RAG components"""
        try:
            # Create data directory
            os.makedirs(self.data_dir, exist_ok=True)
            
            # Initialize embedding model
            logger.info(f"Loading embedding model: {self.config.embeddingModel}")
            self.embedding_model = SentenceTransformer(self.config.embeddingModel)
            
            # Initialize vector store
            self.vector_store = VectorStore(
                data_dir=self.data_dir,
                embedding_model=self.embedding_model
            )
            
            # Initialize document processor
            self.document_processor = DocumentProcessor(
                chunk_size=self.config.chunkSize,
                chunk_overlap=self.config.chunkOverlap
            )
            
            logger.info("RAG Server initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize RAG server: {e}")
            raise
    
    def setup_routes(self):
        """Setup API routes"""
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint"""
            return {"status": "healthy", "timestamp": datetime.now().isoformat()}
        
        @self.app.get("/status", response_model=RAGServerStatus)
        async def get_status():
            """Get server status"""
            documents = self.load_documents()
            total_chunks = sum(doc.metadata.chunkCount for doc in documents)
            
            return RAGServerStatus(
                isRunning=True,
                port=8001,
                documentsCount=len(documents),
                chunksCount=total_chunks,
                embeddingModel=self.config.embeddingModel
            )
        
        @self.app.post("/upload", response_model=DocumentUploadResponse)
        async def upload_document(
            background_tasks: BackgroundTasks,
            file: UploadFile = File(...)
        ):
            """Upload and process a document"""
            try:
                # Validate file type
                allowed_types = ['.pdf', '.docx', '.txt', '.xlsx', '.xls']
                file_ext = os.path.splitext(file.filename)[1].lower()
                if file_ext not in allowed_types:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Unsupported file type: {file_ext}"
                    )
                
                # Create document record
                doc_id = str(uuid.uuid4())
                document = RAGDocument(
                    id=doc_id,
                    fileName=file.filename,
                    content="",  # Will be filled during processing
                    fileType=file_ext[1:],  # Remove the dot
                    uploadDate=datetime.now(),
                    metadata={
                        "fileSize": 0,
                        "wordCount": 0,
                        "chunkCount": 0,
                        "processingStatus": "pending"
                    },
                    isActive=True
                )
                
                # Save document record
                self.save_document(document)
                
                # Process document in background
                background_tasks.add_task(
                    self.process_document_async, 
                    doc_id, 
                    file
                )
                
                return DocumentUploadResponse(
                    documentId=doc_id,
                    fileName=file.filename,
                    status="processing",
                    message="Document uploaded successfully and is being processed"
                )
                
            except Exception as e:
                logger.error(f"Error uploading document: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/search", response_model=RAGSearchResult)
        async def search_documents(request: SearchRequest):
            """Search documents using semantic similarity"""
            try:
                if not self.vector_store:
                    raise HTTPException(status_code=500, detail="Vector store not initialized")
                
                start_time = datetime.now()
                
                # Perform vector search
                results = await self.vector_store.search(
                    query=request.query,
                    max_results=request.maxResults or self.config.maxResults,
                    similarity_threshold=request.similarityThreshold or self.config.similarityThreshold
                )
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return RAGSearchResult(
                    chunks=results["chunks"],
                    scores=results["scores"],
                    query=request.query,
                    totalResults=len(results["chunks"]),
                    processingTime=processing_time
                )
                
            except Exception as e:
                logger.error(f"Error searching documents: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/documents", response_model=List[RAGDocument])
        async def get_documents():
            """Get all documents"""
            return self.load_documents()
        
        @self.app.delete("/documents/{document_id}")
        async def delete_document(document_id: str):
            """Delete a document and its chunks"""
            try:
                # Remove from vector store
                if self.vector_store:
                    await self.vector_store.delete_document(document_id)
                
                # Remove from documents list
                documents = self.load_documents()
                documents = [doc for doc in documents if doc.id != document_id]
                self.save_documents(documents)
                
                return {"message": f"Document {document_id} deleted successfully"}
                
            except Exception as e:
                logger.error(f"Error deleting document: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.delete("/clear")
        async def clear_all_documents():
            """Clear all documents and reset the knowledge base"""
            try:
                # Clear vector store
                if self.vector_store:
                    await self.vector_store.clear_all()
                
                # Clear documents file
                self.save_documents([])
                
                return {"message": "All documents cleared successfully"}
                
            except Exception as e:
                logger.error(f"Error clearing documents: {e}")
                raise HTTPException(status_code=500, detail=str(e))
    
    async def process_document_async(self, doc_id: str, file: UploadFile):
        """Process document asynchronously"""
        try:
            # Update status to processing
            self.update_document_status(doc_id, "processing")
            
            # Read file content
            content = await file.read()
            
            # Process document
            processed_doc = await self.document_processor.process_file(
                file_content=content,
                filename=file.filename,
                file_type=os.path.splitext(file.filename)[1][1:]
            )
            
            # Update document with processed content
            documents = self.load_documents()
            for doc in documents:
                if doc.id == doc_id:
                    doc.content = processed_doc["content"]
                    doc.metadata["fileSize"] = len(content)
                    doc.metadata["wordCount"] = processed_doc["word_count"]
                    doc.metadata["chunkCount"] = len(processed_doc["chunks"])
                    doc.metadata["processingStatus"] = "completed"
                    break
            
            self.save_documents(documents)
            
            # Add to vector store
            await self.vector_store.add_document(
                doc_id=doc_id,
                chunks=processed_doc["chunks"]
            )
            
            logger.info(f"Document {doc_id} processed successfully")
            
        except Exception as e:
            logger.error(f"Error processing document {doc_id}: {e}")
            self.update_document_status(doc_id, "failed")
    
    def load_documents(self) -> List[RAGDocument]:
        """Load documents from storage"""
        try:
            if os.path.exists(self.documents_file):
                with open(self.documents_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return [RAGDocument(**doc) for doc in data]
            return []
        except Exception as e:
            logger.error(f"Error loading documents: {e}")
            return []
    
    def save_documents(self, documents: List[RAGDocument]):
        """Save documents to storage"""
        try:
            data = [doc.dict() for doc in documents]
            with open(self.documents_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving documents: {e}")
    
    def save_document(self, document: RAGDocument):
        """Save a single document"""
        documents = self.load_documents()
        documents.append(document)
        self.save_documents(documents)
    
    def update_document_status(self, doc_id: str, status: str):
        """Update document processing status"""
        documents = self.load_documents()
        for doc in documents:
            if doc.id == doc_id:
                doc.metadata["processingStatus"] = status
                break
        self.save_documents(documents)

# Global server instance
rag_server = RAGServer()
app = rag_server.app

if __name__ == "__main__":
    uvicorn.run(
        "rag_server:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
        log_level="info"
    )
