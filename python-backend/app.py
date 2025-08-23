#!/usr/bin/env python3
"""
Flask API server for Professional DXF Drawing Generation
Serves the ezdxf-based drawing generation service with AI-powered geometry parsing
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
import tempfile
import base64
import io
import google.generativeai as genai
from ezdxf import new, units
from dxf_generator import generate_construction_drawing, ProfessionalDXFGenerator

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure Gemini API
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
else:
    print("⚠️ WARNING: GEMINI_API_KEY not found in environment variables")
    print("   AI-powered DXF generation will not work without API key")
    model = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Professional DXF Drawing Generator',
        'version': '1.0.0'
    })

@app.route('/generate-dxf', methods=['POST'])
def generate_dxf():
    """Generate professional DXF drawing from specifications"""
    try:
        # Get JSON data from request
        drawing_request = request.get_json()
        
        if not drawing_request:
            return jsonify({
                'success': False,
                'error': 'No drawing request provided',
                'message': 'Please provide drawing specifications in JSON format'
            }), 400
        
        # Generate DXF drawing
        result = generate_construction_drawing(drawing_request)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Internal server error during DXF generation'
        }), 500

@app.route('/download-dxf', methods=['POST'])
def download_dxf():
    """Download DXF file directly"""
    try:
        # Get JSON data from request
        drawing_request = request.get_json()
        
        if not drawing_request:
            return jsonify({
                'success': False,
                'error': 'No drawing request provided'
            }), 400
        
        # Generate DXF drawing
        generator = ProfessionalDXFGenerator()
        
        title = drawing_request.get('title', 'Construction Drawing')
        description = drawing_request.get('description', 'Professional construction drawing')
        elements = drawing_request.get('elements', [])
        
        # Create drawing
        generator.create_new_drawing(title, description)
        
        # Add elements
        for element in elements:
            element_type = element.get('type')
            specifications = element.get('specifications', {})
            generator.add_structural_element(element_type, specifications)
        
        # Save to temporary file
        filename = f"{title.replace(' ', '_')}.dxf"
        filepath = generator.save_dxf(filename)
        
        # Send file
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/dxf'
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to generate DXF file for download'
        }), 500

@app.route('/generate-dxf-endpoint', methods=['POST'])
def generate_dxf_endpoint():
    """AI-powered DXF generation endpoint with comprehensive debugging"""
    try:
        # 1. Get request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No request data provided'
            }), 400

        # 2. Extract parameters
        title = data.get('title', 'AI Generated Drawing')
        description = data.get('description', '')
        user_requirements = data.get('user_requirements', '')

        if not description and not user_requirements:
            return jsonify({
                'success': False,
                'error': 'No description or requirements provided'
            }), 400

        # 3. Check if AI model is available
        if not model:
            return jsonify({
                'success': False,
                'error': 'Gemini AI model not configured. Please set GEMINI_API_KEY environment variable.'
            }), 500

        # 4. Create enhanced AI prompt with comprehensive ezdxf knowledge
        combined_description = f"{description}\n{user_requirements}".strip()
        prompt = f"""
You are a professional CAD engineer with expertise in Python ezdxf library. Convert this construction drawing description into a complete, professional DXF drawing using proper ezdxf standards.

DESCRIPTION: {combined_description}

EZDXF PROFESSIONAL STANDARDS:

🏗️ MANDATORY CONSTRUCTION LAYERS:
- "0-STRUCTURAL-FOUNDATION": {{"color": 1, "lineweight": 50}}
- "0-STRUCTURAL-COLUMNS": {{"color": 2, "lineweight": 35}}
- "0-STRUCTURAL-BEAMS": {{"color": 3, "lineweight": 35}}
- "1-REINFORCEMENT-MAIN": {{"color": 1, "lineweight": 25}}
- "2-DIMENSIONS-LINEAR": {{"color": 256, "lineweight": 18}}
- "3-TEXT-ANNOTATIONS": {{"color": 256, "lineweight": 18}}
- "4-GRID-LINES": {{"color": 8, "lineweight": 13}}

📐 STRUCTURAL ELEMENT STANDARDS:
- Columns: Use LWPOLYLINE with "0-STRUCTURAL-COLUMNS" layer
- Beams: Use LWPOLYLINE with "0-STRUCTURAL-BEAMS" layer
- Foundations: Use LWPOLYLINE with "0-STRUCTURAL-FOUNDATION" layer
- Reinforcement: Use LINE entities with "1-REINFORCEMENT-MAIN" layer
- Dimensions: Use proper dimension entities with "2-DIMENSIONS-LINEAR" layer
- Text: Use TEXT entities with "3-TEXT-ANNOTATIONS" layer
- Grid: Use CENTER linetype with "4-GRID-LINES" layer

