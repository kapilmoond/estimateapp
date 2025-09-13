# RAG Server - Single Startup Guide

## 🚀 Quick Start (TL;DR)

**Windows Users:**
```bash
# Double-click this file or run in command prompt
start_rag.bat
```

**All Platforms:**
```bash
python start_rag.py
```

## ✅ What's Fixed

### **Installation Conflicts Resolved**
- ✅ **Tokenizers version conflict** between ChromaDB and sentence-transformers
- ✅ **NumPy 2.0 compatibility** issues with Python 3.13
- ✅ **Automatic dependency resolution** with fallback options
- ✅ **Single startup script** replaces multiple confusing files

### **New Smart Startup System**
- ✅ **Automatic dependency checking** and installation
- ✅ **Version conflict resolution** (tokenizers, NumPy, etc.)
- ✅ **Comprehensive testing** before server start
- ✅ **Graceful error handling** with helpful messages
- ✅ **Multiple startup options** for different use cases

## 🛠️ Command Options

```bash
# Full automatic setup and start
python start_rag.py

# Skip dependency installation (if already installed)
python start_rag.py --skip-install

# Test dependencies only, don't start server
python start_rag.py --test-only

# Quick test without loading embedding model
python start_rag.py --skip-install --quick-test
```

## 🔧 What the Script Does

1. **Checks Python version** (3.8+ required, 3.13 supported)
2. **Installs/updates dependencies** with compatible versions
3. **Resolves version conflicts** automatically
4. **Tests all imports** to ensure everything works
5. **Creates data directories** if needed
6. **Tests server functionality** (optional)
7. **Starts the server** on http://127.0.0.1:8001

## 📊 Server Status

Once running, you can check:
- **Status**: http://127.0.0.1:8001/status
- **API Docs**: http://127.0.0.1:8001/docs
- **Health Check**: http://127.0.0.1:8001/health

## 🗑️ Cleaned Up Files

**Removed (no longer needed):**
- `start_rag_server.bat` (old, complex version)
- `fix_dependencies.bat` (conflicts handled automatically)
- `test_imports.py` (integrated into startup script)

**New Files:**
- `start_rag.py` (smart startup script)
- `start_rag.bat` (simple Windows launcher)

## 🎯 Key Improvements

### **Before (Problems)**
- Multiple confusing startup files
- Manual dependency conflict resolution
- No comprehensive testing
- Installation failures with Python 3.13
- Tokenizers version conflicts

### **After (Solutions)**
- Single startup command
- Automatic conflict resolution
- Built-in testing and validation
- Python 3.13 compatibility
- Graceful error handling

## 🚨 Troubleshooting

If you encounter issues:

1. **Run quick test first:**
   ```bash
   python start_rag.py --quick-test
   ```

2. **Check detailed logs:**
   ```bash
   python start_rag.py --test-only
   ```

3. **Force reinstall dependencies:**
   ```bash
   python start_rag.py
   ```

The startup script will provide detailed error messages and suggestions for any issues encountered.

## ✨ Ready to Use

Your RAG server is now ready with a single, reliable startup process that handles all the complexity automatically!
