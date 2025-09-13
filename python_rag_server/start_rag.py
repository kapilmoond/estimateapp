#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Professional RAG Server Startup Script
Single script to handle installation, dependency checking, and server startup
"""

import os
import sys
import subprocess
import importlib
import time
from pathlib import Path

def print_header():
    """Print startup header"""
    print("=" * 50)
    print("    Professional RAG Server")
    print("    HSR Construction Estimator")
    print("=" * 50)
    print()

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("ERROR: Python 3.8 or higher is required")
        return False
    
    print("[OK] Python version is compatible")
    return True

def install_package(package_name, version=None, fallback=None):
    """Install a package with optional version and fallback"""
    try:
        if version:
            package_spec = f"{package_name}=={version}"
        else:
            package_spec = package_name
            
        print(f"Installing {package_spec}...")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", package_spec
        ], capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            print(f"[OK] {package_name} installed successfully")
            return True
        else:
            print(f"[WARN] Failed to install {package_name}: {result.stderr}")
            if fallback:
                print(f"Trying fallback: {fallback}")
                return install_package(fallback)
            return False
            
    except subprocess.TimeoutExpired:
        print(f"[WARN] Installation of {package_name} timed out")
        return False
    except Exception as e:
        print(f"[ERROR] Failed to install {package_name}: {e}")
        return False

def check_and_install_dependencies():
    """Check and install all required dependencies"""
    print("Checking and installing dependencies...")
    print()
    
    # Core dependencies with specific versions for Python 3.13 compatibility
    dependencies = [
        ("pip", None),  # Upgrade pip first
        ("fastapi", "0.115.0"),
        ("uvicorn[standard]", "0.32.0"),
        ("numpy", "<2.0.0,>=1.21.0"),  # Important: NumPy < 2.0 for compatibility
        ("sentence-transformers", "3.3.1"),
        ("python-multipart", "0.0.12"),
        ("python-docx", "1.1.2"),
        ("PyPDF2", "3.0.1"),
        ("openpyxl", "3.1.5"),
        ("pydantic", "2.10.3"),
        ("httpx", "0.28.1"),
        ("aiofiles", "24.1.0"),
        ("chardet", "5.2.0"),
        ("tiktoken", "0.8.0"),
    ]
    
    # Install core dependencies
    failed_packages = []
    for package, version in dependencies:
        if not install_package(package, version):
            failed_packages.append(package)
    
    # Handle tokenizers version conflict between ChromaDB and sentence-transformers
    print("\nResolving tokenizers version conflicts...")

    # Try to install compatible versions
    print("Installing compatible tokenizers version...")
    install_package("tokenizers", "0.20.3")  # ChromaDB compatible version

    # Try ChromaDB (primary vector store)
    print("\nInstalling vector database...")
    chromadb_success = install_package("chromadb", "0.5.23")

    # If ChromaDB works, try to upgrade tokenizers for sentence-transformers
    if chromadb_success:
        print("Attempting to resolve sentence-transformers compatibility...")
        # Try upgrading transformers and tokenizers together
        subprocess.run([
            sys.executable, "-m", "pip", "install", "--upgrade",
            "transformers", "tokenizers"
        ], capture_output=True)

    # If ChromaDB fails, try FAISS as fallback
    faiss_success = False
    if not chromadb_success:
        print("ChromaDB failed, trying FAISS fallback...")
        faiss_success = install_package("faiss-cpu", "1.9.0")
    
    if not chromadb_success and not faiss_success:
        print("[ERROR] No vector database available! Please install manually:")
        print("  pip install chromadb")
        print("  OR")
        print("  pip install faiss-cpu")
        return False
    
    if failed_packages:
        print(f"\n[WARN] Some packages failed to install: {failed_packages}")
        print("The server may still work with existing packages")
    
    print("\n[OK] Dependency installation completed")
    return True

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing imports...")

    required_modules = [
        'fastapi', 'uvicorn', 'sentence_transformers', 'numpy',
        'pydantic', 'PyPDF2', 'docx', 'openpyxl', 'tiktoken'
    ]

    failed_imports = []
    for module in required_modules:
        try:
            importlib.import_module(module)
            print(f"[OK] {module}")
        except ImportError as e:
            print(f"[FAIL] {module}: {e}")
            failed_imports.append(module)

    # Test vector stores
    chromadb_available = False
    faiss_available = False

    try:
        importlib.import_module('chromadb')
        print("[OK] chromadb")
        chromadb_available = True
    except ImportError as e:
        print(f"[FAIL] chromadb: {e}")

    try:
        importlib.import_module('faiss')
        print("[OK] faiss")
        faiss_available = True
    except ImportError as e:
        print(f"[FAIL] faiss: {e}")

    if not chromadb_available and not faiss_available:
        print("[ERROR] No vector database available!")
        return False

    if failed_imports:
        print(f"\n[WARN] Some modules failed to import: {failed_imports}")
        print("Attempting to continue...")

    print("\n[OK] Import test completed")
    return True

def test_server_import():
    """Test if the RAG server can be imported"""
    print("Testing RAG server import...")

    try:
        # Change to the script directory
        script_dir = Path(__file__).parent
        os.chdir(script_dir)

        # Test server import
        from rag_server import app
        print("[OK] RAG server imports successfully")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to import RAG server: {e}")
        return False

def create_data_directory():
    """Create necessary data directories"""
    script_dir = Path(__file__).parent
    data_dir = script_dir / "rag_data"

    try:
        data_dir.mkdir(exist_ok=True)
        (data_dir / "chroma_db").mkdir(exist_ok=True)
        print(f"[OK] Data directory created: {data_dir}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to create data directory: {e}")
        return False

def start_server():
    """Start the RAG server"""
    print("\nStarting RAG server...")
    print("Server will be available at: http://127.0.0.1:8001")
    print("Supports requests from: https://kapilmoond.github.io")
    print("Press Ctrl+C to stop the server")
    print("-" * 50)

    try:
        import uvicorn
        uvicorn.run(
            "rag_server:app",
            host="127.0.0.1",
            port=8001,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n[INFO] Server stopped by user")
    except Exception as e:
        print(f"\n[ERROR] Server failed to start: {e}")
        return False

    return True

def main():
    """Main startup function"""
    print_header()

    # Check Python version
    if not check_python_version():
        input("Press Enter to exit...")
        return 1

    # Parse command line arguments
    skip_install = "--skip-install" in sys.argv
    test_only = "--test-only" in sys.argv
    quick_test = "--quick-test" in sys.argv

    if skip_install:
        print("[INFO] Skipping dependency installation")
    else:
        # Install dependencies
        if not check_and_install_dependencies():
            print("\n[ERROR] Dependency installation failed")
            input("Press Enter to exit...")
            return 1

    # Test imports
    if not test_imports():
        print("\n[ERROR] Import test failed")
        input("Press Enter to exit...")
        return 1

    # Create data directories
    if not create_data_directory():
        print("\n[ERROR] Failed to create data directories")
        input("Press Enter to exit...")
        return 1

    # Test server import (skip for quick tests)
    if not quick_test:
        if not test_server_import():
            print("\n[ERROR] Server import test failed")
            input("Press Enter to exit...")
            return 1
    else:
        print("[INFO] Skipping server import test (quick test mode)")

    if test_only or quick_test:
        print("\n[OK] All tests passed! Server is ready to start.")
        if not quick_test:
            input("Press Enter to exit...")
        return 0

    # Start server
    print("\n[OK] All checks passed! Starting server...")
    time.sleep(2)  # Brief pause before starting

    return 0 if start_server() else 1

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n[INFO] Startup interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        input("Press Enter to exit...")
        sys.exit(1)
