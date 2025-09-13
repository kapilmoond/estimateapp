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

echo.
echo Detecting Python version...
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Python version: %PYTHON_VERSION%

echo.
echo Choose startup method:
echo 1. Auto-install dependencies (recommended)
echo 2. Python 3.13 compatible mode (FAISS)
echo 3. Direct start (skip dependency check)
echo 4. Manual package installation
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" goto auto_install
if "%choice%"=="2" goto py313_mode
if "%choice%"=="3" goto direct_start
if "%choice%"=="4" goto manual_install

:auto_install
echo.
echo Starting with auto-install...
python start_server.py
goto end

:py313_mode
echo.
echo Starting Python 3.13 compatible mode...
call start_rag_server_py313.bat
goto end

:direct_start
echo.
echo Starting server directly...
python start_direct.py
goto end

:manual_install
echo.
echo Manual installation commands:
echo pip install fastapi uvicorn sentence-transformers python-multipart
echo pip install python-docx PyPDF2 openpyxl pydantic httpx aiofiles
echo pip install "numpy<2.0.0" faiss-cpu
echo.
echo After installation, run: python start_direct.py
pause
goto end

:end
pause