🎯 CONSTRUCTION STANDARDS:
- All dimensions in millimeters (mm)
- Standard concrete cover: 25-50mm
- Rebar spacing: 100-200mm typical
- Grid spacing: 3000-9000mm typical
- Text heights: Title=5mm, Standard=2.5mm, Notes=1.8mm

Return ONLY a JSON object with this exact structure:
{{
  "setup": {{
    "layers": [
      {{"name": "0-STRUCTURAL-COLUMNS", "color": 2, "lineweight": 35}},
      {{"name": "1-REINFORCEMENT-MAIN", "color": 1, "lineweight": 25}},
      {{"name": "2-DIMENSIONS-LINEAR", "color": 256, "lineweight": 18}},
      {{"name": "3-TEXT-ANNOTATIONS", "color": 256, "lineweight": 18}}
    ],
    "text_styles": [
      {{"name": "TITLE", "height": 5.0}},
      {{"name": "STANDARD", "height": 2.5}},
      {{"name": "NOTES", "height": 1.8}}
    ]
  }},
  "entities": [
    {{
      "type": "LWPOLYLINE",
      "points": [[x1, y1], [x2, y2], [x3, y3], [x1, y1]],
      "layer": "0-STRUCTURAL-COLUMNS",
      "closed": true
    }},
    {{
      "type": "LINE",
      "start_point": [x1, y1],
      "end_point": [x2, y2],
      "layer": "1-REINFORCEMENT-MAIN"
    }},
    {{
      "type": "CIRCLE",
      "center": [x, y],
      "radius": number,
      "layer": "0-STRUCTURAL-COLUMNS"
    }},
    {{
      "type": "TEXT",
      "content": "text here",
      "position": [x, y],
      "height": 2.5,
      "layer": "3-TEXT-ANNOTATIONS",
      "style": "STANDARD"
    }},
    {{
      "type": "DIMENSION",
      "dim_type": "LINEAR",
      "base": [x, y],
      "p1": [x1, y1],
      "p2": [x2, y2],
      "layer": "2-DIMENSIONS-LINEAR"
    }}
  ]
}}

