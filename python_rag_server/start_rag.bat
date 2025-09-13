@echo off
REM Professional RAG Server Startup Script
REM Single script to start the RAG server with all dependencies

cd /d "%~dp0"

echo ===================================
echo    Professional RAG Server
echo    HSR Construction Estimator  
echo ===================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://python.org
    pause
    exit /b 1
)

REM Run the Python startup script
python start_rag.py

pause
