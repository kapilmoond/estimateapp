@echo off
title HSR Construction Estimator - ezdxf Drawing Server

echo.
echo ================================================================
echo    HSR Construction Estimator - ezdxf Drawing Server
echo ================================================================
echo.
echo 🚀 Starting local ezdxf drawing server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo.
    echo Please install Python 3.8+ from https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo ✅ Python found
echo.

REM Install required packages
echo 📦 Installing required packages...
python -m pip install --upgrade pip
python -m pip install flask flask-cors ezdxf

echo.
echo 🎯 Starting server...
echo.

REM Start the server
python ezdxf_server.py

echo.
echo 🛑 Server stopped
pause
