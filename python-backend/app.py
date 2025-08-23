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
import ezdxf
from ezdxf import units
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

        # Setup dimension style
        if 'STRUCTURAL' not in doc.dimstyles:
            print("🗏 Setting up STRUCTURAL dimension style...")
            dimstyle = doc.dimstyles.add('STRUCTURAL')
            
            # Text properties
            dimstyle.dxf.dimtxt = 2.5        # Text height
            dimstyle.dxf.dimasz = 2.5        # Arrow size
            dimstyle.dxf.dimexe = 1.25       # Extension line extension
            dimstyle.dxf.dimexo = 0.625      # Extension line offset
            dimstyle.dxf.dimgap = 0.625      # Text gap
            dimstyle.dxf.dimtad = 1          # Text above line
            
            # Additional dimension properties for better rendering
            dimstyle.dxf.dimdec = 0          # No decimals for whole numbers
            dimstyle.dxf.dimunit = 2         # Decimal units
            dimstyle.dxf.dimdsep = '.'       # Decimal separator
            dimstyle.dxf.dimtxsty = 'STANDARD'  # Text style
            dimstyle.dxf.dimlunit = 2        # Linear units format
            
            # Extension line properties
            dimstyle.dxf.dimse1 = 0          # First extension line on
            dimstyle.dxf.dimse2 = 0          # Second extension line on
            dimstyle.dxf.dimdle = 0          # Dimension line extension
            
            # Scale factor
            dimstyle.dxf.dimscale = 1.0      # Overall scale factor
            
            print("✅ STRUCTURAL dimension style configured successfully")
            print(f"  Text height: {dimstyle.dxf.dimtxt}mm")
            print(f"  Arrow size: {dimstyle.dxf.dimasz}mm")
            print(f"  Extension offset: {dimstyle.dxf.dimexo}mm")
        else:
            print("🗏 STRUCTURAL dimension style already exists")

        entities = geometry_data.get('entities', [])
        if not entities:
            print("🔴 WARNING: AI response contained no entities.")
            
        # Track entity processing for debugging
        entity_summary = {
            'total': len(entities),
            'processed': 0,
            'by_type': {},
            'dimensions_created': 0,
            'errors': 0
        }

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
                        
                        print(f"🗏 Processing LINEAR DIMENSION:")
                        print(f"  Base: {base}")
                        print(f"  P1: {p1}")
                        print(f"  P2: {p2}")
                        print(f"  Layer: {layer}")
                        
                        if base and p1 and p2:
                            try:
                                # Create linear dimension with enhanced error handling
                                dim = msp.add_linear_dim(
                                    base=base, p1=p1, p2=p2,
                                    dimstyle='STRUCTURAL',
                                    dxfattribs={'layer': layer}
                                )
                                
                                # Always call render() to generate the dimension geometry
                                dim.render()
                                
                                # Calculate dimension value for verification
                                import math
                                distance = math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)
                                
                                print(f"✅ Successfully created LINEAR DIMENSION:")
                                print(f"  Distance: {distance:.0f}mm")
                                print(f"  Base offset: {base[1] - max(p1[1], p2[1]):.0f}mm")
                                print(f"  Dimension style: STRUCTURAL")
                                
                            except Exception as dim_error:
                                print(f"🔴 ERROR creating LINEAR DIMENSION: {dim_error}")
                                print(f"  This may be due to invalid coordinates or dimstyle issues")
                                print(f"  Attempting fallback dimension creation...")
                                
                                # Fallback: try with simpler parameters
                                try:
                                    dim = msp.add_linear_dim(
                                        base=base, p1=p1, p2=p2,
                                        dxfattribs={'layer': layer}  # Without dimstyle
                                    )
                                    dim.render()
                                    print(f"✅ Fallback dimension created successfully")
                                except Exception as fallback_error:
                                    print(f"🔴 Fallback dimension also failed: {fallback_error}")
                                    entity_summary['errors'] += 1
                                else:
                                    entity_summary['dimensions_created'] += 1
                            else:
                                entity_summary['dimensions_created'] += 1
                        else:
                            print(f"🔴 WARNING: Skipping malformed LINEAR DIMENSION:")
                            print(f"  Missing required parameters: base={bool(base)}, p1={bool(p1)}, p2={bool(p2)}")
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
