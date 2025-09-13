@echo off
echo ===================================
echo    Professional RAG Server
echo ===================================
echo.

cd /d "%~dp0"

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://python.org
    pause
    exit /b 1
)

echo Starting RAG server...
echo.
echo Server will be available at: http://127.0.0.1:8001
echo Press Ctrl+C to stop the server
echo.

python start_server.py

pause
