@echo off
echo Google Cloud Functions Deployment for DXF Drawing Generator
echo ============================================================

REM Check if we're in the right directory
if not exist "main.py" (
    echo ERROR: main.py not found
    echo Please run this script from the python-backend directory
    pause
    exit /b 1
)

if not exist "requirements-cloud.txt" (
    echo ERROR: requirements-cloud.txt not found
    echo Please run this script from the python-backend directory
    pause
    exit /b 1
)

REM Check if gcloud is available
gcloud --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Google Cloud CLI not found
    echo Please install Google Cloud CLI and ensure it's in your PATH
    echo Visit: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

echo SUCCESS: Google Cloud CLI found

REM Check authentication
gcloud auth list | findstr "ACTIVE" >nul
if errorlevel 1 (
    echo ERROR: Not authenticated with Google Cloud
    echo Please run: gcloud auth login
    pause
    exit /b 1
)

echo SUCCESS: Authenticated with Google Cloud

REM Get current project
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set PROJECT_ID=%%i

if "%PROJECT_ID%"=="" (
    echo ERROR: No Google Cloud project set
    echo Please run: gcloud config set project YOUR_PROJECT_ID
    pause
    exit /b 1
)

echo Current project: %PROJECT_ID%

REM Check for Gemini API key
if "%GEMINI_API_KEY%"=="" (
    echo WARNING: GEMINI_API_KEY not set
    echo AI-powered features will not work without the API key
    echo You can set it with: set GEMINI_API_KEY=your_api_key_here
) else (
    echo SUCCESS: GEMINI_API_KEY is set
)

REM Get function name
set /p FUNCTION_NAME="Enter function name (default: dxf-generator): "
if "%FUNCTION_NAME%"=="" set FUNCTION_NAME=dxf-generator

REM Get region
set /p REGION="Enter region (default: us-central1): "
if "%REGION%"=="" set REGION=us-central1

echo.
echo Deployment Configuration:
echo Project ID: %PROJECT_ID%
echo Function Name: %FUNCTION_NAME%
echo Region: %REGION%
echo.

set /p CONFIRM="Proceed with deployment? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo Deployment cancelled
    pause
    exit /b 0
)

echo.
echo Enabling required APIs...
gcloud services enable cloudfunctions.googleapis.com --project %PROJECT_ID%
gcloud services enable cloudbuild.googleapis.com --project %PROJECT_ID%
gcloud services enable artifactregistry.googleapis.com --project %PROJECT_ID%

echo.
echo Deploying function...

if "%GEMINI_API_KEY%"=="" (
    gcloud functions deploy %FUNCTION_NAME% ^
        --gen2 ^
        --runtime python311 ^
        --region %REGION% ^
        --source . ^
        --entry-point health_check ^
        --trigger http ^
        --allow-unauthenticated ^
        --memory 512MB ^
        --timeout 60s ^
        --max-instances 10 ^
        --requirements-file requirements-cloud.txt ^
        --project %PROJECT_ID%
) else (
    gcloud functions deploy %FUNCTION_NAME% ^
        --gen2 ^
        --runtime python311 ^
        --region %REGION% ^
        --source . ^
        --entry-point health_check ^
        --trigger http ^
        --allow-unauthenticated ^
        --memory 512MB ^
        --timeout 60s ^
        --max-instances 10 ^
        --requirements-file requirements-cloud.txt ^
        --set-env-vars GEMINI_API_KEY=%GEMINI_API_KEY% ^
        --project %PROJECT_ID%
)

if errorlevel 1 (
    echo.
    echo ERROR: Deployment failed
    pause
    exit /b 1
)

echo.
echo SUCCESS: Function deployed successfully!

REM Get function URL
echo Getting function URL...
for /f "tokens=*" %%i in ('gcloud functions describe %FUNCTION_NAME% --region %REGION% --project %PROJECT_ID% --format="value(serviceConfig.uri)" 2^>nul') do set FUNCTION_URL=%%i

if not "%FUNCTION_URL%"=="" (
    echo.
    echo Function URL: %FUNCTION_URL%
    echo %FUNCTION_URL% > function_url.txt
    echo Function URL saved to function_url.txt
    
    echo.
    echo Available endpoints:
    echo - Health Check: %FUNCTION_URL%/health
    echo - AI DXF Generation: %FUNCTION_URL%/generate-dxf-endpoint
    echo - Hardcoded Test: %FUNCTION_URL%/test-hardcoded-dxf
    echo - Legacy Parsing: %FUNCTION_URL%/parse-ai-drawing
    
    echo.
    echo Next steps:
    echo 1. Copy the function URL above
    echo 2. Open your HSR Construction Estimator app
    echo 3. Go to 'View Project Data' -^> 'Backend Configuration'
    echo 4. Paste the URL and click 'Save & Test'
    echo 5. Start generating professional DXF files!
) else (
    echo WARNING: Could not retrieve function URL
    echo Check the Google Cloud Console for your function details
)

echo.
echo Deployment complete!
pause
