# Professional DXF Drawing Generator Backend

This Python backend provides professional CAD-quality DXF file generation using the **ezdxf** library, replacing the SVG system with true CAD drawings.

## 🏗️ Features

- **Professional DXF Generation**: Uses ezdxf library for industry-standard CAD files
- **Construction Standards**: Follows construction industry drawing standards
- **Multiple Elements**: Supports beams, columns, foundations, walls, slabs
- **Proper Layers**: Standard CAD layers (STRUCTURAL, DIMENSIONS, TEXT, etc.)
- **Title Blocks**: Professional title blocks with drawing information
- **Reinforcement Details**: Detailed reinforcement patterns and specifications

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Installation & Setup

1. **Navigate to the python-backend directory:**
   ```bash
   cd python-backend
   ```

2. **Run the setup script:**
   ```bash
   python setup.py
   ```

   This will:
   - Install all required dependencies (ezdxf, flask, flask-cors)
   - Start the Flask development server on http://localhost:5000

3. **Keep the server running** while using the HSR Construction Estimator app

### Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
```

## 🔗 API Endpoints

### Health Check
```
GET /health
```
Returns server status and version information.

### Generate DXF Drawing
```
POST /generate-dxf
Content-Type: application/json

{
  "title": "Concrete Beam Detail",
  "description": "Reinforced concrete beam with dimensions",
  "elements": [
    {
      "type": "concrete_beam",
      "specifications": {
        "length": 6000,
        "width": 300,
        "height": 600,
        "reinforcement": "4-T20 + 2-T16"
      }
    }
  ]
}
```

### Parse AI Description
```
POST /parse-ai-drawing
Content-Type: application/json

{
  "title": "Steel Column Foundation",
  "description": "Create a drawing for a steel column with concrete foundation, 3 meters high with base plate"
}
```

### Download DXF File
```
POST /download-dxf
Content-Type: application/json

{
  "title": "Foundation Detail",
  "description": "Concrete foundation with reinforcement",
  "elements": [...]
}
```

## 🏗️ Supported Elements

### Concrete Beam
```json
{
  "type": "concrete_beam",
  "specifications": {
    "length": 6000,    // mm
    "width": 300,      // mm
    "height": 600,     // mm
    "reinforcement": "4-T20 + 2-T16"
  }
}
```

### Steel Column
```json
{
  "type": "steel_column",
  "specifications": {
    "height": 3000,    // mm
    "section": "UC 305x305x97",
    "base_plate": true
  }
}
```

### Foundation
```json
{
  "type": "foundation",
  "specifications": {
    "length": 2000,    // mm
    "width": 2000,     // mm
    "depth": 1000,     // mm
    "reinforcement": "T16@200 B/W"
  }
}
```

## 📁 File Structure

```
python-backend/
├── app.py              # Flask API server
├── dxf_generator.py    # Core DXF generation logic
├── requirements.txt    # Python dependencies
├── setup.py           # Setup and start script
└── README.md          # This file
```

## 🔧 Configuration

### Default Settings
- **Server Port**: 5000
- **Drawing Units**: Millimeters (mm)
- **DXF Version**: R2018 (maximum compatibility)
- **Default Scale**: 1:100
- **Paper Size**: A3

### Environment Variables
```bash
PORT=5000              # Server port (default: 5000)
DEBUG=True             # Debug mode (default: True)
```

## 🛠️ Development

### Adding New Element Types

1. **Add element type to `DXFElement` interface** in the frontend types
2. **Implement drawing logic** in `dxf_generator.py`:
   ```python
   def _draw_new_element(self, specs: Dict[str, Any]):
       # Implementation here
       pass
   ```
3. **Add to element dispatcher** in `add_structural_element()`

### Testing

Test the API endpoints using curl:

```bash
# Health check
curl http://localhost:5000/health

# Generate simple beam drawing
curl -X POST http://localhost:5000/parse-ai-drawing \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Beam", "description": "6 meter concrete beam"}'
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 5000
   lsof -ti:5000 | xargs kill -9
   ```

2. **ezdxf installation fails**
   ```bash
   # Update pip first
   pip install --upgrade pip
   pip install ezdxf
   ```

3. **CORS errors**
   - Ensure flask-cors is installed
   - Check that the frontend is making requests to http://localhost:5000

### Logs

Server logs are displayed in the terminal. Look for:
- ✅ Successful operations
- ❌ Error messages
- 🔄 Processing status

## 📞 Support

If you encounter issues:

1. Check that Python 3.8+ is installed
2. Verify all dependencies are installed correctly
3. Ensure the server is running on http://localhost:5000
4. Check the browser console for any CORS or network errors

## 🔄 Integration with Frontend

The HSR Construction Estimator app automatically connects to this backend when:

1. The Python server is running on localhost:5000
2. Drawing mode is selected in Step 1
3. A drawing request is made

The frontend will:
- Send drawing requests to `/parse-ai-drawing`
- Receive base64-encoded DXF content
- Allow users to download professional DXF files
- Display drawing previews (when available)

## 📋 Next Steps

After setup:

1. ✅ Start the Python backend server
2. ✅ Open the HSR Construction Estimator app
3. ✅ Switch to Drawing mode in Step 1
4. ✅ Request a drawing (e.g., "Create drawing for concrete beam")
5. ✅ Download the professional DXF file
6. ✅ Open in AutoCAD, Revit, or other CAD software

**🎉 You now have professional DXF drawing generation integrated with your construction estimator!**
