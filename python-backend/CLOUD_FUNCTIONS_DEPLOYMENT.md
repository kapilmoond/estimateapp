# Google Cloud Functions Deployment Guide

Deploy your Professional DXF Drawing Generator to Google Cloud Functions for scalable, serverless operation.

## 🚀 Quick Start

### Prerequisites

1. **Google Cloud Account**: Create a free account at https://cloud.google.com/
2. **Google Cloud CLI**: Install from https://cloud.google.com/sdk/docs/install
3. **Gemini API Key**: Get from https://makersuite.google.com/app/apikey

### Step 1: Setup Google Cloud CLI

```bash
# Install Google Cloud CLI (if not already installed)
# Follow instructions at: https://cloud.google.com/sdk/docs/install

# Authenticate with Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create your-project-id --name="DXF Generator"

# Set the project
gcloud config set project your-project-id

# Enable billing (required for Cloud Functions)
# Go to: https://console.cloud.google.com/billing
```

### Step 2: Set Environment Variables

```bash
# Windows
set GEMINI_API_KEY=your_gemini_api_key_here

# Linux/Mac
export GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Deploy Using Automated Script

```bash
cd python-backend
python deploy.py
```

The script will:
- ✅ Check prerequisites
- ✅ Enable required APIs
- ✅ Deploy the function
- ✅ Test the deployment
- ✅ Provide the function URL

### Step 4: Update Frontend

Update your frontend DXF service URL:

```typescript
// In services/dxfService.ts
private static readonly PYTHON_BACKEND_URL = 'https://your-region-your-project.cloudfunctions.net/dxf-generator';
```

## 🔧 Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Deploy the function
gcloud functions deploy dxf-generator \
  --gen2 \
  --runtime python311 \
  --region us-central1 \
  --source . \
  --entry-point health_check \
  --trigger http \
  --allow-unauthenticated \
  --memory 512MB \
  --timeout 60s \
  --max-instances 10 \
  --requirements-file requirements-cloud.txt \
  --set-env-vars GEMINI_API_KEY=your_api_key_here
```

## 📋 Available Endpoints

Once deployed, your function will have these endpoints:

- **Health Check**: `GET /health`
- **AI DXF Generation**: `POST /generate-dxf-endpoint`
- **Hardcoded Test**: `POST /test-hardcoded-dxf`
- **Legacy Parsing**: `POST /parse-ai-drawing`
- **Basic DXF**: `POST /generate-dxf`
- **Download DXF**: `POST /download-dxf`

## 🔍 Testing Your Deployment

### Test Health Endpoint
```bash
curl https://your-region-your-project.cloudfunctions.net/dxf-generator/health
```

### Test Hardcoded DXF Generation
```bash
curl -X POST https://your-region-your-project.cloudfunctions.net/dxf-generator/test-hardcoded-dxf
```

### Test AI DXF Generation
```bash
curl -X POST https://your-region-your-project.cloudfunctions.net/dxf-generator/generate-dxf-endpoint \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Drawing","description":"Simple rectangular beam"}'
```

## 💰 Cost Optimization

### Free Tier Limits
- **2 million invocations/month** - FREE
- **400,000 GB-seconds/month** - FREE
- **200,000 GHz-seconds/month** - FREE

### Optimization Tips
1. **Memory**: 512MB is sufficient for most DXF generation
2. **Timeout**: 60s handles complex drawings
3. **Max Instances**: 10 prevents runaway costs
4. **Cold Starts**: First request may take 3-5 seconds

## 🔧 Configuration Options

### Memory Settings
```bash
--memory 256MB   # Basic drawings
--memory 512MB   # Complex drawings (recommended)
--memory 1GB     # Very complex drawings
```

### Timeout Settings
```bash
--timeout 30s    # Simple drawings
--timeout 60s    # Complex drawings (recommended)
--timeout 120s   # Very complex drawings
```

### Scaling Settings
```bash
--max-instances 1     # Development
--max-instances 10    # Production (recommended)
--max-instances 100   # High traffic
```

## 🐛 Debugging

### View Logs
```bash
gcloud functions logs read dxf-generator --region us-central1
```

### View Function Details
```bash
gcloud functions describe dxf-generator --region us-central1
```

### Update Environment Variables
```bash
gcloud functions deploy dxf-generator \
  --update-env-vars GEMINI_API_KEY=new_api_key
```

## 🔄 Updates and Redeployment

To update your function:

```bash
# Make changes to your code
# Then redeploy
python deploy.py
```

Or manually:
```bash
gcloud functions deploy dxf-generator \
  --gen2 \
  --runtime python311 \
  --region us-central1 \
  --source .
```

## 🚨 Troubleshooting

### Common Issues

1. **"Permission denied"**
   ```bash
   gcloud auth login
   gcloud config set project your-project-id
   ```

2. **"Billing not enabled"**
   - Enable billing at https://console.cloud.google.com/billing

3. **"API not enabled"**
   ```bash
   gcloud services enable cloudfunctions.googleapis.com
   ```

4. **"Function timeout"**
   - Increase timeout: `--timeout 120s`

5. **"Memory limit exceeded"**
   - Increase memory: `--memory 1GB`

### Debug Mode
Add debug logging to your function:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🔐 Security

### Environment Variables
- Never commit API keys to code
- Use Cloud Functions environment variables
- Rotate API keys regularly

### Access Control
```bash
# Remove public access (if needed)
gcloud functions remove-iam-policy-binding dxf-generator \
  --region us-central1 \
  --member allUsers \
  --role roles/cloudfunctions.invoker

# Add specific users
gcloud functions add-iam-policy-binding dxf-generator \
  --region us-central1 \
  --member user:email@example.com \
  --role roles/cloudfunctions.invoker
```

## 📊 Monitoring

### View Metrics
- Go to: https://console.cloud.google.com/functions
- Select your function
- View metrics, logs, and performance

### Set Up Alerts
- Configure alerts for errors, latency, or usage
- Get notified of issues automatically

## 🎯 Next Steps

1. **Deploy the function** using the automated script
2. **Test all endpoints** to ensure functionality
3. **Update your frontend** with the new function URL
4. **Monitor usage** and optimize as needed
5. **Set up alerts** for production monitoring

Your DXF Drawing Generator is now running serverlessly on Google Cloud Functions with the generous free tier limits!
