#!/usr/bin/env python3
"""
Google Cloud Functions entry point for Professional DXF Drawing Generator
Replaces Flask app.py for serverless deployment
"""

import functions_framework
from flask import request, jsonify, send_file
import json
import os
import io
import google.generativeai as genai
from ezdxf import new
from dxf_generator import generate_construction_drawing, ProfessionalDXFGenerator

# Configure Gemini API
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
else:
    print("WARNING: GEMINI_API_KEY not found in environment variables")
    model = None

def add_cors_headers(response):
    """Add CORS headers to response"""
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    if hasattr(response, 'headers'):
        response.headers.update(headers)
    return response

@functions_framework.http
def health_check(request):
    """Health check endpoint"""
    # Set CORS headers for all requests
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    if request.path == '/health' and request.method == 'GET':
        response = jsonify({
            'status': 'healthy',
            'service': 'Professional DXF Drawing Generator (Cloud Functions)',
            'version': '1.0.0',
            'gemini_available': model is not None
        })
        response.headers.update(headers)
        return response
    
    # Route to appropriate handler with CORS
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    if request.path == '/generate-dxf-endpoint' and request.method == 'POST':
        response = generate_dxf_endpoint(request)
        if hasattr(response, 'headers'):
            response.headers.update(headers)
        return response
    elif request.path == '/test-hardcoded-dxf' and request.method == 'POST':
        response = test_hardcoded_dxf(request)
        if hasattr(response, 'headers'):
            response.headers.update(headers)
        return response
    elif request.path == '/parse-ai-drawing' and request.method == 'POST':
        response = parse_ai_drawing(request)
        if hasattr(response, 'headers'):
            response.headers.update(headers)
        return response
    elif request.path == '/generate-dxf' and request.method == 'POST':
        response = generate_dxf(request)
        if hasattr(response, 'headers'):
            response.headers.update(headers)
        return response
    elif request.path == '/download-dxf' and request.method == 'POST':
        response = download_dxf(request)
        if hasattr(response, 'headers'):
            response.headers.update(headers)
        return response
    else:
        error_response = jsonify({'error': 'Endpoint not found'})
        error_response.headers.update(headers)
        return error_response, 404

