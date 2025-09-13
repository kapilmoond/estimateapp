"""
Vector store implementation using ChromaDB
Handles embedding storage and semantic search
"""

import os
import logging
from typing import List, Dict, Any, Optional
import asyncio
import uuid

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import numpy as np

from models import RAGChunk

logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self, data_dir: str, embedding_model: SentenceTransformer):
        self.data_dir = data_dir
        self.embedding_model = embedding_model
        self.chroma_dir = os.path.join(data_dir, "chroma_db")
        
        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(
            path=self.chroma_dir,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create collection
        self.collection_name = "rag_documents"
        try:
            self.collection = self.client.get_collection(self.collection_name)
            logger.info(f"Loaded existing collection: {self.collection_name}")
        except:
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "RAG document chunks with embeddings"}
            )
            logger.info(f"Created new collection: {self.collection_name}")
    
    async def add_document(self, doc_id: str, chunks: List[Dict[str, Any]]):
        """Add document chunks to vector store"""
        try:
            if not chunks:
                logger.warning(f"No chunks to add for document {doc_id}")
                return
            
            # Prepare data for ChromaDB
            chunk_ids = []
            chunk_texts = []
            chunk_metadatas = []
            
            for chunk in chunks:
                chunk_id = f"{doc_id}_{chunk['id']}"
                chunk_ids.append(chunk_id)
                chunk_texts.append(chunk['content'])
                
                # Prepare metadata
                metadata = {
                    "document_id": doc_id,
                    "chunk_index": chunk['chunkIndex'],
                    "start_char": chunk['metadata']['startChar'],
                    "end_char": chunk['metadata']['endChar'],
                    "token_count": chunk['metadata']['tokenCount']
                }
                chunk_metadatas.append(metadata)
            
            # Generate embeddings
            logger.info(f"Generating embeddings for {len(chunk_texts)} chunks")
            embeddings = await self.generate_embeddings(chunk_texts)
            
            # Add to ChromaDB
            self.collection.add(
                ids=chunk_ids,
                documents=chunk_texts,
                embeddings=embeddings,
                metadatas=chunk_metadatas
            )
            
            logger.info(f"Added {len(chunks)} chunks for document {doc_id}")
            
        except Exception as e:
            logger.error(f"Error adding document {doc_id} to vector store: {e}")
            raise
    
    async def search(self, query: str, max_results: int = 10, similarity_threshold: float = 0.7) -> Dict[str, Any]:
        """Search for similar chunks"""
        try:
            # Generate query embedding
            query_embedding = await self.generate_embeddings([query])
            
            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=max_results,
                include=["documents", "metadatas", "distances"]
            )
            
            # Process results
            chunks = []
            scores = []
            
            if results['ids'] and len(results['ids']) > 0:
                for i, chunk_id in enumerate(results['ids'][0]):
                    # Convert distance to similarity score (ChromaDB returns distances)
                    distance = results['distances'][0][i]
                    similarity = 1 - distance  # Convert distance to similarity
                    
                    # Filter by similarity threshold
                    if similarity >= similarity_threshold:
                        metadata = results['metadatas'][0][i]
                        
                        chunk = RAGChunk(
                            id=chunk_id,
                            documentId=metadata['document_id'],
                            content=results['documents'][0][i],
                            chunkIndex=metadata['chunk_index'],
                            metadata={
                                "startChar": metadata['start_char'],
                                "endChar": metadata['end_char'],
                                "tokenCount": metadata['token_count']
                            }
                        )
                        
                        chunks.append(chunk)
                        scores.append(similarity)
            
            logger.info(f"Found {len(chunks)} relevant chunks for query: {query[:50]}...")
            
            return {
                "chunks": chunks,
                "scores": scores
            }
            
        except Exception as e:
            logger.error(f"Error searching vector store: {e}")
            raise
    
    async def delete_document(self, doc_id: str):
        """Delete all chunks for a document"""
        try:
            # Get all chunk IDs for this document
            results = self.collection.get(
                where={"document_id": doc_id},
                include=["metadatas"]
            )
            
            if results['ids']:
                # Delete chunks
                self.collection.delete(ids=results['ids'])
                logger.info(f"Deleted {len(results['ids'])} chunks for document {doc_id}")
            else:
                logger.info(f"No chunks found for document {doc_id}")
                
        except Exception as e:
            logger.error(f"Error deleting document {doc_id} from vector store: {e}")
            raise
    
    async def clear_all(self):
        """Clear all documents from vector store"""
        try:
            # Delete the collection and recreate it
            self.client.delete_collection(self.collection_name)
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"description": "RAG document chunks with embeddings"}
            )
            logger.info("Cleared all documents from vector store")
            
        except Exception as e:
            logger.error(f"Error clearing vector store: {e}")
            raise
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for texts"""
        try:
            # Run embedding generation in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(
                None, 
                self.embedding_model.encode, 
                texts
            )
            
            # Convert numpy arrays to lists
            return embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise
    
    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics"""
        try:
            # Get collection info
            collection_info = self.collection.get(include=["metadatas"])
            
            total_chunks = len(collection_info['ids']) if collection_info['ids'] else 0
            
            # Count unique documents
            unique_docs = set()
            if collection_info['metadatas']:
                for metadata in collection_info['metadatas']:
                    unique_docs.add(metadata['document_id'])
            
            return {
                "total_chunks": total_chunks,
                "total_documents": len(unique_docs),
                "collection_name": self.collection_name
            }
            
        except Exception as e:
            logger.error(f"Error getting vector store stats: {e}")
            return {
                "total_chunks": 0,
                "total_documents": 0,
                "collection_name": self.collection_name
            }
