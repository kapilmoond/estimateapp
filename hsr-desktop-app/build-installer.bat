@echo off
echo ================================================================
echo HSR Construction Estimator - Build Installer
echo Creating Windows installer package
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

:: Install dependencies if needed
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
)

:: Clean previous builds
echo Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
if exist "release" rmdir /s /q "release"
echo.

:: Build the application
echo Building application...
echo.
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    echo.
    pause
    exit /b 1
)

:: Create Windows installer
echo Creating Windows installer...
echo.
npm run build:win
if %errorlevel% neq 0 (
    echo ERROR: Installer creation failed
    echo.
    pause
    exit /b 1
)

:: Create portable version
echo Creating portable version...
echo.
npm run build:win-portable
if %errorlevel% neq 0 (
    echo ERROR: Portable version creation failed
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo Build completed successfully!
echo ================================================================
echo.
echo Installer files created in the 'release' directory:
echo - HSR Construction Estimator Setup.exe (Installer)
echo - HSR-Construction-Estimator-Portable.exe (Portable)
echo.
echo You can now distribute these files to end users.
echo.
pause
