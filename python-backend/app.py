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
import math
from datetime import datetime
import google.generativeai as genai
import ezdxf
from ezdxf import units
from dxf_generator import generate_construction_drawing, ProfessionalDXFGenerator

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global debug data storage
last_debug_data = {}

# Configure Gemini API
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
else:
    print("⚠️ WARNING: GEMINI_API_KEY not found in environment variables")
    print("   AI-powered DXF generation will not work without API key")
    model = None

@app.route('/get-debug-info', methods=['GET'])
def get_debug_info():
    """Retrieve the last debug information from DXF generation"""
    try:
        global last_debug_data
        if last_debug_data:
            return jsonify({
                'success': True,
                'debug_data': last_debug_data
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'No debug data available. Generate a drawing first.'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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
🚨 CRITICAL REQUIREMENT: YOU MUST INCLUDE DIMENSION ENTITIES 🚨

Your JSON response MUST contain at least 5 entities with "type": "DIMENSION".
If you do not include DIMENSION entities, the response will be rejected.

Example DIMENSION entity (COPY THIS FORMAT):
{{
  "type": "DIMENSION",
  "dim_type": "LINEAR",
  "base": [3000, -1000],
  "p1": [1000, 0],
  "p2": [5000, 0],
  "layer": "2-DIMENSIONS-LINEAR"
}}

You are a professional CAD engineer with expertise in Python ezdxf library. Convert this construction drawing description into a complete, professional DXF drawing using proper ezdxf standards.

DESCRIPTION: {combined_description}

EZDXF DIMENSION MASTERY FOR PROFESSIONAL CONSTRUCTION DRAWINGS:

🏗️ CRITICAL DIMENSION SETUP (FIXES EXTENSION LINE ISSUES):

# MANDATORY: R2010+ with setup=True for proper dimension rendering
doc = ezdxf.new("R2010", setup=True)  # setup=True creates default dimension styles
doc.units = units.MM  # MANDATORY for construction
msp = doc.modelspace()

# COMPLETE DIMENSION STYLE CONFIGURATION (ENSURES EXTENSION LINES)
def setup_dimension_style_with_extension_lines(doc):
    if 'STRUCTURAL' in doc.dimstyles:
        del doc.dimstyles['STRUCTURAL']
    
    dimstyle = doc.dimstyles.add('STRUCTURAL')
    
    # EXTENSION LINE CONFIGURATION (CRITICAL FOR EXTENSION LINE VISIBILITY)
    dimstyle.dxf.dimexo = 0.625      # Extension line offset from origin points
    dimstyle.dxf.dimexe = 1.25       # Extension beyond dimension line
    dimstyle.dxf.dimse1 = 0          # Show first extension line (0=show, 1=hide)
    dimstyle.dxf.dimse2 = 0          # Show second extension line (0=show, 1=hide)
    dimstyle.dxf.dimdle = 0          # Dimension line extension beyond ext lines
    
    # TEXT POSITIONING (AFFECTS EXTENSION LINE VISIBILITY)
    dimstyle.dxf.dimtxt = 2.5        # Text height
    dimstyle.dxf.dimgap = 0.625      # Gap between text and dimension line
    dimstyle.dxf.dimtad = 1          # Text above line (CRITICAL for space)
    dimstyle.dxf.dimjust = 0         # Center text horizontally
    
    # ARROW CONFIGURATION
    dimstyle.dxf.dimasz = 2.5        # Arrow size
    dimstyle.dxf.dimblk = "ARCHTICK" # Professional arrow type
    
    # SCALE AND MEASUREMENT
    dimstyle.dxf.dimscale = 1.0      # Overall scale factor
    dimstyle.dxf.dimlfac = 1.0       # Linear factor (actual measurement)
    dimstyle.dxf.dimdec = 0          # No decimal places for whole numbers
    dimstyle.dxf.dimzin = 8          # Suppress trailing zeros
    dimstyle.dxf.dimlunit = 2        # Decimal units
    
    return dimstyle

# PROPER LINEAR DIMENSION CREATION WITH EXTENSION LINES
def create_dimension_with_extension_lines(msp, p1, p2, offset_distance=5000):
    # Calculate proper base point for dimension line
    base_y = max(p1[1], p2[1]) + offset_distance
    base_x = (p1[0] + p2[0]) / 2
    base_point = [base_x, base_y]
    
    # Create dimension entity
    dim = msp.add_linear_dim(
        base=base_point,           # Dimension line location
        p1=p1,                    # First extension line starts here
        p2=p2,                    # Second extension line starts here
        dimstyle="STRUCTURAL",     # Use configured style
        dxfattribs={{'layer': '2-DIMENSIONS-LINEAR'}}
    )
    
    # CRITICAL: render() creates the actual geometric representation with extension lines
    dim.render()
    
    return dim

🎯 MANDATORY DIMENSION REQUIREMENTS FOR ALL DRAWINGS:
- MINIMUM 3-5 dimension entities per drawing
- Each dimension MUST have offset_distance >= 3000mm from elements
- ALL dimensions MUST call .render() after creation
- Extension lines MUST be visible (dimse1=0, dimse2=0)
- Use "2-DIMENSIONS-LINEAR" layer for all linear dimensions
- Text MUST be above dimension line (dimtad=1)

📐 STRUCTURAL ELEMENTS WITH PROPER DIMENSIONS:

# Column with dimensions
def column_with_dimensions(center, width, height):
    x, y = center
    hw, hh = width/2, height/2
    points = [(x-hw,y-hh), (x+hw,y-hh), (x+hw,y+hh), (x-hw,y+hh), (x-hw,y-hh)]
    column = msp.add_lwpolyline(points, dxfattribs={{"layer": "0-STRUCTURAL-COLUMNS", "closed": True}})
    
    # MANDATORY: Add width dimension with extension lines
    create_dimension_with_extension_lines(msp, [x-hw, y-hh-1000], [x+hw, y-hh-1000], 2000)
    # MANDATORY: Add height dimension with extension lines  
    create_dimension_with_extension_lines(msp, [x+hw+1000, y-hh], [x+hw+1000, y+hh], 2000)
    
    return column

# Beam with dimensions
def beam_with_dimensions(start, end, width):
    dx, dy = end[0]-start[0], end[1]-start[1]
    angle = math.atan2(dy, dx)
    px, py = -math.sin(angle)*width/2, math.cos(angle)*width/2
    points = [(start[0]+px,start[1]+py), (end[0]+px,end[1]+py), (end[0]-px,end[1]-py), (start[0]-px,start[1]-py)]
    beam = msp.add_lwpolyline(points, dxfattribs={{"layer": "0-STRUCTURAL-BEAMS", "closed": True}})
    
    # MANDATORY: Add length dimension with extension lines
    create_dimension_with_extension_lines(msp, start, end, 3000)
    
    return beam

🏗️ MANDATORY CONSTRUCTION LAYERS:
- "0-STRUCTURAL-FOUNDATION": {{"color": 1, "lineweight": 50}}
- "0-STRUCTURAL-COLUMNS": {{"color": 2, "lineweight": 35}}
- "0-STRUCTURAL-BEAMS": {{"color": 3, "lineweight": 35}}
- "1-REINFORCEMENT-MAIN": {{"color": 1, "lineweight": 25}}
- "2-DIMENSIONS-LINEAR": {{"color": 256, "lineweight": 18}}
- "3-TEXT-ANNOTATIONS": {{"color": 256, "lineweight": 18}}
- "4-GRID-LINES": {{"color": 8, "lineweight": 13}}
- "6-HATCH-CONCRETE": {{"color": 8, "lineweight": 9}}

📐 STRUCTURAL ELEMENT STANDARDS:
- Columns: Use LWPOLYLINE with "0-STRUCTURAL-COLUMNS" layer
- Beams: Use LWPOLYLINE with "0-STRUCTURAL-BEAMS" layer
- Foundations: Use LWPOLYLINE with "0-STRUCTURAL-FOUNDATION" layer
- Reinforcement: Use LINE entities with "1-REINFORCEMENT-MAIN" layer
- Dimensions: Use proper dimension entities with "2-DIMENSIONS-LINEAR" layer
- Text: Use TEXT entities with "3-TEXT-ANNOTATIONS" layer
- Grid: Use CENTER linetype with "4-GRID-LINES" layer
- Hatching: Use HATCH entities with "6-HATCH-CONCRETE" layer for concrete areas

⚠️ MANDATORY REQUIREMENTS (MUST INCLUDE):
- ALL major structural elements MUST have dimensions
- ALL concrete areas MUST have hatching patterns
- ALL elements MUST have text labels/annotations
- Minimum 3-5 dimensions per drawing
- Minimum 1-2 hatch patterns for concrete elements
- All dimensions must have proper offset (minimum 5000mm from elements)

🎯 CONSTRUCTION STANDARDS:
- All dimensions in millimeters (mm)
- Standard concrete cover: 25-50mm
- Rebar spacing: 100-200mm typical
- Grid spacing: 3000-9000mm typical
- Text heights: Title=5mm, Standard=2.5mm, Notes=1.8mm
- Dimension offset: 5000mm minimum from elements
- Hatch scale: 10-20 for concrete patterns

Return ONLY a JSON object with this exact structure:
{{
  "setup": {{
    "layers": [
      {{"name": "0-STRUCTURAL-COLUMNS", "color": 2, "lineweight": 35}},
      {{"name": "1-REINFORCEMENT-MAIN", "color": 1, "lineweight": 25}},
      {{"name": "2-DIMENSIONS-LINEAR", "color": 256, "lineweight": 18}},
      {{"name": "3-TEXT-ANNOTATIONS", "color": 256, "lineweight": 18}},
      {{"name": "6-HATCH-CONCRETE", "color": 8, "lineweight": 9}}
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
      "content": "BEAM B1 - 300x600",
      "position": [x, y],
      "height": 2.5,
      "layer": "3-TEXT-ANNOTATIONS",
      "style": "STANDARD"
    }},
    {{
      "type": "DIMENSION",
      "dim_type": "LINEAR",
      "base": [x, y_offset_5000],
      "p1": [x1, y1],
      "p2": [x2, y2],
      "layer": "2-DIMENSIONS-LINEAR"
    }},
    {{
      "type": "HATCH",
      "pattern": "ANSI31",
      "scale": 15.0,
      "angle": 45.0,
      "boundary_points": [[x1, y1], [x2, y2], [x3, y3], [x1, y1]],
      "layer": "6-HATCH-CONCRETE"
    }}
  ]
}}

CRITICAL REQUIREMENTS:
- MUST include at least 3 DIMENSION entities for major elements
- MUST include HATCH entities for all concrete structural elements
- MUST include TEXT labels for all major structural elements
- Use proper layer assignment for all entities
- All coordinates in millimeters
- Dimensions must be offset at least 5000mm from structural elements
- Hatching must use appropriate construction patterns (ANSI31 for concrete)
- Return valid JSON only, no explanations

🚨 DIMENSION ENTITY VERIFICATION: Your response MUST contain the word "DIMENSION" at least 3 times in "type" fields 🚨
"""

        # 5. Call the AI model and parse its response
        print("\n🤖 CALLING GEMINI AI MODEL...")
        print(f"Prompt length: {len(prompt)} characters")
        print("First 200 chars of prompt:")
        print(prompt[:200] + "...")
        
        ai_response = model.generate_content(prompt)

        # 📍 CHECKPOINT 1: Log the raw response from the AI
        print("\n" + "="*50)
        print("📍 RAW AI RESPONSE (FIRST)")
        print("="*50)
        print(ai_response.text)
        print("="*50)
        
        # Store for debugging
        raw_ai_response = ai_response.text

        cleaned_response_text = ai_response.text.strip().replace('```json', '').replace('```', '')

        # 📍 CHECKPOINT 2: Log the cleaned text before parsing
        print("\n" + "="*50)
        print("📍 CLEANED TEXT FOR JSON PARSING")
        print("="*50)
        print(cleaned_response_text)
        print("="*50)

        try:
            geometry_data = json.loads(cleaned_response_text)
        except json.JSONDecodeError as e:
            print(f"\n🔴 JSON PARSING FAILED: {e}")
            print("Attempting to fix common JSON issues...")
            
            # Try to fix common JSON issues
            fixed_text = cleaned_response_text
            # Add more JSON fixing logic here if needed
            
            try:
                geometry_data = json.loads(fixed_text)
                print("✅ JSON parsing succeeded after fixing")
            except json.JSONDecodeError as e2:
                print(f"🔴 JSON parsing failed even after fixing: {e2}")
                return jsonify({
                    'success': False,
                    'error': f'AI response is not valid JSON: {e}',
                    'raw_response': raw_ai_response,
                    'cleaned_response': cleaned_response_text
                }), 500

        # 📍 CHECKPOINT 3: Log the final Python dictionary
        print("\n" + "="*50)
        print("📍 PARSED GEOMETRY DATA")
        print("="*50)
        print(json.dumps(geometry_data, indent=2))
        print("="*50)
        
        # Collect debug information
        debug_data = {
            'request_data': {
                'title': title,
                'description': description,
                'user_requirements': user_requirements
            },
            'ai_response_raw': raw_ai_response,
            'ai_response_cleaned': cleaned_response_text,
            'parsed_data': geometry_data,
            'backend_logs': [],
            'processing_steps': []
        }

        # 6. Generate the DXF file with professional setup and enhanced entity handling
        doc = ezdxf.new("R2010", setup=True)
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
                # Note: lineweight may not be supported in all ezdxf versions
                try:
                    if 'lineweight' in layer_info:
                        layer.lineweight = layer_info['lineweight']
                except AttributeError:
                    print(f"⚠️ WARNING: Lineweight not supported for layer {layer_name}")

        # Setup text styles if provided
        text_styles = setup_info.get('text_styles', [])
        for style_info in text_styles:
            style_name = style_info.get('name')
            if style_name and style_name not in doc.styles:
                style = doc.styles.add(style_name)
                style.dxf.height = style_info.get('height', 2.5)

        # Setup dimension style with proper extension line configuration
        if 'STRUCTURAL' not in doc.dimstyles:
            print("🗏 Setting up STRUCTURAL dimension style with extension lines...")
            dimstyle = doc.dimstyles.add('STRUCTURAL')
            
            # EXTENSION LINE CONFIGURATION (CRITICAL FOR EXTENSION LINE VISIBILITY)
            dimstyle.dxf.dimexo = 0.625      # Extension line offset from origin points
            dimstyle.dxf.dimexe = 1.25       # Extension beyond dimension line (CRITICAL)
            dimstyle.dxf.dimse1 = 0          # Show first extension line (0=show, 1=hide)
            dimstyle.dxf.dimse2 = 0          # Show second extension line (0=show, 1=hide) 
            dimstyle.dxf.dimdle = 0          # Dimension line extension beyond ext lines
            
            # TEXT POSITIONING (AFFECTS EXTENSION LINE VISIBILITY)
            dimstyle.dxf.dimtxt = 2.5        # Text height
            dimstyle.dxf.dimgap = 0.625      # Gap between text and dimension line
            dimstyle.dxf.dimtad = 1          # Text above line (CRITICAL for space)
            dimstyle.dxf.dimjust = 0         # Center text horizontally
            
            # ARROW CONFIGURATION
            dimstyle.dxf.dimasz = 2.5        # Arrow size
            dimstyle.dxf.dimblk = "ARCHTICK" # Professional arrow type (or "" for solid arrow)
            
            # SCALE AND MEASUREMENT
            dimstyle.dxf.dimscale = 1.0      # Overall scale factor
            dimstyle.dxf.dimlfac = 1.0       # Linear factor (actual measurement)
            dimstyle.dxf.dimdec = 0          # No decimal places for whole numbers
            dimstyle.dxf.dimzin = 8          # Suppress trailing zeros
            dimstyle.dxf.dimlunit = 2        # Decimal units
            dimstyle.dxf.dimunit = 2         # Unit format (2 = decimal)
            
            # TOLERANCE AND LIMITS
            dimstyle.dxf.dimtol = 0          # No tolerance
            dimstyle.dxf.dimlim = 0          # No limits
            
            # COLOR CONFIGURATION
            dimstyle.dxf.dimclrd = 256       # Dimension line color (bylayer)
            dimstyle.dxf.dimclre = 256       # Extension line color (bylayer)
            dimstyle.dxf.dimclrt = 256       # Text color (bylayer)
            
            print("✅ STRUCTURAL dimension style configured for extension lines")
            print(f"  Extension line offset (dimexo): {dimstyle.dxf.dimexo}mm")
            print(f"  Extension line beyond (dimexe): {dimstyle.dxf.dimexe}mm")
            print(f"  Extension line 1 visible (dimse1=0): {dimstyle.dxf.dimse1 == 0}")
            print(f"  Extension line 2 visible (dimse2=0): {dimstyle.dxf.dimse2 == 0}")
            print(f"  Text height: {dimstyle.dxf.dimtxt}mm")
            print(f"  Arrow size: {dimstyle.dxf.dimasz}mm")
        else:
            print("🗏 STRUCTURAL dimension style already exists")
            # Verify existing style has proper extension line settings
            existing_style = doc.dimstyles.get('STRUCTURAL')
            print(f"  Existing extension settings: dimexo={existing_style.dxf.dimexo}, dimexe={existing_style.dxf.dimexe}")
            print(f"  Existing extension visibility: dimse1={existing_style.dxf.dimse1}, dimse2={existing_style.dxf.dimse2}")

        entities = geometry_data.get('entities', [])
        if not entities:
            print("🔴 WARNING: AI response contained no entities.")
            
        # Track entity processing for debugging
        entity_summary = {
            'total': len(entities),
            'processed': 0,
            'by_type': {},
            'dimensions_created': 0,
            'dimensions_details': [],
            'errors': 0,
            'error_details': []
        }
        
        debug_data['processing_steps'].append(f"Starting entity processing: {len(entities)} entities")

        for entity in entities:
            entity_type = entity.get('type')
            layer = entity.get('layer', '0')
            print(f"➡️ Processing entity: {entity_type} on layer: {layer}")
            
            # Track entity types
            entity_summary['by_type'][entity_type] = entity_summary['by_type'].get(entity_type, 0) + 1

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
                        
                        print(f"🗏 Processing LINEAR DIMENSION with extension lines:")
                        print(f"  Base point (dimension line): {base}")
                        print(f"  P1 (first extension line start): {p1}")
                        print(f"  P2 (second extension line start): {p2}")
                        print(f"  Layer: {layer}")
                        
                        debug_data['processing_steps'].append(f"Processing LINEAR DIMENSION: base={base}, p1={p1}, p2={p2}, layer={layer}")
                        
                        if base and p1 and p2:
                            # Validate dimension geometry for proper extension lines
                            distance = math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)
                            if distance < 100:  # Less than 100mm - too small for meaningful dimension
                                print(f"⚠️ WARNING: Dimension distance too small ({distance:.1f}mm) - skipping")
                                entity_summary['errors'] += 1
                                continue
                            
                            # Calculate proper offset for extension line visibility
                            offset_distance = abs(base[1] - max(p1[1], p2[1]))
                            if offset_distance < 1000:  # Less than 1000mm offset
                                print(f"⚠️ WARNING: Dimension offset too small ({offset_distance:.1f}mm) for clear extension lines")
                                # Adjust base point for better visibility
                                adjusted_base = [base[0], max(p1[1], p2[1]) + 3000]
                                print(f"  Adjusting base to: {adjusted_base} (3000mm offset)")
                                base = adjusted_base
                            
                            try:
                                # Create linear dimension with enhanced error handling
                                print(f"  Creating dimension: {distance:.0f}mm with {offset_distance:.0f}mm offset")
                                
                                dim = msp.add_linear_dim(
                                    base=base, p1=p1, p2=p2,
                                    dimstyle='STRUCTURAL',
                                    dxfattribs={'layer': layer}
                                )
                                
                                # CRITICAL: Always call render() to generate extension lines
                                dim.render()
                                
                                # Verify dimension was created with geometry
                                geom_block = dim.get_geometry_block()
                                if geom_block:
                                    block_entities = list(geom_block)
                                    print(f"✅ Dimension rendered successfully:")
                                    print(f"  Measurement: {distance:.0f}mm")
                                    print(f"  Geometry block: {dim.dxf.geometry}")
                                    print(f"  Block contains {len(block_entities)} entities (lines, text, arrows)")
                                    
                                    # Count extension lines in the block
                                    lines = [e for e in block_entities if e.dxftype() == 'LINE']
                                    print(f"  Lines in block (including extension lines): {len(lines)}")
                                    
                                    entity_summary['dimensions_created'] += 1
                                    
                                    # Store detailed dimension info for debugging
                                    dim_details = {
                                        'base': base,
                                        'p1': p1,
                                        'p2': p2,
                                        'measurement': f"{distance:.0f}mm",
                                        'geometry_block': dim.dxf.geometry,
                                        'block_entity_count': len(block_entities),
                                        'line_count': len(lines),
                                        'layer': layer
                                    }
                                    entity_summary['dimensions_details'].append(dim_details)
                                    debug_data['processing_steps'].append(f"Dimension SUCCESS: {distance:.0f}mm dimension created with {len(lines)} lines in geometry block")
                                else:
                                    print(f"⚠️ WARNING: Dimension created but no geometry block found")
                                    print(f"  This means extension lines may not be visible")
                                    entity_summary['errors'] += 1
                                
                            except Exception as dim_error:
                                print(f"🔴 ERROR creating LINEAR DIMENSION: {dim_error}")
                                print(f"  This may be due to invalid coordinates or dimstyle issues")
                                print(f"  Attempting fallback dimension creation...")
                                
                                # Fallback: try with default dimstyle
                                try:
                                    dim = msp.add_linear_dim(
                                        base=base, p1=p1, p2=p2,
                                        dxfattribs={'layer': layer}  # No dimstyle
                                    )
                                    dim.render()
                                    
                                    if dim.get_geometry_block():
                                        print(f"✅ Fallback dimension created successfully")
                                        entity_summary['dimensions_created'] += 1
                                    else:
                                        print(f"⚠️ Fallback dimension has no geometry")
                                        entity_summary['errors'] += 1
                                        
                                except Exception as fallback_error:
                                    print(f"🔴 Fallback dimension also failed: {fallback_error}")
                                    entity_summary['errors'] += 1
                        else:
                            print(f"🔴 WARNING: Skipping malformed LINEAR DIMENSION:")
                            print(f"  Missing required parameters: base={bool(base)}, p1={bool(p1)}, p2={bool(p2)}")
                            if base and p1 and p2:
                                print(f"  Base: {base}, P1: {p1}, P2: {p2}")
                            print(f"  Entity data: {entity}")
                            entity_summary['errors'] += 1
                    else:
                        print(f"🟡 WARNING: Unsupported dimension type '{dim_type}'. Only LINEAR dimensions supported.")
                        entity_summary['errors'] += 1

                elif entity_type == 'HATCH':
                    pattern = entity.get('pattern', 'ANSI31')
                    scale = entity.get('scale', 15.0)
                    angle = entity.get('angle', 45.0)
                    boundary_points = entity.get('boundary_points')
                    
                    if boundary_points and len(boundary_points) >= 3:
                        try:
                            # Create hatch entity
                            hatch = msp.add_hatch(dxfattribs={'layer': layer})
                            
                            # Set pattern properties (simplified for compatibility)
                            hatch.set_pattern_definition(pattern)
                            
                            # Add boundary path
                            edge_path = hatch.paths.add_edge_path()
                            # Add points to edge path as lines
                            for i in range(len(boundary_points)):
                                start_pt = boundary_points[i]
                                end_pt = boundary_points[(i + 1) % len(boundary_points)]  # Wrap to first point
                                edge_path.add_line(start_pt, end_pt)
                            
                            print(f"✅ Successfully created HATCH with pattern {pattern}")
                        except Exception as hatch_error:
                            print(f"🔴 ERROR creating HATCH: {hatch_error}. Skipping.")
                    else:
                        print(f"🔴 WARNING: Skipping malformed HATCH (insufficient boundary points): {entity}")

                else:
                    print(f"🟡 WARNING: Unhandled entity type '{entity_type}'. Skipping.")
                    entity_summary['errors'] += 1
                    
                entity_summary['processed'] += 1

            except (TypeError, ValueError) as e:
                print(f"🔴 ERROR processing entity {entity}: {e}. Skipping.")
                entity_summary['errors'] += 1
        
        # Print comprehensive summary
        print("\n" + "="*50)
        print("🗊 ENTITY PROCESSING SUMMARY")
        print("="*50)
        print(f"Total entities: {entity_summary['total']}")
        print(f"Successfully processed: {entity_summary['processed']}")
        print(f"Errors encountered: {entity_summary['errors']}")
        print(f"Dimensions created: {entity_summary['dimensions_created']}")
        print("\nBy entity type:")
        for entity_type, count in entity_summary['by_type'].items():
            print(f"  {entity_type}: {count}")
        
        if entity_summary['dimensions_created'] == 0:
            print("\n⚠️  WARNING: NO DIMENSIONS WERE CREATED!")
            print("   This may be due to:")
            print("   1. AI not generating DIMENSION entities")
            print("   2. Malformed dimension data")
            print("   3. Dimension style configuration issues")
        else:
            print(f"\n✅ Success: {entity_summary['dimensions_created']} dimensions created successfully")
        print("="*50 + "\n")

        # Store debug information globally for retrieval
        global last_debug_data
        last_debug_data = {
            'timestamp': datetime.now().isoformat(),
            'request_data': debug_data['request_data'],
            'ai_response_raw': raw_ai_response,
            'ai_response_cleaned': cleaned_response_text,
            'parsed_data': geometry_data,
            'backend_logs': entity_summary,
            'processing_steps': debug_data['processing_steps']
        }
        
        # Print final debug summary
        print("\n" + "="*60)
        print("📍 FINAL DEBUG SUMMARY")
        print("="*60)
        print(f"Total entities processed: {entity_summary['processed']}/{entity_summary['total']}")
        print(f"Dimensions created: {entity_summary['dimensions_created']}")
        print(f"Dimension details: {entity_summary['dimensions_details']}")
        print(f"Errors encountered: {entity_summary['errors']}")
        print(f"Entity types: {entity_summary['by_type']}")
        print("="*60)
        
        # 8. Save DXF to memory buffer
        # ezdxf expects a text stream, not binary
        string_buffer = io.StringIO()
        doc.write(string_buffer)
        string_buffer.seek(0)

        # Convert to bytes for file transfer
        dxf_content = string_buffer.getvalue()
        bytes_buffer = io.BytesIO(dxf_content.encode('utf-8'))
        bytes_buffer.seek(0)

        # 9. Return file for download with debug headers
        filename = f"{title.replace(' ', '_')}.dxf"
        
        response = send_file(
            bytes_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.dxf'
        )
        
        # Add comprehensive debug information to response headers
        try:
            # Summary debug info (smaller for header limits)
            debug_summary = {
                'dimensions_created': entity_summary['dimensions_created'],
                'total_entities': entity_summary['total'],
                'entity_types': entity_summary['by_type'],
                'errors': entity_summary['errors']
            }
            
            # Detailed debug info (truncated for header size limits)
            debug_details = {
                'ai_response_raw': raw_ai_response[:500] + '...' if len(raw_ai_response) > 500 else raw_ai_response,
                'ai_response_cleaned': cleaned_response_text[:500] + '...' if len(cleaned_response_text) > 500 else cleaned_response_text,
                'parsed_data': {
                    'entity_count': len(geometry_data.get('entities', [])),
                    'has_dimensions': len([e for e in geometry_data.get('entities', []) if e.get('type') == 'DIMENSION']),
                    'entity_types': list(set([e.get('type') for e in geometry_data.get('entities', [])]))
                }
            }
            
            # Add headers with size limits
            response.headers['X-Debug-Summary'] = json.dumps(debug_summary)[:1000]
            response.headers['X-Debug-Details'] = json.dumps(debug_details)[:2000]
            
            # CORS headers for debug data
            response.headers['Access-Control-Expose-Headers'] = 'X-Debug-Summary, X-Debug-Details'
            
            print(f"✅ Debug headers added to response:")
            print(f"  Summary size: {len(json.dumps(debug_summary))} chars")
            print(f"  Details size: {len(json.dumps(debug_details))} chars")
            
        except Exception as header_error:
            print(f"⚠️ Warning: Could not add debug headers: {header_error}")
        
        return response

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

        doc = ezdxf.new()
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
