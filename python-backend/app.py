#!/usr/bin/env python3
"""
Flask API server for Professional DXF Drawing Generation
Serves the ezdxf-based drawing generation service
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
import tempfile
import base64
from dxf_generator import generate_construction_drawing, ProfessionalDXFGenerator

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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
