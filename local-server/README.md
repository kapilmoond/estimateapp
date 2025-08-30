# 🏗️ HSR Construction Estimator - Local ezdxf Drawing Server

A user-friendly local server that generates professional DXF files using the ezdxf Python library.

## 🚀 Quick Start

### Windows Users
1. **Double-click** `start_server.bat`
2. The server will automatically install required packages and start
3. Keep the window open while using the drawing feature

### Linux/Mac Users
1. **Open terminal** in this folder
2. **Run**: `chmod +x start_server.sh && ./start_server.sh`
3. Keep the terminal open while using the drawing feature

## 📋 What This Server Does

- **Receives** ezdxf Python code from the HSR Construction Estimator app
- **Executes** the code in a secure local environment
- **Generates** professional DXF files with complete CAD features
- **Returns** the DXF file for download and use in CAD software

## 🔧 Features

### Professional CAD Drawing Generation
- **Complete Geometry**: Lines, circles, arcs, polylines, rectangles
- **Professional Dimensions**: Linear, radius, diameter, angular dimensions
- **Text & Annotations**: Professional text placement and formatting
- **Layer Management**: Organized layers (CONSTRUCTION, DIMENSIONS, TEXT, CENTERLINES)
- **Industry Standards**: Follows IS 696, IS 962 technical drawing standards

### User-Friendly Operation
- **Automatic Setup**: Installs all required packages automatically
- **Error Handling**: Clear error messages and troubleshooting guidance
- **Real-time Logging**: See exactly what's happening during generation
- **Cross-Platform**: Works on Windows, Linux, and Mac

## 🌐 Server Endpoints

- **Health Check**: `http://127.0.0.1:8080/` - Check if server is running
- **Generate Drawing**: `http://127.0.0.1:8080/generate-drawing` - Main drawing generation
- **Test ezdxf**: `http://127.0.0.1:8080/test` - Test ezdxf functionality

## 📦 Requirements

- **Python 3.8+** (automatically checked and guided if missing)
- **Internet connection** (for initial package installation)

### Automatically Installed Packages
- `flask` - Web server framework
- `flask-cors` - Cross-origin resource sharing
- `ezdxf` - Professional DXF file generation library
- `numpy` - Mathematical operations
- `pyparsing` - Text parsing
- `fonttools` - Font handling

## 🛠️ Manual Installation (Optional)

If you prefer to install manually:

```bash
# Install Python packages
pip install -r requirements.txt

# Start the server
python ezdxf_server.py
```

## 🔍 Troubleshooting

### Server Won't Start
1. **Check Python**: Make sure Python 3.8+ is installed
2. **Check PATH**: Python should be in your system PATH
3. **Check Permissions**: Make sure you can write to the folder
4. **Check Port**: Make sure port 8080 is not in use

### Drawing Generation Fails
1. **Check Server**: Make sure the server window/terminal is still open
2. **Check Code**: The generated Python code should be valid ezdxf code
3. **Check Logs**: Look at the server console for error messages

### Connection Issues
1. **Firewall**: Make sure your firewall allows local connections on port 8080
2. **Antivirus**: Some antivirus software may block local servers
3. **Port Conflict**: If port 8080 is in use, edit `ezdxf_server.py` to change `SERVER_PORT`

## 📊 Server Status

When running, you'll see:
```
================================================================
   HSR Construction Estimator - ezdxf Drawing Server
================================================================
🚀 Server starting on: http://127.0.0.1:8080
📐 ezdxf version: 1.4.2
🕒 Started at: 2025-01-30 14:30:00

📋 Available endpoints:
   • Health check: http://127.0.0.1:8080/
   • Generate drawing: http://127.0.0.1:8080/generate-drawing
   • Test ezdxf: http://127.0.0.1:8080/test

✅ Server is ready to generate professional DXF drawings!
================================================================
```

## 🎯 Integration with HSR Construction Estimator

1. **Start this server** using the startup scripts
2. **Open the HSR Construction Estimator** in your browser
3. **Switch to Drawing mode** (📐 Technical Drawing)
4. **Enter your drawing requirements** and generate professional DXF files
5. **Download and use** in AutoCAD, FreeCAD, LibreCAD, or any CAD software

## 🔒 Security

- **Local Only**: Server only accepts connections from your computer (127.0.0.1)
- **No External Access**: Cannot be accessed from the internet
- **Temporary Files**: All generated files are cleaned up automatically
- **Safe Execution**: Python code runs in a controlled environment

## 📞 Support

If you encounter issues:
1. Check the server console for error messages
2. Make sure Python 3.8+ is installed and in PATH
3. Ensure port 8080 is available
4. Try restarting the server

The server provides detailed error messages to help troubleshoot any issues.

---

**Happy Drawing! 🎨📐**
