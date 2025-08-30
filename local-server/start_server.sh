#!/bin/bash

echo ""
echo "================================================================"
echo "   HSR Construction Estimator - ezdxf Drawing Server"
echo "================================================================"
echo ""
echo "🚀 Starting local ezdxf drawing server..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo ""
    echo "Please install Python 3.8+ from https://python.org"
    echo "Or use your system package manager:"
    echo "  Ubuntu/Debian: sudo apt install python3 python3-pip"
    echo "  macOS: brew install python3"
    echo ""
    exit 1
fi

echo "✅ Python found"
echo ""

# Install required packages
echo "📦 Installing required packages..."
python3 -m pip install --upgrade pip
python3 -m pip install flask flask-cors ezdxf

echo ""
echo "🎯 Starting server..."
echo ""

# Start the server
python3 ezdxf_server.py

echo ""
echo "🛑 Server stopped"
