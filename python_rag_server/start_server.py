"""
Startup script for the RAG server
Handles installation of dependencies and server startup
"""

import os
import sys
import subprocess
import logging
import time
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        logger.error("Python 3.8 or higher is required")
        return False
    logger.info(f"Python version: {sys.version}")
    return True

def install_dependencies():
    """Install required dependencies"""
    try:
        logger.info("Installing dependencies...")
        
        # Get the directory of this script
        script_dir = Path(__file__).parent
        requirements_file = script_dir / "requirements.txt"
        
        if not requirements_file.exists():
            logger.error(f"Requirements file not found: {requirements_file}")
            return False
        
        # Install dependencies
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Failed to install dependencies: {result.stderr}")
            return False
        
        logger.info("Dependencies installed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error installing dependencies: {e}")
        return False

def check_dependencies():
    """Check if all required dependencies are installed"""
    required_packages = [
        "fastapi",
        "uvicorn",
        "chromadb",
        "sentence_transformers",
        "python_multipart",
        "python_docx",
        "PyPDF2",
        "openpyxl",
        "pandas",
        "numpy",
        "torch",
        "transformers",
        "pydantic",
        "httpx",
        "aiofiles"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.warning(f"Missing packages: {missing_packages}")
        return False
    
    logger.info("All required packages are installed")
    return True

def start_server():
    """Start the RAG server"""
    try:
        logger.info("Starting RAG server...")
        
        # Get the directory of this script
        script_dir = Path(__file__).parent
        server_file = script_dir / "rag_server.py"
        
        if not server_file.exists():
            logger.error(f"Server file not found: {server_file}")
            return False
        
        # Change to script directory
        os.chdir(script_dir)
        
        # Start the server
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "rag_server:app",
            "--host", "127.0.0.1",
            "--port", "8001",
            "--reload"
        ])
        
        return True
        
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        return True
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        return False

def main():
    """Main startup function"""
    logger.info("=== RAG Server Startup ===")
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Check dependencies
    if not check_dependencies():
        logger.info("Installing missing dependencies...")
        if not install_dependencies():
            logger.error("Failed to install dependencies")
            sys.exit(1)
    
    # Start server
    logger.info("All checks passed. Starting server...")
    time.sleep(1)
    
    if not start_server():
        logger.error("Failed to start server")
        sys.exit(1)

if __name__ == "__main__":
    main()