REQUIREMENTS:
- Include proper layer setup with construction-standard naming
- Use LWPOLYLINE for structural outlines (better than individual lines)
- All coordinates in millimeters
- All entities MUST have proper layer assignment
- Include dimensions for all major elements
- Add text annotations for identification
- Create complete, professional construction drawing
- Return valid JSON only, no explanations
"""

        # 5. Call the AI model and parse its response
        ai_response = model.generate_content(prompt)

        # 📌 CHECKPOINT 1: Log the raw response from the AI
        print("--- RAW AI RESPONSE ---")
        print(ai_response.text)
        print("-----------------------")

        cleaned_response_text = ai_response.text.strip().replace('```json', '').replace('```', '')

        # 📌 CHECKPOINT 2: Log the cleaned text before parsing
        print("--- CLEANED TEXT FOR JSON PARSING ---")
        print(cleaned_response_text)
        print("-----------------------------------")

        geometry_data = json.loads(cleaned_response_text)

        # 📌 CHECKPOINT 3: Log the final Python dictionary
        print("--- PARSED GEOMETRY DATA ---")
        print(geometry_data)
        print("----------------------------")

        # 6. Generate the DXF file with professional setup and enhanced entity handling
        doc = new("R2010", setup=True)
        doc.units = units.MM
        msp = doc.modelspace()

        # Setup professional layers if provided
        setup_info = geometry_data.get('setup', {})
        layers_info = setup_info.get('layers', [])
        
        # Create layers with professional properties
        for layer_info in layers_info:
            layer_name = layer_info.get('name')
            if layer_name and layer_name not in doc.layers:
                layer = doc.layers.add(layer_name)
                layer.color = layer_info.get('color', 256)
                if 'lineweight' in layer_info:
                    layer.lineweight = layer_info['lineweight']

        # Setup text styles if provided
        text_styles = setup_info.get('text_styles', [])
        for style_info in text_styles:
            style_name = style_info.get('name')
            if style_name and style_name not in doc.styles:
                style = doc.styles.add(style_name)
                style.dxf.height = style_info.get('height', 2.5)

        # Setup dimension style
        if 'STRUCTURAL' not in doc.dimstyles:
            dimstyle = doc.dimstyles.add('STRUCTURAL')
            dimstyle.dxf.dimtxt = 2.5
            dimstyle.dxf.dimasz = 2.5
            dimstyle.dxf.dimexe = 1.25
            dimstyle.dxf.dimexo = 0.625
            dimstyle.dxf.dimgap = 0.625
            dimstyle.dxf.dimtad = 1

        entities = geometry_data.get('entities', [])
        if not entities:
            print("🔴 WARNING: AI response contained no entities.")

        for entity in entities:
            entity_type = entity.get('type')
            layer = entity.get('layer', '0')
            print(f"➡️ Processing entity: {entity_type} on layer: {layer}")

            try:
                if entity_type == 'LINE':
                    start = entity.get('start_point')
                    end = entity.get('end_point')
                    if start and end:
                        msp.add_line(start, end, dxfattribs={'layer': layer})
                    else:
                        print(f"🔴 WARNING: Skipping malformed LINE: {entity}")

                elif entity_type == 'LWPOLYLINE':
                    points = entity.get('points')
                    closed = entity.get('closed', False)
                    if points and len(points) >= 2:
                        msp.add_lwpolyline(points, dxfattribs={'layer': layer, 'closed': closed})
                    else:
                        print(f"🔴 WARNING: Skipping malformed LWPOLYLINE: {entity}")

                elif entity_type == 'CIRCLE':
                    center = entity.get('center')
                    radius = entity.get('radius')
                    if center and radius is not None:
                        msp.add_circle(center, radius=float(radius), dxfattribs={'layer': layer})
                    else:
                        print(f"🔴 WARNING: Skipping malformed CIRCLE: {entity}")

                elif entity_type == 'ARC':
                    center = entity.get('center')
                    radius = entity.get('radius')
                    start_angle = entity.get('start_angle')
                    end_angle = entity.get('end_angle')
                    if center and radius is not None and start_angle is not None and end_angle is not None:
                        msp.add_arc(center, radius=float(radius), start_angle=float(start_angle), 
                                   end_angle=float(end_angle), dxfattribs={'layer': layer})
                    else:
                        print(f"🔴 WARNING: Skipping malformed ARC: {entity}")

                elif entity_type == 'TEXT':
                    content = entity.get('content')
                    position = entity.get('position')
                    height = entity.get('height', 2.5)
                    style = entity.get('style', 'Standard')
                    if content and position:
                        text_entity = msp.add_text(
                            content, 
                            dxfattribs={'layer': layer, 'style': style, 'height': height}
                        )
                        text_entity.set_placement(position)
                    else:
                        print(f"🔴 WARNING: Skipping malformed TEXT: {entity}")

                elif entity_type == 'DIMENSION':
                    dim_type = entity.get('dim_type', 'LINEAR')
                    if dim_type == 'LINEAR':
                        base = entity.get('base')
                        p1 = entity.get('p1')
                        p2 = entity.get('p2')
                        if base and p1 and p2:
                            dim = msp.add_linear_dim(
                                base=base, p1=p1, p2=p2,
                                dimstyle='STRUCTURAL',
                                dxfattribs={'layer': layer}
                            )
                            dim.render()
                        else:
                            print(f"🔴 WARNING: Skipping malformed LINEAR DIMENSION: {entity}")
                    else:
                        print(f"🟡 WARNING: Unsupported dimension type '{dim_type}'. Skipping.")

                else:
                    print(f"🟡 WARNING: Unhandled entity type '{entity_type}'. Skipping.")

            except (TypeError, ValueError) as e:
                print(f"🔴 ERROR processing entity {entity}: {e}. Skipping.")

        # 7. Save DXF to memory buffer
        # ezdxf expects a text stream, not binary
        string_buffer = io.StringIO()
        doc.write(string_buffer)
        string_buffer.seek(0)

        # Convert to bytes for file transfer
        dxf_content = string_buffer.getvalue()
        bytes_buffer = io.BytesIO(dxf_content.encode('utf-8'))
        bytes_buffer.seek(0)

        # 8. Return file for download
        filename = f"{title.replace(' ', '_')}.dxf"
        return send_file(
            bytes_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.dxf'
        )

    except json.JSONDecodeError as e:
        print(f"🔴 JSON PARSING ERROR: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to parse AI response as JSON: {str(e)}',
            'message': 'AI returned invalid JSON format'
        }), 500
    except Exception as e:
        print(f"🔴 GENERAL ERROR: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'An error occurred during DXF generation'
        }), 500

@app.route('/parse-ai-drawing', methods=['POST'])
def parse_ai_drawing():
    """Parse AI-generated drawing description into DXF specifications"""
    try:
        data = request.get_json()
        ai_description = data.get('description', '')
        title = data.get('title', 'AI Generated Drawing')

        if not ai_description:
            return jsonify({
                'success': False,
                'error': 'No AI description provided'
            }), 400

        # Parse AI description into structured drawing request
        drawing_request = parse_ai_description_to_dxf_specs(ai_description, title)

        # Generate DXF
        result = generate_construction_drawing(drawing_request)

        return jsonify(result), 200 if result['success'] else 500

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to parse AI drawing description'
        }), 500

@app.route('/test-hardcoded-dxf', methods=['POST'])
def test_hardcoded_dxf():
    """Test endpoint with hardcoded DXF generation to isolate ezdxf issues"""
    try:
        print("--- RUNNING HARDCODED DXF TEST ---")
        # ✅ Create a simple, guaranteed-to-work dictionary
        hardcoded_geometry = {
          "entities": [
            { "type": "LINE", "start_point": [0, 0], "end_point": [50, 25] },
            { "type": "CIRCLE", "center": [25, 12.5], "radius": 10 }
          ]
        }

        doc = new()
        msp = doc.modelspace()

        for entity in hardcoded_geometry['entities']:
            if entity['type'] == 'LINE':
                msp.add_line(entity['start_point'], entity['end_point'])
            elif entity['type'] == 'CIRCLE':
                msp.add_circle(entity['center'], radius=entity['radius'])

        # Use StringIO for ezdxf, then convert to bytes
        string_buffer = io.StringIO()
        doc.write(string_buffer)
        string_buffer.seek(0)

        # Convert to bytes for file transfer
        dxf_content = string_buffer.getvalue()
        bytes_buffer = io.BytesIO(dxf_content.encode('utf-8'))
        bytes_buffer.seek(0)

        print("SUCCESS: Hardcoded DXF generated successfully. Sending file.")
        return send_file(
            bytes_buffer,
            as_attachment=True,
            download_name='hardcoded_test.dxf',
            mimetype='application/vnd.dxf'
        )
    except Exception as e:
        print(f"🔴 ERROR during hardcoded test: {e}")
        return jsonify({"error": f"An error occurred during the hardcoded test: {str(e)}"}), 500

def parse_ai_description_to_dxf_specs(description: str, title: str) -> dict:
    """Parse AI-generated description into DXF drawing specifications"""
    # This is a simplified parser - in production, you'd use more sophisticated NLP
    drawing_request = {
        'title': title,
        'description': description,
        'elements': []
    }
    
    # Simple keyword-based parsing
    description_lower = description.lower()
    
    # Detect concrete beam
    if 'concrete beam' in description_lower or 'beam' in description_lower:
        # Extract dimensions if mentioned
        length = 6000  # default
        width = 300    # default
        height = 600   # default
        
        # Simple regex patterns for dimensions (this could be much more sophisticated)
        import re
        
        # Look for length patterns like "6m", "6000mm", "6.0 meters"
        length_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:m|meter|metre)(?:s)?\s*(?:long|length)', description_lower)
        if length_match:
            length = float(length_match.group(1)) * 1000  # convert to mm
        
        width_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:mm|cm|m)\s*(?:wide|width)', description_lower)
        if width_match:
            width_val = float(width_match.group(1))
            if 'cm' in description_lower:
                width = width_val * 10
            elif 'm' in description_lower and 'mm' not in description_lower:
                width = width_val * 1000
            else:
                width = width_val
        
        drawing_request['elements'].append({
            'type': 'concrete_beam',
            'specifications': {
                'length': int(length),
                'width': int(width),
                'height': int(height),
                'reinforcement': '4-T20 + 2-T16'  # default
            }
        })
    
    # Detect steel column
    if 'steel column' in description_lower or 'column' in description_lower:
        drawing_request['elements'].append({
            'type': 'steel_column',
            'specifications': {
                'height': 3000,  # mm
                'section': 'UC 305x305x97',
                'base_plate': True
            }
        })
    
    # Detect foundation
    if 'foundation' in description_lower or 'footing' in description_lower:
        drawing_request['elements'].append({
            'type': 'foundation',
            'specifications': {
                'length': 2000,  # mm
                'width': 2000,   # mm
                'depth': 1000,   # mm
                'reinforcement': 'T16@200 B/W'
            }
        })
    
    # If no specific elements detected, add a generic structural element
    if not drawing_request['elements']:
        drawing_request['elements'].append({
            'type': 'concrete_beam',  # default to beam
            'specifications': {
                'length': 6000,
                'width': 300,
                'height': 600,
                'reinforcement': '4-T20 + 2-T16'
            }
        })
    
    return drawing_request

if __name__ == '__main__':
    # Development server
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
