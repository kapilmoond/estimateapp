"""
Flask API server for Professional DXF Drawing Generation
Pure internal logic - NO external AI API dependencies
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
import tempfile
import base64
import io
import math
import re
from datetime import datetime
# No external AI APIs - pure internal DXF generation
import ezdxf
from ezdxf import units
from dxf_generator import generate_construction_drawing, ProfessionalDXFGenerator

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global debug data storage
last_debug_data = {}

# Internal DXF Generation Service - No external API dependencies
class InternalDXFGenerator:
    """Pure internal DXF generation without external AI APIs"""
    
    @staticmethod
    def parse_user_description(description: str, title: str, user_requirements: str) -> dict:
        """Parse user description and generate DXF entities internally"""
        
        # Combine all input text
        full_text = f"{title} {description} {user_requirements}".lower()
        
        entities = []
        
        # Detect drawing type and generate appropriate entities
        if any(word in full_text for word in ['line', 'dotted', 'dashed']):
            entities.extend(InternalDXFGenerator._generate_line_entities(full_text))
        
        if any(word in full_text for word in ['table', 'desk', 'furniture']):
            entities.extend(InternalDXFGenerator._generate_table_entities(full_text))
        
        if any(word in full_text for word in ['column', 'pillar', 'support']):
            entities.extend(InternalDXFGenerator._generate_column_entities(full_text))
        
        if any(word in full_text for word in ['beam', 'girder', 'structure']):
            entities.extend(InternalDXFGenerator._generate_beam_entities(full_text))
        
        if any(word in full_text for word in ['building', 'house', 'room', 'plan']):
            entities.extend(InternalDXFGenerator._generate_building_entities(full_text))
        
        # Always add dimensions for any drawing
        if entities:
            entities.extend(InternalDXFGenerator._generate_dimensions_for_entities(entities, full_text))
        
        # Add text annotations
        entities.extend(InternalDXFGenerator._generate_text_annotations(entities, full_text))
        
        return {
            "entities": entities
        }
    
    @staticmethod
    def _extract_dimensions(text: str) -> dict:
        """Extract dimensions from text description"""
        
        # Extract numbers followed by units (m, mm, cm)
        patterns = {
            'meters': r'(\d+(?:\.\d+)?)\s*m(?!m)',
            'millimeters': r'(\d+(?:\.\d+)?)\s*mm',
            'centimeters': r'(\d+(?:\.\d+)?)\s*cm'
        }
        
        dimensions = {'length': 2000, 'width': 1000, 'height': 750}  # defaults
        
        for unit, pattern in patterns.items():
            matches = re.findall(pattern, text)
            if matches:
                value = float(matches[0])
                if unit == 'meters':
                    value *= 1000  # convert to mm
                elif unit == 'centimeters':
                    value *= 10    # convert to mm
                
                # Assign to appropriate dimension
                if value > 5000:  # likely length
                    dimensions['length'] = value
                elif value > 500:  # likely width/height
                    if 'width' not in text or dimensions['width'] == 1000:
                        dimensions['width'] = value
                    else:
                        dimensions['height'] = value
        
        return dimensions
    
    @staticmethod
    def _generate_line_entities(text: str) -> list:
        """Generate line entities based on description"""
        dims = InternalDXFGenerator._extract_dimensions(text)
        length = dims['length']
        
        # Determine line type
        linetype = "CONTINUOUS"
        if 'dotted' in text or 'dashed' in text:
            linetype = "DASHED2"
        
        return [
            {
                "type": "LINE",
                "start_point": [1000, 1000],
                "end_point": [1000 + length, 1000],
                "layer": "0-STRUCTURAL",
                "linetype": linetype
            }
        ]
    
    @staticmethod
    def _generate_table_entities(text: str) -> list:
        """Generate table entities based on description"""
        dims = InternalDXFGenerator._extract_dimensions(text)
        
        length = dims['length']
        width = dims['width']
        height = dims.get('height', 750)
        
        origin = [5000, 5000]
        
        entities = []
        
        # Table top (plan view)
        table_points = [
            origin,
            [origin[0] + length, origin[1]],
            [origin[0] + length, origin[1] + width],
            [origin[0], origin[1] + width],
            origin
        ]
        
        entities.append({
            "type": "LWPOLYLINE",
            "points": table_points,
            "closed": True,
            "layer": "0-STRUCTURAL"
        })
        
        # Table legs (corners)
        leg_size = 150
        leg_positions = [
            [origin[0] + 100, origin[1] + 100],
            [origin[0] + length - 100, origin[1] + 100],
            [origin[0] + 100, origin[1] + width - 100],
            [origin[0] + length - 100, origin[1] + width - 100]
        ]
        
        for leg_pos in leg_positions:
            leg_points = [
                leg_pos,
                [leg_pos[0] + leg_size, leg_pos[1]],
                [leg_pos[0] + leg_size, leg_pos[1] + leg_size],
                [leg_pos[0], leg_pos[1] + leg_size],
                leg_pos
            ]
            entities.append({
                "type": "LWPOLYLINE",
                "points": leg_points,
                "closed": True,
                "layer": "0-STRUCTURAL-LEGS"
            })
        
        return entities
    
    @staticmethod
    def _generate_column_entities(text: str) -> list:
        """Generate column entities"""
        dims = InternalDXFGenerator._extract_dimensions(text)
        
        width = dims.get('width', 300)
        height = dims.get('height', 300)
        
        center = [6000, 6000]
        hw, hh = width/2, height/2
        
        points = [
            [center[0] - hw, center[1] - hh],
            [center[0] + hw, center[1] - hh],
            [center[0] + hw, center[1] + hh],
            [center[0] - hw, center[1] + hh],
            [center[0] - hw, center[1] - hh]
        ]
        
        return [{
            "type": "LWPOLYLINE",
            "points": points,
            "closed": True,
            "layer": "0-STRUCTURAL-COLUMNS"
        }]
    
    @staticmethod
    def _generate_beam_entities(text: str) -> list:
        """Generate beam entities"""
        dims = InternalDXFGenerator._extract_dimensions(text)
        
        length = dims['length']
        width = dims.get('width', 300)
        
        start = [7000, 7000]
        end = [start[0] + length, start[1]]
        
        # Beam outline
        hw = width / 2
        points = [
            [start[0], start[1] - hw],
            [end[0], end[1] - hw],
            [end[0], end[1] + hw],
            [start[0], start[1] + hw],
            [start[0], start[1] - hw]
        ]
        
        return [{
            "type": "LWPOLYLINE",
            "points": points,
            "closed": True,
            "layer": "0-STRUCTURAL-BEAMS"
        }]
    
    @staticmethod
    def _generate_building_entities(text: str) -> list:
        """Generate simple building plan entities with proper geometries for dimensions"""
        dims = InternalDXFGenerator._extract_dimensions(text)
        
        length = dims['length']
        width = dims['width']
        
        origin = [8000, 8000]
        
        entities = []
        
        # Create individual wall segments for better dimension attachment
        # Bottom wall (horizontal)
        entities.append({
            "type": "LINE",
            "start_point": origin,
            "end_point": [origin[0] + length, origin[1]],
            "layer": "0-STRUCTURAL-WALLS"
        })
        
        # Right wall (vertical)
        entities.append({
            "type": "LINE",
            "start_point": [origin[0] + length, origin[1]],
            "end_point": [origin[0] + length, origin[1] + width],
            "layer": "0-STRUCTURAL-WALLS"
        })
        
        # Top wall (horizontal)
        entities.append({
            "type": "LINE",
            "start_point": [origin[0] + length, origin[1] + width],
            "end_point": [origin[0], origin[1] + width],
            "layer": "0-STRUCTURAL-WALLS"
        })
        
        # Left wall (vertical)
        entities.append({
            "type": "LINE",
            "start_point": [origin[0], origin[1] + width],
            "end_point": origin,
            "layer": "0-STRUCTURAL-WALLS"
        })
        
        # Add interior division if building is large enough
        if length > 4000:
            mid_x = origin[0] + length / 2
            entities.append({
                "type": "LINE",
                "start_point": [mid_x, origin[1]],
                "end_point": [mid_x, origin[1] + width],
                "layer": "0-STRUCTURAL-WALLS"
            })
        
        return entities
    
    @staticmethod
    def _generate_dimensions_for_entities(entities: list, text: str) -> list:
        """Generate dimension entities for the drawing"""
        dimensions = []
        
        # Find the main geometric entities
        for entity in entities:
            if entity['type'] in ['LWPOLYLINE', 'LINE']:
                if entity['type'] == 'LINE':
                    start = entity['start_point']
                    end = entity['end_point']
                    
                    # Calculate dimension base point (offset above)
                    base_y = max(start[1], end[1]) + 1500
                    base_x = (start[0] + end[0]) / 2
                    
                    dimensions.append({
                        "type": "DIMENSION",
                        "dim_type": "LINEAR",
                        "base": [base_x, base_y],
                        "p1": start,
                        "p2": end,
                        "layer": "2-DIMENSIONS-LINEAR"
                    })
                
                elif entity['type'] == 'LWPOLYLINE' and entity.get('closed'):
                    points = entity['points']
                    if len(points) >= 4:  # Rectangle-like shape
                        # Overall length dimension
                        p1 = points[0]
                        p2 = points[1]
                        base_x = (p1[0] + p2[0]) / 2
                        base_y = max(p1[1], p2[1]) + 2000
                        
                        dimensions.append({
                            "type": "DIMENSION",
                            "dim_type": "LINEAR",
                            "base": [base_x, base_y],
                            "p1": p1,
                            "p2": p2,
                            "layer": "2-DIMENSIONS-LINEAR"
                        })
                        
                        # Overall width dimension if it's a rectangle
                        if len(points) >= 4:
                            p3 = points[2] if len(points) > 2 else p2
                            base_x_w = max(p2[0], p3[0]) + 2000
                            base_y_w = (p2[1] + p3[1]) / 2
                            
                            dimensions.append({
                                "type": "DIMENSION",
                                "dim_type": "LINEAR", 
                                "base": [base_x_w, base_y_w],
                                "p1": p2,
                                "p2": p3,
                                "layer": "2-DIMENSIONS-LINEAR"
                            })
        
        return dimensions
    
    @staticmethod
    def _generate_text_annotations(entities: list, text: str) -> list:
        """Generate text annotation entities"""
        annotations = []
        
        # Add a title annotation
        if entities:
            # Find the center of all entities
            all_x = []
            all_y = []
            
            for entity in entities:
                if entity['type'] == 'LINE':
                    all_x.extend([entity['start_point'][0], entity['end_point'][0]])
                    all_y.extend([entity['start_point'][1], entity['end_point'][1]])
                elif entity['type'] == 'LWPOLYLINE':
                    for point in entity['points']:
                        all_x.append(point[0])
                        all_y.append(point[1])
            
            if all_x and all_y:
                center_x = sum(all_x) / len(all_x)
                center_y = min(all_y) - 1000  # Below the drawing
                
                annotations.append({
                    "type": "TEXT",
                    "content": "TECHNICAL DRAWING",
                    "position": [center_x, center_y],
                    "height": 200,
                    "layer": "3-TEXT-ANNOTATIONS"
                })
        
        return annotations

@app.route('/', methods=['GET'])
def root():
    """Root endpoint for basic connectivity test"""
    return jsonify({
        'message': 'Professional DXF Drawing Generator API',
        'status': 'online',
        'version': '2.0.0',
        'generation_mode': 'Internal Logic - No External APIs',
        'endpoints': [
            '/health',
            '/generate-dxf-endpoint',
            '/test-hardcoded-dxf',
            '/parse-ai-drawing',
            '/get-debug-info'
        ]
    }), 200

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
        'service': 'Professional DXF Drawing Generator (Internal)',
        'version': '2.0.0',
        'ai_dependency': False,
        'ezdxf_available': True,
        'generation_mode': 'Internal Logic - No External APIs'
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
    """Internal DXF generation endpoint - No external AI dependencies"""
    try:
        # 1. Get request data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No request data provided'
            }), 400

        # 2. Extract parameters
        title = data.get('title', 'Internal Generated Drawing')
        description = data.get('description', '')
        user_requirements = data.get('user_requirements', '')

        if not description and not user_requirements:
            return jsonify({
                'success': False,
                'error': 'No description or requirements provided'
            }), 400

        print(f"\n🔧 INTERNAL DXF GENERATION STARTED")
        print(f"Title: {title}")
        print(f"Description: {description}")
        print(f"Requirements: {user_requirements}")

        # 3. Parse user description internally (no external AI)
        geometry_data = InternalDXFGenerator.parse_user_description(description, title, user_requirements)
        
        print(f"\n📋 INTERNAL PARSING RESULTS:")
        print(f"Generated entities: {len(geometry_data.get('entities', []))}")
        
        # Count entity types
        entity_types = {}
        for entity in geometry_data.get('entities', []):
            etype = entity.get('type', 'UNKNOWN')
            entity_types[etype] = entity_types.get(etype, 0) + 1
        
        print(f"Entity breakdown: {entity_types}")
        
        # Collect debug information
        debug_data = {
            'request_data': {
                'title': title,
                'description': description,
                'user_requirements': user_requirements
            },
            'generation_method': 'Internal Logic - No External AI',
            'parsed_data': geometry_data,
            'backend_logs': [],
            'processing_steps': []
        }

        # 4. Generate the DXF file with professional setup
        doc = ezdxf.new("R2010", setup=True)
        doc.units = units.MM
        msp = doc.modelspace()

        # Setup professional layers
        layers = {
            "0-STRUCTURAL": {"color": 1, "lineweight": 35},
            "0-STRUCTURAL-LEGS": {"color": 2, "lineweight": 25}, 
            "0-STRUCTURAL-COLUMNS": {"color": 2, "lineweight": 35},
            "0-STRUCTURAL-BEAMS": {"color": 3, "lineweight": 35},
            "0-STRUCTURAL-WALLS": {"color": 4, "lineweight": 50},
            "2-DIMENSIONS-LINEAR": {"color": 256, "lineweight": 18},
            "3-TEXT-ANNOTATIONS": {"color": 256, "lineweight": 18}
        }
        
        for layer_name, props in layers.items():
            if layer_name not in doc.layers:
                layer = doc.layers.add(layer_name)
                layer.color = props["color"]

        # Setup dimension style with proper extension line configuration
        print("📏 Setting up STRUCTURAL dimension style...")
        
        # Remove existing dimstyle if it exists
        if 'STRUCTURAL' in doc.dimstyles:
            del doc.dimstyles['STRUCTURAL']
            
        dimstyle = doc.dimstyles.add('STRUCTURAL')
        
        # Critical dimension style configuration for proper rendering
        # Extension line configuration
        dimstyle.dxf.dimexo = 1.25     # Extension line offset from origin points
        dimstyle.dxf.dimexe = 2.5      # Extension line extension beyond dimension line
        dimstyle.dxf.dimse1 = 0        # Suppress first extension line (0 = show)
        dimstyle.dxf.dimse2 = 0        # Suppress second extension line (0 = show)
        dimstyle.dxf.dimdle = 0        # Dimension line extension
        
        # Text configuration
        dimstyle.dxf.dimtxt = 3.5      # Text height
        dimstyle.dxf.dimgap = 1.0      # Gap between text and dimension line
        dimstyle.dxf.dimtad = 1        # Text above dimension line
        dimstyle.dxf.dimjust = 0       # Text justification
        
        # Arrow configuration
        dimstyle.dxf.dimasz = 3.0      # Arrow size
        dimstyle.dxf.dimblk = "_ARCHTICK"  # Use standard architectural tick
        dimstyle.dxf.dimblk1 = "_ARCHTICK" # First arrow block
        dimstyle.dxf.dimblk2 = "_ARCHTICK" # Second arrow block
        
        # Scale and measurement configuration
        dimstyle.dxf.dimscale = 1.0    # Overall scale factor
        dimstyle.dxf.dimlfac = 1.0     # Linear measurement factor
        dimstyle.dxf.dimdec = 0        # Decimal places for dimensions
        dimstyle.dxf.dimzin = 8        # Zero suppression
        dimstyle.dxf.dimlunit = 2      # Linear unit format (2 = decimal)
        
        # Color and layer settings
        dimstyle.dxf.dimclrd = 256     # Dimension line color (by layer)
        dimstyle.dxf.dimclre = 256     # Extension line color (by layer)
        dimstyle.dxf.dimclrt = 256     # Text color (by layer)
        
        print(f"✅ Dimension style 'STRUCTURAL' configured with proper settings")

        entities = geometry_data.get('entities', [])
        
        # Track entity processing
        entity_summary = {
            'total': len(entities),
            'processed': 0,
            'by_type': entity_types,
            'dimensions_created': 0,
            'errors': 0
        }
        
        print(f"\n🔄 PROCESSING {len(entities)} ENTITIES...")

        # Process each entity
        for entity in entities:
            entity_type = entity.get('type')
            layer = entity.get('layer', '0')
            
            try:
                if entity_type == 'LINE':
                    start = entity.get('start_point')
                    end = entity.get('end_point')
                    linetype = entity.get('linetype', 'CONTINUOUS')
                    if start and end:
                        msp.add_line(start, end, dxfattribs={'layer': layer, 'linetype': linetype})
                        print(f"  ✅ Created LINE: {start} to {end}")

                elif entity_type == 'LWPOLYLINE':
                    points = entity.get('points')
                    closed = entity.get('closed', False)
                    if points and len(points) >= 2:
                        msp.add_lwpolyline(points, dxfattribs={'layer': layer, 'closed': closed})
                        print(f"  ✅ Created LWPOLYLINE with {len(points)} points")

                elif entity_type == 'CIRCLE':
                    center = entity.get('center')
                    radius = entity.get('radius')
                    if center and radius is not None:
                        msp.add_circle(center, radius=float(radius), dxfattribs={'layer': layer})
                        print(f"  ✅ Created CIRCLE at {center} with radius {radius}")

                elif entity_type == 'TEXT':
                    content = entity.get('content')
                    position = entity.get('position')
                    height = entity.get('height', 2.5)
                    if content and position:
                        text_entity = msp.add_text(
                            content, 
                            dxfattribs={'layer': layer, 'height': height}
                        )
                        text_entity.set_placement(position)
                        print(f"  ✅ Created TEXT: '{content}' at {position}")

                elif entity_type == 'DIMENSION':
                    dim_type = entity.get('dim_type', 'LINEAR')
                    if dim_type == 'LINEAR':
                        base = entity.get('base')
                        p1 = entity.get('p1')
                        p2 = entity.get('p2')
                        
                        if base and p1 and p2:
                            try:
                                # Convert to tuples for ezdxf
                                base_point = tuple(base[:2])  # Ensure 2D coordinates
                                point1 = tuple(p1[:2])
                                point2 = tuple(p2[:2])
                                
                                # Calculate measurement for logging
                                distance = math.sqrt((point2[0] - point1[0])**2 + (point2[1] - point1[1])**2)
                                
                                print(f"  📐 Creating DIMENSION: {distance:.0f}mm")
                                print(f"    Base: {base_point}, P1: {point1}, P2: {point2}")
                                print(f"    Layer: {layer}")
                                
                                # Create the dimension with proper parameters
                                dim = msp.add_linear_dim(
                                    base=base_point, 
                                    p1=point1, 
                                    p2=point2,
                                    dimstyle='STRUCTURAL',
                                    dxfattribs={'layer': layer}
                                )
                                
                                # Critical: render the dimension to create all geometry
                                print(f"    🔧 Rendering dimension...")
                                dim.render()
                                
                                # Verify dimension was created and rendered
                                try:
                                    # Try different methods to verify dimension creation
                                    verification_passed = False
                                    
                                    if hasattr(dim, 'get_geometry_block'):
                                        geom_block = dim.get_geometry_block()
                                        if geom_block:
                                            block_entities = list(geom_block)
                                            print(f"    ✅ Dimension rendered successfully: {len(block_entities)} entities in geometry block")
                                            verification_passed = True
                                            
                                            # Log the types of entities created
                                            entity_type_count = {}
                                            for be in block_entities:
                                                be_type = be.dxftype()
                                                entity_type_count[be_type] = entity_type_count.get(be_type, 0) + 1
                                            print(f"    📋 Block contains: {entity_type_count}")
                                        else:
                                            print(f"    ⚠️  Warning: get_geometry_block() returned None")
                                    else:
                                        # Alternative verification: check if dimension was added to modelspace
                                        print(f"    ✅ Dimension created (geometry block method not available)")
                                        verification_passed = True
                                    
                                    if verification_passed:
                                        entity_summary['dimensions_created'] += 1
                                    else:
                                        print(f"    ⚠️  Warning: Could not verify dimension creation")
                                        
                                except Exception as verify_e:
                                    print(f"    ⚠️  Warning: Verification error: {verify_e}")
                                    # Still count as created since no exception during creation
                                    entity_summary['dimensions_created'] += 1
                                    
                            except Exception as dim_e:
                                print(f"    🔴 Error creating dimension: {dim_e}")
                                entity_summary['errors'] += 1
                        else:
                            print(f"    🔴 Invalid dimension data - missing base, p1, or p2")
                            entity_summary['errors'] += 1

                entity_summary['processed'] += 1
                
            except Exception as e:
                print(f"  🔴 Error processing {entity_type}: {e}")
                entity_summary['errors'] += 1

        # Print processing summary
        print(f"\n📊 PROCESSING SUMMARY:")
        print(f"Total entities: {entity_summary['total']}")
        print(f"Successfully processed: {entity_summary['processed']}")
        print(f"Dimensions created: {entity_summary['dimensions_created']}")
        print(f"Errors: {entity_summary['errors']}")

        # Store debug information
        global last_debug_data
        last_debug_data = {
            'timestamp': datetime.now().isoformat(),
            'request_data': debug_data['request_data'],
            'generation_method': 'Internal Logic - No External AI',
            'parsed_data': geometry_data,
            'backend_logs': entity_summary,
            'processing_steps': debug_data.get('processing_steps', [])
        }

        # Save DXF to memory buffer
        string_buffer = io.StringIO()
        doc.write(string_buffer)
        string_buffer.seek(0)

        # Convert to bytes for file transfer
        dxf_content = string_buffer.getvalue()
        bytes_buffer = io.BytesIO(dxf_content.encode('utf-8'))
        bytes_buffer.seek(0)

        # Return file for download
        filename = f"{title.replace(' ', '_')}.dxf"
        
        print(f"\n✅ DXF GENERATION COMPLETED: {filename}")
        print(f"File size: {len(dxf_content)} characters")
        
        return send_file(
            bytes_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.dxf'
        )

    except Exception as e:
        print(f"🔴 INTERNAL DXF GENERATION ERROR: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Internal DXF generation failed'
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)