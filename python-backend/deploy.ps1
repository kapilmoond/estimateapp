# Google Cloud Functions Deployment Script for PowerShell
# Run this from Google Cloud SDK Shell or ensure gcloud is in PATH

Write-Host "Google Cloud Functions Deployment for DXF Drawing Generator" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "main.py")) {
    Write-Host "ERROR: main.py not found" -ForegroundColor Red
    Write-Host "Please run this script from the python-backend directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "requirements-cloud.txt")) {
    Write-Host "ERROR: requirements-cloud.txt not found" -ForegroundColor Red
    Write-Host "Please run this script from the python-backend directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if gcloud is available
try {
    $gcloudVersion = & gcloud --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Google Cloud CLI found" -ForegroundColor Green
        Write-Host $gcloudVersion[0] -ForegroundColor Gray
    } else {
        throw "gcloud not found"
    }
} catch {
    Write-Host "ERROR: Google Cloud CLI not found" -ForegroundColor Red
    Write-Host "Please run this from Google Cloud SDK Shell or ensure gcloud is in PATH" -ForegroundColor Red
    Write-Host "You can test by running: gcloud --version" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check authentication
try {
    $authList = & gcloud auth list 2>$null
    if ($authList -match "ACTIVE") {
        Write-Host "SUCCESS: Authenticated with Google Cloud" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Not authenticated with Google Cloud" -ForegroundColor Red
        Write-Host "Please run: gcloud auth login" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "ERROR: Could not check authentication" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Get current project
try {
    $projectId = & gcloud config get-value project 2>$null
    if ($projectId -and $projectId.Trim()) {
        $projectId = $projectId.Trim()
        Write-Host "Current project: $projectId" -ForegroundColor Green
    } else {
        Write-Host "ERROR: No Google Cloud project set" -ForegroundColor Red
        Write-Host "Please run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "ERROR: Could not get project ID" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for Gemini API key
$geminiKey = $env:GEMINI_API_KEY
if ($geminiKey) {
    Write-Host "SUCCESS: GEMINI_API_KEY is set" -ForegroundColor Green
} else {
    Write-Host "WARNING: GEMINI_API_KEY not set" -ForegroundColor Yellow
    Write-Host "AI-powered features will not work without the API key" -ForegroundColor Yellow
    Write-Host "You can set it with: `$env:GEMINI_API_KEY='your_api_key_here'" -ForegroundColor Yellow
}

# Get function name
$functionName = Read-Host "Enter function name (default: dxf-generator)"
if (-not $functionName) {
    $functionName = "dxf-generator"
}

# Get region
$region = Read-Host "Enter region (default: us-central1)"
if (-not $region) {
    $region = "us-central1"
}

Write-Host ""
Write-Host "Deployment Configuration:" -ForegroundColor Cyan
Write-Host "Project ID: $projectId" -ForegroundColor Gray
Write-Host "Function Name: $functionName" -ForegroundColor Gray
Write-Host "Region: $region" -ForegroundColor Gray
Write-Host "Gemini API Key: $(if ($geminiKey) { 'Set' } else { 'Not set' })" -ForegroundColor Gray
Write-Host ""

$confirm = Read-Host "Proceed with deployment? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Enabling required APIs..." -ForegroundColor Cyan

$apis = @(
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com", 
    "artifactregistry.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "Enabling $api..." -ForegroundColor Gray
    try {
        & gcloud services enable $api --project $projectId 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SUCCESS: Enabled $api" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Could not enable $api" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "WARNING: Could not enable $api" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Deploying function..." -ForegroundColor Cyan

# Build deployment command
$deployCmd = @(
    "gcloud", "functions", "deploy", $functionName,
    "--gen2",
    "--runtime", "python311", 
    "--region", $region,
    "--source", ".",
    "--entry-point", "health_check",
    "--trigger", "http",
    "--allow-unauthenticated",
    "--memory", "512MB",
    "--timeout", "60s", 
    "--max-instances", "10",
    "--requirements-file", "requirements-cloud.txt",
    "--project", $projectId
)

if ($geminiKey) {
    $deployCmd += "--set-env-vars"
    $deployCmd += "GEMINI_API_KEY=$geminiKey"
}

Write-Host "Running: $($deployCmd -join ' ')" -ForegroundColor Gray

try {
    & $deployCmd[0] $deployCmd[1..($deployCmd.Length-1)]
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS: Function deployed successfully!" -ForegroundColor Green
        
        # Get function URL
        Write-Host "Getting function URL..." -ForegroundColor Cyan
        try {
            $functionUrl = & gcloud functions describe $functionName --region $region --project $projectId --format="value(serviceConfig.uri)" 2>$null
            
            if ($functionUrl -and $functionUrl.Trim()) {
                $functionUrl = $functionUrl.Trim()
                Write-Host ""
                Write-Host "Function URL: $functionUrl" -ForegroundColor Green
                
                # Save URL to file
                try {
                    $functionUrl | Out-File -FilePath "function_url.txt" -Encoding UTF8
                    Write-Host "Function URL saved to function_url.txt" -ForegroundColor Gray
                } catch {
                    Write-Host "Could not save URL to file" -ForegroundColor Yellow
                }
                
                Write-Host ""
                Write-Host "Available endpoints:" -ForegroundColor Cyan
                Write-Host "- Health Check: $functionUrl/health" -ForegroundColor Gray
                Write-Host "- AI DXF Generation: $functionUrl/generate-dxf-endpoint" -ForegroundColor Gray
                Write-Host "- Hardcoded Test: $functionUrl/test-hardcoded-dxf" -ForegroundColor Gray
                Write-Host "- Legacy Parsing: $functionUrl/parse-ai-drawing" -ForegroundColor Gray
                
                Write-Host ""
                Write-Host "Next steps:" -ForegroundColor Cyan
                Write-Host "1. Copy the function URL above" -ForegroundColor Gray
                Write-Host "2. Open your HSR Construction Estimator app" -ForegroundColor Gray
                Write-Host "3. Go to 'View Project Data' -> 'Backend Configuration'" -ForegroundColor Gray
                Write-Host "4. Paste the URL and click 'Save & Test'" -ForegroundColor Gray
                Write-Host "5. Start generating professional DXF files!" -ForegroundColor Gray
            } else {
                Write-Host "WARNING: Could not retrieve function URL" -ForegroundColor Yellow
                Write-Host "Check the Google Cloud Console for your function details" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "WARNING: Could not retrieve function URL" -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "ERROR: Deployment failed" -ForegroundColor Red
        Write-Host "Check the error messages above for details" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Deployment failed" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Deployment process complete!" -ForegroundColor Green
Read-Host "Press Enter to exit"
