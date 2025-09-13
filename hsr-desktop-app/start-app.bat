@echo off
echo ================================================================
echo HSR Construction Estimator - Desktop Application
echo Professional Construction Cost Estimation
echo ================================================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if we're in the correct directory
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the hsr-desktop-app directory
    echo.
    pause
    exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
)

:: Start the application in development mode
echo Starting HSR Construction Estimator...
echo.
echo The application will open in a new window.
echo Press Ctrl+C to stop the application.
echo.

npm run dev

echo.
echo Application stopped.
pause
