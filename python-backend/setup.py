#!/usr/bin/env python3
"""
Setup script for Professional DXF Drawing Generator
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required Python packages"""
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ All requirements installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def start_server():
    """Start the Flask development server"""
    try:
        print("🚀 Starting Professional DXF Drawing Generator server...")
        print("📍 Server will be available at: http://localhost:5000")
        print("🔗 Health check: http://localhost:5000/health")
        print("📋 API endpoint: http://localhost:5000/generate-dxf")
        print("\n⚠️  Keep this terminal open while using the HSR Construction Estimator app")
        print("🛑 Press Ctrl+C to stop the server\n")
        
        subprocess.run([sys.executable, 'app.py'])
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

if __name__ == "__main__":
    print("🏗️  Professional DXF Drawing Generator Setup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('requirements.txt'):
        print("❌ requirements.txt not found. Please run this script from the python-backend directory.")
        sys.exit(1)
    
    # Install requirements
    print("📦 Installing Python dependencies...")
    if not install_requirements():
        sys.exit(1)
    
    print("\n" + "=" * 50)
    
    # Start server
    start_server()