def generate_dxf_endpoint(request):
    """AI-powered DXF generation endpoint with comprehensive debugging"""
    try:
        # 1. Get request data
        data = request.get_json()
        if not data:
            error_response = jsonify({
                'success': False,
                'error': 'No request data provided'
            })
            return add_cors_headers(error_response), 400
        
        # 2. Extract parameters
        title = data.get('title', 'AI Generated Drawing')
        description = data.get('description', '')
        user_requirements = data.get('user_requirements', '')
        
        if not description and not user_requirements:
            error_response = jsonify({
                'success': False,
                'error': 'No description or requirements provided'
            })
            return add_cors_headers(error_response), 400
        
        # 3. Check if AI model is available
        if not model:
            error_response = jsonify({
                'success': False,
                'error': 'Gemini AI model not configured. Please set GEMINI_API_KEY environment variable.'
            })
            return add_cors_headers(error_response), 500
        
        # 4. Create AI prompt for geometry generation
        combined_description = f"{description}\n{user_requirements}".strip()
        prompt = f"""
You are a professional CAD engineer. Convert this construction drawing description into precise DXF geometry data.

DESCRIPTION: {combined_description}

Return ONLY a JSON object with this exact structure:
{{
  "entities": [
    {{
      "type": "LINE",
      "start_point": [x1, y1],
      "end_point": [x2, y2]
    }},
    {{
      "type": "CIRCLE", 
      "center": [x, y],
      "radius": number
    }},
    {{
      "type": "ARC",
      "center": [x, y], 
      "radius": number,
      "start_angle": degrees,
      "end_angle": degrees
    }}
  ]
}}

REQUIREMENTS:
- Use only LINE, CIRCLE, ARC entities
- All coordinates in millimeters
- All angles in degrees
- Return valid JSON only, no explanations
- Create a professional technical drawing layout
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

        # 6. Generate the DXF file in memory with robust error handling
        doc = new()
        msp = doc.modelspace()

        entities = geometry_data.get('entities', [])
        if not entities:
            print("WARNING: AI response contained no entities.")

        for entity in entities:
            entity_type = entity.get('type')
            print(f"Processing entity: {entity_type}")

            try:
                if entity_type == 'LINE':
                    start = entity.get('start_point')
                    end = entity.get('end_point')
                    if start and end:
                        msp.add_line(start, end)
                    else:
                        print(f"WARNING: Skipping malformed LINE: {entity}")

                elif entity_type == 'CIRCLE':
                    center = entity.get('center')
                    radius = entity.get('radius')
                    if center and radius is not None:
                        msp.add_circle(center, radius=float(radius))
                    else:
                        print(f"WARNING: Skipping malformed CIRCLE: {entity}")
                
                elif entity_type == 'ARC':
                    center = entity.get('center')
                    radius = entity.get('radius')
                    start_angle = entity.get('start_angle')
                    end_angle = entity.get('end_angle')
                    if center and radius is not None and start_angle is not None and end_angle is not None:
                        msp.add_arc(center, radius=float(radius), start_angle=float(start_angle), end_angle=float(end_angle))
                    else:
                        print(f"WARNING: Skipping malformed ARC: {entity}")

                else:
                    print(f"WARNING: Unhandled entity type '{entity_type}'. Skipping.")

            except (TypeError, ValueError) as e:
                print(f"ERROR processing entity {entity}: {e}. Skipping.")

        # 7. Save DXF to memory buffer
        string_buffer = io.StringIO()
        doc.write(string_buffer)
        string_buffer.seek(0)
        
        # Convert to bytes for file transfer
        dxf_content = string_buffer.getvalue()
        bytes_buffer = io.BytesIO(dxf_content.encode('utf-8'))
        bytes_buffer.seek(0)

        # 8. Return file for download
        filename = f"{title.replace(' ', '_')}.dxf"
        response = send_file(
            bytes_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.dxf'
        )
        return add_cors_headers(response)

    except json.JSONDecodeError as e:
        print(f"JSON PARSING ERROR: {e}")
        error_response = jsonify({
            'success': False,
            'error': f'Failed to parse AI response as JSON: {str(e)}',
            'message': 'AI returned invalid JSON format'
        })
        return add_cors_headers(error_response), 500
    except Exception as e:
        print(f"GENERAL ERROR: {e}")
        error_response = jsonify({
            'success': False,
            'error': str(e),
            'message': 'An error occurred during DXF generation'
        })
        return add_cors_headers(error_response), 500

def test_hardcoded_dxf(request):
    """Test endpoint with hardcoded DXF generation to isolate ezdxf issues"""
    try:
        print("--- RUNNING HARDCODED DXF TEST ---")
        # Create a simple, guaranteed-to-work dictionary
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
        response = send_file(
            bytes_buffer,
            as_attachment=True,
            download_name='hardcoded_test.dxf',
            mimetype='application/vnd.dxf'
        )
        return add_cors_headers(response)
    except Exception as e:
        print(f"ERROR during hardcoded test: {e}")
        error_response = jsonify({"error": f"An error occurred during the hardcoded test: {str(e)}"})
        return add_cors_headers(error_response), 500

def parse_ai_drawing(request):
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

def generate_dxf(request):
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

def download_dxf(request):
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
        
        # Get DXF content as string
        string_buffer = io.StringIO()
        generator.doc.write(string_buffer)
        string_buffer.seek(0)
        
        # Convert to bytes for file transfer
        dxf_content = string_buffer.getvalue()
        bytes_buffer = io.BytesIO(dxf_content.encode('utf-8'))
        bytes_buffer.seek(0)
        
        # Send file
        filename = f"{title.replace(' ', '_')}.dxf"
        return send_file(
            bytes_buffer,
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
        drawing_request['elements'].append({
            'type': 'concrete_beam',
            'specifications': {
                'length': 6000,
                'width': 300,
                'height': 600,
                'reinforcement': '4-T20 + 2-T16'
            }
        })
    
    # Detect steel column
    if 'steel column' in description_lower or 'column' in description_lower:
        drawing_request['elements'].append({
            'type': 'steel_column',
            'specifications': {
                'height': 3000,
                'section': 'UC 305x305x97',
                'base_plate': True
            }
        })
    
    # Detect foundation
    if 'foundation' in description_lower or 'footing' in description_lower:
        drawing_request['elements'].append({
            'type': 'foundation',
            'specifications': {
                'length': 2000,
                'width': 2000,
                'depth': 1000,
                'reinforcement': 'T16@200 B/W'
            }
        })
    
    # If no specific elements detected, add a generic structural element
    if not drawing_request['elements']:
        drawing_request['elements'].append({
            'type': 'concrete_beam',
            'specifications': {
                'length': 6000,
                'width': 300,
                'height': 600,
                'reinforcement': '4-T20 + 2-T16'
            }
        })
    
    return drawing_request
