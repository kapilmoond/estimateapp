#!/usr/bin/env python3
"""
Google Cloud Functions Gen2 entry point for Professional DXF Drawing Generator
Fixed for Cloud Run deployment with proper Flask app setup
"""

import os
from flask import Flask
# Import the complete app from app.py
from app import app

# Cloud Functions Gen2 / Cloud Run setup
if __name__ == "__main__":
    # For local development
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
else:
    # For Cloud Functions Gen2 deployment
    # The app object from app.py will be used directly
    pass