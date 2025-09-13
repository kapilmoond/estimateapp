@echo off
echo ===================================
echo    Professional RAG Server
echo    (Python 3.13 Compatible)
echo ===================================
echo.

cd /d "%~dp0"

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.13 from https://python.org
    pause
    exit /b 1
)

echo Installing Python 3.13 compatible packages...
echo This will use FAISS instead of ChromaDB for better compatibility
echo.

pip install --upgrade pip
pip install fastapi==0.115.0 uvicorn[standard]==0.32.0
pip install "numpy<2.0.0,>=1.21.0"
pip install faiss-cpu==1.9.0
pip install sentence-transformers==3.3.1
pip install python-multipart==0.0.12
pip install python-docx==1.1.2
pip install PyPDF2==3.0.1
pip install openpyxl==3.1.5
pip install pydantic==2.10.3
pip install httpx==0.28.1
pip install aiofiles==24.1.0
pip install chardet==5.2.0
pip install tiktoken==0.8.0

echo.
echo Starting RAG server with FAISS vector store...
echo.
echo Server will be available at: http://127.0.0.1:8001
echo Press Ctrl+C to stop the server
echo.

python rag_server.py

pause
