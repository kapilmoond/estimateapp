@echo off
echo ===================================
echo    Professional RAG Server
echo    (Python 3.11/3.12 Compatible)
echo ===================================
echo.

cd /d "%~dp0"

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11 or 3.12 from https://python.org
    echo Python 3.13 has compatibility issues with some packages
    pause
    exit /b 1
)

echo Installing compatible packages for older Python versions...
pip install fastapi uvicorn[standard] chromadb sentence-transformers python-multipart python-docx PyPDF2 openpyxl pandas numpy torch transformers pydantic httpx aiofiles chardet tiktoken xlrd

echo.
echo Starting RAG server...
echo.
echo Server will be available at: http://127.0.0.1:8001
echo Press Ctrl+C to stop the server
echo.

python start_server.py

pause
