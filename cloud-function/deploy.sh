#!/bin/bash

# Google Cloud Function Deployment Script for ezdxf Drawing Generator
# Replace YOUR_PROJECT_ID with your actual Google Cloud Project ID

PROJECT_ID="YOUR_PROJECT_ID"
FUNCTION_NAME="ezdxf-drawing-generator"
REGION="us-central1"
RUNTIME="python311"
MEMORY="512MB"
TIMEOUT="540s"

echo "🚀 Deploying ezdxf Drawing Generator to Google Cloud Functions..."
echo "Project ID: $PROJECT_ID"
echo "Function Name: $FUNCTION_NAME"
echo "Region: $REGION"

# Deploy the function
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=$RUNTIME \
    --region=$REGION \
    --source=. \
    --entry-point=ezdxf_drawing_generator \
    --trigger=http \
    --allow-unauthenticated \
    --memory=$MEMORY \
    --timeout=$TIMEOUT \
    --project=$PROJECT_ID

echo "✅ Deployment complete!"
echo ""
echo "Your function URL will be:"
echo "https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
echo ""
echo "Add this URL to your environment variables:"
echo "REACT_APP_GOOGLE_CLOUD_FUNCTION_URL=https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
