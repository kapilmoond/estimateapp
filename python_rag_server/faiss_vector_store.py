"""
Alternative vector store implementation using FAISS
More compatible with Python 3.13 and newer NumPy versions
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
import asyncio
import uuid
import pickle

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

import numpy as np
from sentence_transformers import SentenceTransformer

from models import RAGChunk

logger = logging.getLogger(__name__)

class FAISSVectorStore:
    def __init__(self, data_dir: str, embedding_model: SentenceTransformer):
        self.data_dir = data_dir
        self.embedding_model = embedding_model
        self.faiss_dir = os.path.join(data_dir, "faiss_db")
        self.index_file = os.path.join(self.faiss_dir, "index.faiss")
        self.metadata_file = os.path.join(self.faiss_dir, "metadata.json")
        
        # Create directories
        os.makedirs(self.faiss_dir, exist_ok=True)
        
        # Initialize FAISS index
        self.dimension = 384  # all-MiniLM-L6-v2 embedding dimension
        self.index = None
        self.metadata = {}
        self.chunk_counter = 0
        
        self.load_index()
    
    def load_index(self):
        """Load existing FAISS index and metadata"""
        try:
            if os.path.exists(self.index_file) and os.path.exists(self.metadata_file):
                # Load FAISS index
                if FAISS_AVAILABLE:
                    self.index = faiss.read_index(self.index_file)
                    logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
                else:
                    logger.warning("FAISS not available, using in-memory storage")
                    self.index = None
                
                # Load metadata
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
                
                self.chunk_counter = len(self.metadata)
                logger.info(f"Loaded metadata for {self.chunk_counter} chunks")
            else:
                # Create new index
                if FAISS_AVAILABLE:
                    self.index = faiss.IndexFlatIP(self.dimension)  # Inner product for cosine similarity
                    logger.info("Created new FAISS index")
                else:
                    logger.warning("FAISS not available, using in-memory storage")
                    self.index = None
                
                self.metadata = {}
                self.chunk_counter = 0
                
        except Exception as e:
            logger.error(f"Error loading FAISS index: {e}")
            # Fallback to new index
            if FAISS_AVAILABLE:
                self.index = faiss.IndexFlatIP(self.dimension)
            else:
                self.index = None
            self.metadata = {}
            self.chunk_counter = 0
    
    def save_index(self):
        """Save FAISS index and metadata"""
        try:
            if FAISS_AVAILABLE and self.index is not None:
                faiss.write_index(self.index, self.index_file)
            
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, indent=2, default=str)
            
            logger.info(f"Saved FAISS index with {len(self.metadata)} chunks")
            
        except Exception as e:
            logger.error(f"Error saving FAISS index: {e}")
    
    async def add_document(self, doc_id: str, chunks: List[Dict[str, Any]]):
        """Add document chunks to vector store"""
        try:
            if not chunks:
                logger.warning(f"No chunks to add for document {doc_id}")
                return
            
            # Prepare data
            chunk_texts = [chunk['content'] for chunk in chunks]
            
            # Generate embeddings
            logger.info(f"Generating embeddings for {len(chunk_texts)} chunks")
            embeddings = await self.generate_embeddings(chunk_texts)
            
            # Normalize embeddings for cosine similarity
            embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
            
            # Add to FAISS index
            if FAISS_AVAILABLE and self.index is not None:
                self.index.add(embeddings.astype(np.float32))
            
            # Store metadata
            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc_id}_{chunk['id']}"
                
                self.metadata[str(self.chunk_counter + i)] = {
                    "chunk_id": chunk_id,
                    "document_id": doc_id,
                    "content": chunk['content'],
                    "chunk_index": chunk['chunkIndex'],
                    "start_char": chunk['metadata']['startChar'],
                    "end_char": chunk['metadata']['endChar'],
                    "token_count": chunk['metadata']['tokenCount'],
                    "embedding": embeddings[i].tolist() if not FAISS_AVAILABLE else None
                }
            
            self.chunk_counter += len(chunks)
            
            # Save to disk
            self.save_index()
            
            logger.info(f"Added {len(chunks)} chunks for document {doc_id}")
            
        except Exception as e:
            logger.error(f"Error adding document {doc_id} to vector store: {e}")
            raise
    
    async def search(self, query: str, max_results: int = 10, similarity_threshold: float = 0.7) -> Dict[str, Any]:
        """Search for similar chunks"""
        try:
            # Generate query embedding
            query_embedding = await self.generate_embeddings([query])
            query_embedding = query_embedding / np.linalg.norm(query_embedding, axis=1, keepdims=True)
            
            chunks = []
            scores = []
            
            if FAISS_AVAILABLE and self.index is not None and self.index.ntotal > 0:
                # Search using FAISS
                k = min(max_results, self.index.ntotal)
                similarities, indices = self.index.search(query_embedding.astype(np.float32), k)
                
                for i, (similarity, idx) in enumerate(zip(similarities[0], indices[0])):
                    if similarity >= similarity_threshold:
                        metadata = self.metadata.get(str(idx))
                        if metadata:
                            chunk = RAGChunk(
                                id=metadata['chunk_id'],
                                documentId=metadata['document_id'],
                                content=metadata['content'],
                                chunkIndex=metadata['chunk_index'],
                                metadata={
                                    "startChar": metadata['start_char'],
                                    "endChar": metadata['end_char'],
                                    "tokenCount": metadata['token_count']
                                }
                            )
                            chunks.append(chunk)
                            scores.append(float(similarity))
            
            elif not FAISS_AVAILABLE:
                # Fallback: compute similarities manually
                query_vec = query_embedding[0]
                
                for idx, metadata in self.metadata.items():
                    if metadata.get('embedding'):
                        chunk_vec = np.array(metadata['embedding'])
                        similarity = np.dot(query_vec, chunk_vec)
                        
                        if similarity >= similarity_threshold:
                            chunk = RAGChunk(
                                id=metadata['chunk_id'],
                                documentId=metadata['document_id'],
                                content=metadata['content'],
                                chunkIndex=metadata['chunk_index'],
                                metadata={
                                    "startChar": metadata['start_char'],
                                    "endChar": metadata['end_char'],
                                    "tokenCount": metadata['token_count']
                                }
                            )
                            chunks.append(chunk)
                            scores.append(float(similarity))
                
                # Sort by similarity
                if chunks:
                    sorted_pairs = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
                    chunks, scores = zip(*sorted_pairs[:max_results])
                    chunks, scores = list(chunks), list(scores)
            
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
            # Find chunks to delete
            indices_to_delete = []
            for idx, metadata in self.metadata.items():
                if metadata['document_id'] == doc_id:
                    indices_to_delete.append(idx)
            
            # Remove from metadata
            for idx in indices_to_delete:
                del self.metadata[idx]
            
            # Note: FAISS doesn't support deletion, so we rebuild the index
            if indices_to_delete:
                await self.rebuild_index()
            
            logger.info(f"Deleted {len(indices_to_delete)} chunks for document {doc_id}")
            
        except Exception as e:
            logger.error(f"Error deleting document {doc_id} from vector store: {e}")
            raise
    
    async def clear_all(self):
        """Clear all documents from vector store"""
        try:
            # Clear index
            if FAISS_AVAILABLE:
                self.index = faiss.IndexFlatIP(self.dimension)
            else:
                self.index = None
            
            # Clear metadata
            self.metadata = {}
            self.chunk_counter = 0
            
            # Save empty state
            self.save_index()
            
            logger.info("Cleared all documents from vector store")
            
        except Exception as e:
            logger.error(f"Error clearing vector store: {e}")
            raise
    
    async def rebuild_index(self):
        """Rebuild FAISS index from metadata (needed for deletions)"""
        try:
            if not FAISS_AVAILABLE:
                return
            
            # Create new index
            self.index = faiss.IndexFlatIP(self.dimension)
            
            # Collect all embeddings and reindex metadata
            embeddings = []
            new_metadata = {}
            new_counter = 0
            
            for old_idx, metadata in self.metadata.items():
                if metadata.get('embedding'):
                    embeddings.append(metadata['embedding'])
                    new_metadata[str(new_counter)] = metadata
                    new_counter += 1
            
            if embeddings:
                embeddings = np.array(embeddings).astype(np.float32)
                self.index.add(embeddings)
            
            self.metadata = new_metadata
            self.chunk_counter = new_counter
            
            # Save rebuilt index
            self.save_index()
            
            logger.info(f"Rebuilt FAISS index with {len(self.metadata)} chunks")
            
        except Exception as e:
            logger.error(f"Error rebuilding FAISS index: {e}")
            raise
    
    async def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for texts"""
        try:
            # Run embedding generation in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(
                None, 
                self.embedding_model.encode, 
                texts
            )
            
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise
    
    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics"""
        try:
            # Count unique documents
            unique_docs = set()
            for metadata in self.metadata.values():
                unique_docs.add(metadata['document_id'])
            
            return {
                "total_chunks": len(self.metadata),
                "total_documents": len(unique_docs),
                "vector_store": "FAISS" if FAISS_AVAILABLE else "In-Memory",
                "faiss_available": FAISS_AVAILABLE
            }
            
        except Exception as e:
            logger.error(f"Error getting vector store stats: {e}")
            return {
                "total_chunks": 0,
                "total_documents": 0,
                "vector_store": "Error",
                "faiss_available": FAISS_AVAILABLE
            }
