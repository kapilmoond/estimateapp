"""
Pydantic models for the RAG server
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class RAGDocument(BaseModel):
    id: str
    fileName: str
    content: str
    fileType: str
    uploadDate: datetime
    metadata: Dict[str, Any]
    isActive: bool = True

class RAGChunk(BaseModel):
    id: str
    documentId: str
    content: str
    chunkIndex: int
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any]

class RAGSearchResult(BaseModel):
    chunks: List[RAGChunk]
    scores: List[float]
    query: str
    totalResults: int
    processingTime: float

class RAGConfig(BaseModel):
    chunkSize: int = 1000
    chunkOverlap: int = 200
    maxResults: int = 10
    similarityThreshold: float = 0.7
    embeddingModel: str = "all-MiniLM-L6-v2"

class RAGServerStatus(BaseModel):
    isRunning: bool
    port: int
    documentsCount: int
    chunksCount: int
    embeddingModel: str

class DocumentUploadResponse(BaseModel):
    documentId: str
    fileName: str
    status: str
    message: str

class SearchRequest(BaseModel):
    query: str
    maxResults: Optional[int] = None
    similarityThreshold: Optional[float] = None
    includeMetadata: bool = True

class ProcessingStatus(BaseModel):
    documentId: str
    status: str  # pending, processing, completed, failed
    progress: float = 0.0
    message: str = ""
    chunksProcessed: int = 0
    totalChunks: int = 0
