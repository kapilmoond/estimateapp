# Professional DXF Drawing Generator with ezdxf Debugging

This Python backend provides professional CAD-quality DXF file generation using the ezdxf library for the HSR Construction Estimator application, with comprehensive debugging features implemented according to the ezdxf debugging guidelines.

## 🚀 Quick Start

1. **Install Dependencies & Start Server**:
   ```bash
   python setup.py
   ```
   This will:
   - Install all required packages
   - Test ezdxf functionality comprehensively
   - Run hardcoded DXF tests
   - Check Gemini AI configuration
   - Start the server with debugging enabled

2. **Keep Running**:
   Keep the terminal open while using the HSR Construction Estimator app

## 🐛 Debugging Features Implemented

### 1. Comprehensive Logging System
The server logs everything at three critical checkpoints:

```python
# 📌 CHECKPOINT 1: Raw AI Response
print("--- RAW AI RESPONSE ---")
print(ai_response.text)

# 📌 CHECKPOINT 2: Cleaned JSON Text  
print("--- CLEANED TEXT FOR JSON PARSING ---")
print(cleaned_response_text)

# 📌 CHECKPOINT 3: Parsed Geometry Data
print("--- PARSED GEOMETRY DATA ---")
print(geometry_data)
```

### 2. Robust Entity Processing
Defensive programming with comprehensive error handling:

```python
for entity in entities:
    entity_type = entity.get('type')
    print(f"➡️ Processing entity: {entity_type}")
    
    try:
        if entity_type == 'LINE':
            start = entity.get('start_point')
            end = entity.get('end_point')
            if start and end:
                msp.add_line(start, end)
            else:
                print(f"🔴 WARNING: Skipping malformed LINE: {entity}")
        # ... more entity types with error handling
    except (TypeError, ValueError) as e:
        print(f"🔴 ERROR processing entity {entity}: {e}. Skipping.")
```

### 3. Hardcoded Test Endpoint
Isolated testing endpoint to verify ezdxf functionality:

```bash
POST /test-hardcoded-dxf
```

This endpoint creates a guaranteed-to-work DXF with:
- Simple line from (0,0) to (50,25)
- Circle at center (25,12.5) with radius 10

If this test fails, the problem is with ezdxf or the environment, not the AI data.

### 4. Setup Script Testing
The setup script runs comprehensive tests:
- ezdxf installation verification
- Basic functionality testing
- Memory buffer writing test
- File writing test
- Hardcoded geometry test

## 🔧 API Endpoints

### AI-Powered DXF Generation (NEW)
```
POST /generate-dxf-endpoint
Content-Type: application/json

{
  "title": "Construction Drawing",
  "description": "Drawing description",
  "user_requirements": "AI-generated content"
}
```
**Features:**
- Uses Gemini 2.0 Flash for geometry parsing
- Comprehensive logging at all stages
- Robust error handling for malformed data
- Direct DXF file download

### Hardcoded Test (Debugging)
```
POST /test-hardcoded-dxf
```
**Purpose:**
- Isolate ezdxf library issues
- Test without AI dependency
- Verify core DXF generation functionality

### Health Check
```
GET /health
```
Returns server status and available features.

### Legacy Endpoints
- `POST /generate-dxf` - Basic DXF generation
- `POST /download-dxf` - Direct DXF download
- `POST /parse-ai-drawing` - Legacy AI parsing

## 🤖 Gemini AI Configuration

### Setup API Key
```bash
# Windows
set GEMINI_API_KEY=your_api_key_here

# Linux/Mac
export GEMINI_API_KEY=your_api_key_here
```

### Get API Key
1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Set the environment variable
4. Restart the server

**Note:** The server works without Gemini API key, but AI-powered DXF generation will not be available.

## 🔍 Troubleshooting Guide

### Step 1: Check ezdxf Installation
```bash
python -c "import ezdxf; print(f'ezdxf version: {ezdxf.version}')"
```

### Step 2: Run Hardcoded Test
```bash
curl -X POST http://localhost:5000/test-hardcoded-dxf
```
If this fails, the issue is with ezdxf or environment setup.

### Step 3: Check AI Endpoint
```bash
curl -X POST http://localhost:5000/generate-dxf-endpoint \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Simple test drawing"}'
```

### Step 4: Monitor Console Output
Watch the server console for:
- Raw AI responses
- JSON parsing status
- Entity processing logs
- Error messages with specific details

### Common Issues & Solutions

1. **JSON Parsing Errors**:
   - Check "CLEANED TEXT FOR JSON PARSING" output
   - AI might be returning conversational text instead of JSON
   - Improve prompt specificity

2. **Entity Processing Errors**:
   - Check "PARSED GEOMETRY DATA" output
   - Verify coordinate format (numbers vs strings)
   - Check for missing required fields

3. **ezdxf Library Errors**:
   - Run hardcoded test first
   - Check ezdxf version compatibility
   - Verify Python environment

## 📋 Supported Geometry Types

### LINE Entity
```json
{
  "type": "LINE",
  "start_point": [x1, y1],
  "end_point": [x2, y2]
}
```

### CIRCLE Entity
```json
{
  "type": "CIRCLE",
  "center": [x, y],
  "radius": number
}
```

### ARC Entity
```json
{
  "type": "ARC",
  "center": [x, y],
  "radius": number,
  "start_angle": degrees,
  "end_angle": degrees
}
```

## 🏗️ Construction Elements

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
    "height": 3000,           // mm
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
    "length": 2000,           // mm
    "width": 2000,            // mm
    "depth": 1000,            // mm
    "reinforcement": "T16@200 B/W"
  }
}
```

## 🔧 Technical Specifications

- **DXF Version**: R2018 for maximum compatibility
- **Units**: Millimeters for construction precision
- **Coordinate System**: 2D Cartesian
- **Layers**: Standard construction layers
- **Library**: ezdxf 1.3.0+ for professional DXF generation
- **AI Model**: Gemini 2.0 Flash Experimental

## 📊 Debugging Output Example

```
--- RAW AI RESPONSE ---
{
  "entities": [
    {
      "type": "LINE",
      "start_point": [0, 0],
      "end_point": [100, 50]
    }
  ]
}
-----------------------------------

--- CLEANED TEXT FOR JSON PARSING ---
{
  "entities": [
    {
      "type": "LINE", 
      "start_point": [0, 0],
      "end_point": [100, 50]
    }
  ]
}
-----------------------------------

--- PARSED GEOMETRY DATA ---
{'entities': [{'type': 'LINE', 'start_point': [0, 0], 'end_point': [100, 50]}]}
----------------------------

➡️ Processing entity: LINE
✅ Hardcoded DXF generated successfully. Sending file.
```

## 🚀 Integration with Frontend

The frontend DXF service automatically:
1. Checks backend availability
2. Uses AI-powered endpoint when available
3. Falls back to demo mode if backend unavailable
4. Provides comprehensive error handling

## 📝 License

Part of the HSR Construction Estimator project.
