# Manual Google Cloud Functions Deployment Guide

Since the automated scripts are having PATH issues with Google Cloud CLI on Windows, here's a step-by-step manual deployment guide.

## 🚀 Step-by-Step Deployment

### Step 1: Open Google Cloud SDK Shell
1. **Search for "Google Cloud SDK Shell"** in your Windows Start menu
2. **Run as Administrator** (right-click → "Run as administrator")
3. **Navigate to the python-backend directory**:
   ```bash
   cd "C:\Users\LAPTOP PC\Documents\GitHub\estimateapp\python-backend"
   ```

### Step 2: Verify Prerequisites
Run these commands in the Google Cloud SDK Shell:

```bash
# Check gcloud is working
gcloud --version

# Check authentication (should show your email as ACTIVE)
gcloud auth list

# Check current project (should show: micada-division)
gcloud config get-value project

# Set Gemini API key (if not already set)
set GEMINI_API_KEY=AIzaSyDG-d8A4_4Ech8jPzTTCq-hGFLySq4jF20
```

### Step 3: Enable Required APIs
```bash
gcloud services enable cloudfunctions.googleapis.com --project micada-division
gcloud services enable cloudbuild.googleapis.com --project micada-division
gcloud services enable artifactregistry.googleapis.com --project micada-division
```

### Step 4: Deploy the Function
Run this single command (copy and paste the entire block):

```bash
gcloud functions deploy dxf-generator --gen2 --runtime python311 --region us-central1 --source . --entry-point health_check --trigger http --allow-unauthenticated --memory 512MB --timeout 60s --max-instances 10 --requirements-file requirements-cloud.txt --set-env-vars GEMINI_API_KEY=AIzaSyDG-d8A4_4Ech8jPzTTCq-hGFLySq4jF20 --project micada-division
```

### Step 5: Get Function URL
After deployment completes, get the function URL:

```bash
gcloud functions describe dxf-generator --region us-central1 --project micada-division --format="value(serviceConfig.uri)"
```

## 📋 Expected Output

### During Deployment:
- You'll see "Deploying function..." messages
- Build logs will show Python dependencies being installed
- Should take 2-5 minutes to complete

### Success Message:
```
Deploying function (may take a while - up to 2 minutes)...done.
availableMemoryMb: 512
buildId: [BUILD_ID]
...
httpsTrigger:
  url: https://us-central1-micada-division.cloudfunctions.net/dxf-generator
```

### Function URL:
The URL will look like:
```
https://us-central1-micada-division.cloudfunctions.net/dxf-generator
```

## 🔧 Configure Frontend

1. **Copy the function URL** from the deployment output
2. **Open your HSR Construction Estimator app** in the browser
3. **Go to "View Project Data"** → **"Backend Configuration"**
4. **Paste the URL** in the "Google Cloud Functions URL" field
5. **Click "Save & Test"**
6. **Verify the status shows "✅ Backend Available"**

## 🧪 Test Your Deployment

### Test in Google Cloud SDK Shell:
```bash
# Test health endpoint
curl https://us-central1-micada-division.cloudfunctions.net/dxf-generator/health

# Test hardcoded DXF generation
curl -X POST https://us-central1-micada-division.cloudfunctions.net/dxf-generator/test-hardcoded-dxf
```

### Test in Your App:
1. Go to Step 1 in your HSR Construction Estimator
2. Enter a project description
3. Click "Generate Design & Drawing"
4. Select "Drawing" mode
5. You should get a professional DXF file download

## 🐛 Troubleshooting

### If Deployment Fails:

1. **Check Project Billing**:
   - Go to https://console.cloud.google.com/billing
   - Ensure billing is enabled for your project

2. **Check APIs are Enabled**:
   ```bash
   gcloud services list --enabled --project micada-division
   ```

3. **Check Permissions**:
   ```bash
   gcloud projects get-iam-policy micada-division
   ```

4. **View Deployment Logs**:
   ```bash
   gcloud functions logs read dxf-generator --region us-central1 --project micada-division
   ```

### If Function URL Doesn't Work:

1. **Check Function Status**:
   ```bash
   gcloud functions describe dxf-generator --region us-central1 --project micada-division
   ```

2. **Test with curl**:
   ```bash
   curl -v https://your-function-url/health
   ```

3. **Check Function Logs**:
   ```bash
   gcloud functions logs read dxf-generator --region us-central1 --project micada-division --limit 50
   ```

## 📊 Monitor Your Function

### View in Google Cloud Console:
1. Go to https://console.cloud.google.com/functions
2. Select your project: micada-division
3. Click on "dxf-generator"
4. View metrics, logs, and configuration

### Check Usage:
- **Free Tier**: 2 million invocations/month
- **Your Usage**: Visible in the console
- **Costs**: Should be $0 for normal usage

## 🔄 Update Your Function

To update the function after making code changes:

```bash
cd "C:\Users\LAPTOP PC\Documents\GitHub\estimateapp\python-backend"
gcloud functions deploy dxf-generator --gen2 --runtime python311 --region us-central1 --source . --entry-point health_check --trigger http --allow-unauthenticated --memory 512MB --timeout 60s --max-instances 10 --requirements-file requirements-cloud.txt --set-env-vars GEMINI_API_KEY=AIzaSyDG-d8A4_4Ech8jPzTTCq-hGFLySq4jF20 --project micada-division
```

## 🎯 Success Checklist

- [ ] Google Cloud SDK Shell opened
- [ ] Navigated to python-backend directory
- [ ] APIs enabled successfully
- [ ] Function deployed without errors
- [ ] Function URL obtained
- [ ] Frontend configured with URL
- [ ] Backend status shows "✅ Available"
- [ ] Test DXF generation works
- [ ] Professional DXF files download correctly

Once all steps are complete, you'll have a fully functional, serverless DXF generation system running on Google Cloud Functions!
