# Professional RAG Knowledge Base System

A professional Retrieval-Augmented Generation (RAG) system with vector database capabilities for the HSR Construction Estimator app.

## 🎯 Features

### **Professional Vector Database**
- **ChromaDB**: Industry-standard vector database for semantic search
- **Sentence Transformers**: High-quality text embeddings using `all-MiniLM-L6-v2` model
- **Local Storage**: All data stays on your computer for privacy and security

### **Advanced Document Processing**
- **Multiple Formats**: PDF, DOCX, TXT, XLSX, XLS support
- **Intelligent Chunking**: Smart text splitting with configurable overlap
- **Metadata Extraction**: File size, word count, processing status tracking
- **Async Processing**: Non-blocking document processing with progress tracking

### **Semantic Search**
- **Vector Similarity**: Find relevant content based on meaning, not just keywords
- **Configurable Thresholds**: Adjust similarity requirements for precision
- **Ranked Results**: Results sorted by relevance score
- **Fast Retrieval**: Optimized for quick search responses

### **RESTful API**
- **FastAPI**: Modern, fast web framework with automatic API documentation
- **CORS Support**: Seamless integration with frontend applications
- **Error Handling**: Comprehensive error responses and logging
- **Health Checks**: Monitor server status and performance

## 🚀 Quick Start

### **1. Start the Server**
```bash
# Windows
cd python_rag_server
start_rag_server.bat

# Or manually
python start_server.py
```

### **2. Server Information**
- **URL**: http://127.0.0.1:8001
- **API Docs**: http://127.0.0.1:8001/docs
- **Health Check**: http://127.0.0.1:8001/health

### **3. First Run**
The first startup will:
- Install required Python packages
- Download the embedding model (~90MB)
- Initialize the vector database
- Start the server

## 📁 File Structure

```
python_rag_server/
├── rag_server.py           # Main FastAPI server
├── models.py               # Pydantic data models
├── document_processor.py   # Document parsing and chunking
├── vector_store.py         # ChromaDB vector operations
├── start_server.py         # Server startup script
├── start_rag_server.bat    # Windows batch file
├── requirements.txt        # Python dependencies
├── rag_data/              # Local data storage
│   ├── chroma_db/         # Vector database files
│   └── documents.json     # Document metadata
└── README.md              # This file
```

## 🔧 API Endpoints

### **Server Status**
```http
GET /status
```
Returns server information and statistics.

### **Upload Document**
```http
POST /upload
Content-Type: multipart/form-data
```
Upload and process a document for the knowledge base.

### **Search Documents**
```http
POST /search
Content-Type: application/json

{
  "query": "your search query",
  "maxResults": 10,
  "similarityThreshold": 0.7
}
```

### **Get All Documents**
```http
GET /documents
```
Retrieve all documents in the knowledge base.

### **Delete Document**
```http
DELETE /documents/{document_id}
```
Remove a document and its chunks from the knowledge base.

### **Clear All Documents**
```http
DELETE /clear
```
Remove all documents and reset the knowledge base.

## 🛠️ Configuration

### **Embedding Model**
Default: `all-MiniLM-L6-v2`
- Fast and efficient
- Good balance of speed and quality
- ~90MB download size

### **Chunking Parameters**
- **Chunk Size**: 1000 characters
- **Overlap**: 200 characters
- **Max Results**: 10 documents

### **Server Settings**
- **Host**: 127.0.0.1 (localhost only)
- **Port**: 8001
- **CORS**: Enabled for frontend integration

## 📊 Performance

### **Typical Performance**
- **Document Upload**: 1-5 seconds per document
- **Search Query**: 100-500ms response time
- **Memory Usage**: 200-500MB depending on knowledge base size
- **Storage**: ~1-2MB per document in vector database

### **Scalability**
- **Documents**: Tested with 100+ documents
- **Chunks**: Handles 10,000+ text chunks efficiently
- **Concurrent Users**: Supports multiple simultaneous requests

## 🔍 How It Works

### **1. Document Processing**
1. File uploaded via API
2. Content extracted based on file type
3. Text cleaned and normalized
4. Split into overlapping chunks
5. Embeddings generated for each chunk
6. Stored in vector database

### **2. Semantic Search**
1. Query text converted to embedding
2. Vector similarity search in ChromaDB
3. Results ranked by similarity score
4. Filtered by threshold
5. Returned with metadata

### **3. RAG Integration**
1. User query enhanced with relevant context
2. Top matching chunks included in prompt
3. LLM generates response using knowledge base
4. Sources and relevance scores provided

## 🐛 Troubleshooting

### **Server Won't Start**
- Check Python version (3.8+ required)
- Ensure all dependencies are installed
- Check port 8001 is not in use
- Review console output for errors

### **Upload Fails**
- Verify file format is supported
- Check file size (large files may timeout)
- Ensure sufficient disk space
- Review server logs

### **Search Returns No Results**
- Lower similarity threshold
- Try different search terms
- Check if documents are processed
- Verify knowledge base has content

### **Performance Issues**
- Restart the server
- Clear browser cache
- Check available memory
- Reduce chunk size if needed

## 📝 Development

### **Adding New File Types**
Extend `document_processor.py` with new extraction methods.

### **Custom Embedding Models**
Modify the embedding model in `rag_server.py` initialization.

### **Database Configuration**
Adjust ChromaDB settings in `vector_store.py`.

## 🔒 Security & Privacy

- **Local Processing**: All data stays on your computer
- **No External Calls**: Embeddings generated locally
- **Secure Storage**: Files stored in local database
- **Access Control**: Server only accessible from localhost

## 📄 License

This RAG system is part of the HSR Construction Estimator project.
