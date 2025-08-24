#!/usr/bin/env python3
"""
Google Cloud Functions entry point for Professional DXF Drawing Generator
Pure internal logic - NO external AI dependencies
"""

import functions_framework
from flask import request, jsonify, send_file
import json
import os
import io
from datetime import datetime
# Import our pure internal DXF generation system
from app_internal import InternalDXFGenerator, last_debug_data
import ezdxf
from ezdxf import units
import math

# Pure internal logic - NO external AI dependencies
print("🔧 DXF Generator: Using pure internal logic - no external APIs required")

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
            'service': 'Professional DXF Drawing Generator (Internal Logic)',
            'version': '2.0.0',
            'ai_dependency': False,
            'generation_mode': 'Pure Internal Logic - No External APIs'
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
    elif request.path == '/get-debug-info' and request.method == 'GET':
        response = get_debug_info(request)
        if hasattr(response, 'headers'):
            response.headers.update(headers)
        return response
    else:
        error_response = jsonify({'error': 'Endpoint not found'})
        error_response.headers.update(headers)
        return error_response, 404

def get_debug_info(request):
    """Retrieve the last debug information from DXF generation"""
    try:
        global last_debug_data
        if last_debug_data:
            response = jsonify({
                'success': True,
                'debug_data': last_debug_data
            })
            return add_cors_headers(response), 200
        else:
            response = jsonify({
                'success': False,
                'message': 'No debug data available. Generate a drawing first.'
            })
            return add_cors_headers(response), 404
    except Exception as e:
        response = jsonify({
            'success': False,
            'error': str(e)
        })
        return add_cors_headers(response), 500

def generate_dxf_endpoint(request):
    """Internal DXF generation endpoint - No external AI dependencies"""
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
        title = data.get('title', 'Internal Generated Drawing')
        description = data.get('description', '')
        user_requirements = data.get('user_requirements', '')

        if not description and not user_requirements:
            error_response = jsonify({
                'success': False,
                'error': 'No description or requirements provided'
            })
            return add_cors_headers(error_response), 400

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
        if 'STRUCTURAL' not in doc.dimstyles:
            print("📏 Setting up STRUCTURAL dimension style...")
            dimstyle = doc.dimstyles.add('STRUCTURAL')
            
            # Extension line configuration
            dimstyle.dxf.dimexo = 0.625
            dimstyle.dxf.dimexe = 1.25
            dimstyle.dxf.dimse1 = 0
            dimstyle.dxf.dimse2 = 0
            dimstyle.dxf.dimdle = 0
            
            # Text positioning
            dimstyle.dxf.dimtxt = 2.5
            dimstyle.dxf.dimgap = 0.625
            dimstyle.dxf.dimtad = 1
            dimstyle.dxf.dimjust = 0
            
            # Arrow configuration
            dimstyle.dxf.dimasz = 2.5
            dimstyle.dxf.dimblk = "ARCHTICK"
            
            # Scale and measurement
            dimstyle.dxf.dimscale = 1.0
            dimstyle.dxf.dimlfac = 1.0
            dimstyle.dxf.dimdec = 0
            dimstyle.dxf.dimzin = 8
            dimstyle.dxf.dimlunit = 2

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
                            # Calculate measurement
                            distance = math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)
                            
                            print(f"  📏 Creating DIMENSION: {distance:.0f}mm")
                            print(f"    Base: {base}, P1: {p1}, P2: {p2}")
                            
                            dim = msp.add_linear_dim(
                                base=base, p1=p1, p2=p2,
                                dimstyle='STRUCTURAL',
                                dxfattribs={'layer': layer}
                            )
                            
                            # Critical: render to create extension lines
                            dim.render()
                            
                            # Verify dimension creation
                            geom_block = dim.get_geometry_block()
                            if geom_block:
                                block_entities = list(geom_block)
                                print(f"    ✅ Dimension rendered: {len(block_entities)} entities in block")
                                entity_summary['dimensions_created'] += 1
                            else:
                                print(f"    ⚠️ Warning: Dimension created but no geometry block")

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
        error_response = jsonify({
            'success': False,
            'error': str(e),
            'message': 'Internal DXF generation failed'
        })

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

# Cloud Functions entry point - routes to the internal system
main = health_check
