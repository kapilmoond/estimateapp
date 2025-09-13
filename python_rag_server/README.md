# Professional RAG Knowledge Base System

A professional Retrieval-Augmented Generation (RAG) system with vector database capabilities for the HSR Construction Estimator app.

## 🚀 Quick Start

### **Single Command Startup**
```bash
# Windows - Double-click or run in command prompt
start_rag.bat

# Or run Python script directly
python start_rag.py
```

### **Command Line Options**
```bash
python start_rag.py                    # Full installation and startup
python start_rag.py --skip-install     # Skip dependency installation
python start_rag.py --test-only        # Test dependencies only, don't start server
```

## 🎯 Features

### **Professional Vector Database**
- **ChromaDB**: Industry-standard vector database (Primary choice)
- **FAISS**: High-performance alternative (Automatic fallback)
- **Automatic Fallback**: System chooses best available vector store
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

### **1. Python Version Compatibility**
- **Recommended**: Python 3.11 or 3.12 (full compatibility)
- **Python 3.13**: Supported with FAISS fallback (ChromaDB has NumPy 2.0 issues)
- **Minimum**: Python 3.8+

### **2. Start the Server**

#### **Simple One-Click Startup**
```bash
cd python_rag_server

# Windows - Double-click or run in command prompt
start_rag.bat

# Cross-platform - Run Python script directly
python start_rag.py
```

**Command Line Options:**
```bash
python start_rag.py                    # Full installation and startup
python start_rag.py --skip-install     # Skip dependency installation
python start_rag.py --test-only        # Test dependencies only, don't start server
```

**What it does:**
- ✅ Checks Python version compatibility
- ✅ Automatically installs/updates all required packages
- ✅ Resolves version conflicts (tokenizers, NumPy, etc.)
- ✅ Tests all imports and functionality
- ✅ Creates necessary data directories
- ✅ Starts server with proper CORS settings
- ✅ Works with your GitHub Pages deployment

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
├── faiss_vector_store.py   # FAISS fallback vector operations
├── start_rag.py            # Smart startup script (NEW)
├── start_rag.bat           # Windows batch file (NEW)
├── requirements.txt        # Python dependencies
├── requirements_minimal.txt # Minimal FAISS-only requirements
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

### **Python 3.13 Compatibility Issues**
If you see compilation errors with pandas or other packages:
1. **Use Python 3.11 or 3.12**: Download from https://python.org
2. **Try the minimal installer**: Use `start_rag_server_py311.bat`
3. **Manual installation**: Install packages one by one
4. **Alternative**: Use conda instead of pip

### **Server Won't Start**
- Check Python version (3.8+ required, 3.11-3.12 recommended)
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

## 🔧 Troubleshooting

### **Common Issues**

#### **"No module named 'chromadb'" or "No module named 'faiss'"**
```bash
# Run the startup script to auto-install dependencies
python start_rag.py

# Or install manually
pip install chromadb  # Primary choice
pip install faiss-cpu  # Fallback option
```

#### **Tokenizers Version Conflict**
```bash
# The startup script handles this automatically, but if needed:
pip install --upgrade transformers tokenizers
```

#### **NumPy 2.0 Compatibility Issues**
```bash
# Install compatible NumPy version
pip install "numpy<2.0.0,>=1.21.0"
```

#### **Server Won't Start**
```bash
# Test dependencies first
python start_rag.py --test-only

# Check if port 8001 is in use
netstat -an | findstr 8001  # Windows
lsof -i :8001               # macOS/Linux
```

#### **Import Errors**
```bash
# Skip installation and test imports
python start_rag.py --skip-install --test-only
```

### **Getting Help**
- Check the server logs for detailed error messages
- Use `--test-only` flag to diagnose issues
- Ensure Python 3.8+ is installed and in PATH

## 🔒 Security & Privacy

- **Local Processing**: All data stays on your computer
- **No External Calls**: Embeddings generated locally
- **Secure Storage**: Files stored in local database
- **Access Control**: Server only accessible from localhost

## 📄 License

This RAG system is part of the HSR Construction Estimator project.
