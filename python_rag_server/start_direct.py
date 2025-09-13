"""
Direct server startup script
Bypasses dependency checking and starts the server directly
Use this if the main startup script has issues
"""

import sys
import os
import subprocess
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Direct server startup"""
    logger.info("=== Direct RAG Server Startup ===")
    
    try:
        # Change to script directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(script_dir)
        
        logger.info(f"Starting server from: {script_dir}")
        logger.info("Note: This bypasses dependency checking")
        logger.info("Make sure you have installed the required packages")
        
        # Start the server directly
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "rag_server:app",
            "--host", "127.0.0.1",
            "--port", "8001",
            "--reload"
        ])
        
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        logger.info("Try installing packages manually:")
        logger.info("pip install fastapi uvicorn sentence-transformers python-multipart")
        logger.info("pip install python-docx PyPDF2 openpyxl pydantic httpx aiofiles")
        logger.info("pip install 'numpy<2.0.0' faiss-cpu")

if __name__ == "__main__":
    main()
