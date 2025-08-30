#!/usr/bin/env python3
"""
Local ezdxf Drawing Server for HSR Construction Estimator
A user-friendly local server that generates professional DXF files using ezdxf library
"""

import os
import sys
import json
import base64
import tempfile
import traceback
from datetime import datetime
from io import StringIO
from flask import Flask, request, jsonify
from flask_cors import CORS

# Install required packages if not available
def install_package(package):
    import subprocess
    try:
        __import__(package)
    except ImportError:
        print(f"Installing {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Install dependencies
install_package("flask")
install_package("flask-cors")
install_package("ezdxf")
install_package("matplotlib")
install_package("pillow")

# Import ezdxf and drawing libraries after installation
import ezdxf
from ezdxf import colors
from ezdxf.enums import TextEntityAlignment

# Import matplotlib for image generation
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, Polygon
from matplotlib.lines import Line2D
import matplotlib.patches as patches
from PIL import Image
import io

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Server configuration
SERVER_PORT = 8080
SERVER_HOST = '127.0.0.1'

def dxf_to_image(dxf_file_path, output_format='PNG', dpi=300, width_inches=11, height_inches=8.5):
    """
    Convert DXF file to high-quality image with proper scaling
    """
    try:
        # Load the DXF document
        doc = ezdxf.readfile(dxf_file_path)
        msp = doc.modelspace()

        # Create matplotlib figure with specified size
        fig, ax = plt.subplots(1, 1, figsize=(width_inches, height_inches))
        ax.set_aspect('equal')

        # Get all entities and calculate bounds
        all_points = []

        # Process all entities to extract geometry
        for entity in msp:
            if entity.dxftype() == 'LINE':
                start = entity.dxf.start
                end = entity.dxf.end
                all_points.extend([(start.x, start.y), (end.x, end.y)])

                # Draw line
                ax.plot([start.x, end.x], [start.y, end.y], 'k-', linewidth=0.5)

            elif entity.dxftype() == 'CIRCLE':
                center = entity.dxf.center
                radius = entity.dxf.radius
                all_points.extend([
                    (center.x - radius, center.y - radius),
                    (center.x + radius, center.y + radius)
                ])

                # Draw circle
                circle = Circle((center.x, center.y), radius, fill=False, edgecolor='black', linewidth=0.5)
                ax.add_patch(circle)

            elif entity.dxftype() == 'ARC':
                center = entity.dxf.center
                radius = entity.dxf.radius
                start_angle = entity.dxf.start_angle
                end_angle = entity.dxf.end_angle
                all_points.extend([
                    (center.x - radius, center.y - radius),
                    (center.x + radius, center.y + radius)
                ])

                # Draw arc
                arc = patches.Arc((center.x, center.y), 2*radius, 2*radius,
                                angle=0, theta1=start_angle, theta2=end_angle,
                                edgecolor='black', linewidth=0.5)
                ax.add_patch(arc)

            elif entity.dxftype() == 'LWPOLYLINE':
                points = [(p[0], p[1]) for p in entity.get_points()]
                all_points.extend(points)

                if len(points) > 1:
                    if entity.closed:
                        points.append(points[0])  # Close the polyline

                    # Draw polyline
                    xs, ys = zip(*points)
                    ax.plot(xs, ys, 'k-', linewidth=0.5)

            elif entity.dxftype() == 'TEXT':
                insert = entity.dxf.insert
                text = entity.dxf.text
                height = getattr(entity.dxf, 'height', 1.0)
                all_points.append((insert.x, insert.y))

                # Draw text
                ax.text(insert.x, insert.y, text, fontsize=height*2, ha='left', va='bottom')

            elif entity.dxftype() == 'DIMENSION':
                # Handle dimensions - extract geometry from dimension
                try:
                    dimension_block = entity.get_geometry_block()
                    if dimension_block:
                        for dim_entity in dimension_block:
                            if dim_entity.dxftype() == 'LINE':
                                start = dim_entity.dxf.start
                                end = dim_entity.dxf.end
                                all_points.extend([(start.x, start.y), (end.x, end.y)])
                                ax.plot([start.x, end.x], [start.y, end.y], 'r-', linewidth=0.3)
                            elif dim_entity.dxftype() == 'TEXT':
                                insert = dim_entity.dxf.insert
                                text = dim_entity.dxf.text
                                all_points.append((insert.x, insert.y))
                                ax.text(insert.x, insert.y, text, fontsize=6, ha='center', va='center', color='red')
                except:
                    pass  # Skip if dimension geometry cannot be extracted

        # Calculate bounds and set limits with padding
        if all_points:
            xs, ys = zip(*all_points)
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)

            # Add 10% padding
            width = max_x - min_x
            height = max_y - min_y
            padding_x = width * 0.1 if width > 0 else 1
            padding_y = height * 0.1 if height > 0 else 1

            ax.set_xlim(min_x - padding_x, max_x + padding_x)
            ax.set_ylim(min_y - padding_y, max_y + padding_y)
        else:
            # Default bounds if no entities found
            ax.set_xlim(-10, 10)
            ax.set_ylim(-10, 10)

        # Remove axes for clean drawing
        ax.set_xticks([])
        ax.set_yticks([])
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_visible(False)
        ax.spines['left'].set_visible(False)

        # Save to bytes buffer
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format=output_format.lower(), dpi=dpi,
                   bbox_inches='tight', pad_inches=0.1, facecolor='white')
        plt.close(fig)

        img_buffer.seek(0)
        return img_buffer.getvalue()

    except Exception as e:
        print(f"Error converting DXF to image: {e}")
        raise e

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'message': 'ezdxf Drawing Server is running',
        'version': ezdxf.version,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/generate-drawing', methods=['POST', 'OPTIONS'])
def generate_drawing():
    """Generate DXF drawing from ezdxf Python code"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        # Parse request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        python_code = data.get('python_code', '')
        filename = data.get('filename', 'drawing')
        
        if not python_code:
            return jsonify({'error': 'No Python code provided'}), 400
        
        print(f"\n🎨 Generating drawing: {filename}")
        print(f"📝 Code length: {len(python_code)} characters")
        
        # Create temporary directory for execution
        with tempfile.TemporaryDirectory() as temp_dir:
            # Prepare execution environment
            execution_globals = {
                'ezdxf': ezdxf,
                'colors': colors,
                'TextEntityAlignment': TextEntityAlignment,
                '__name__': '__main__',
                'os': os,
                'datetime': datetime
            }
            
            # Capture stdout for logging
            old_stdout = sys.stdout
            stdout_capture = StringIO()
            sys.stdout = stdout_capture
            
            # Change to temp directory
            old_cwd = os.getcwd()
            os.chdir(temp_dir)
            
            try:
                print("⚙️ Executing ezdxf code...")
                
                # Execute the Python code
                exec(python_code, execution_globals)
                
                # Look for generated DXF files
                dxf_files = [f for f in os.listdir('.') if f.endswith('.dxf')]
                
                if not dxf_files:
                    return jsonify({
                        'error': 'No DXF file was generated. Make sure your code calls doc.saveas("filename.dxf")',
                        'execution_log': stdout_capture.getvalue()
                    }), 400
                
                # Use the first DXF file found
                dxf_filename = dxf_files[0]
                
                print(f"✅ DXF file generated: {dxf_filename}")
                
                # Read the DXF file and encode as base64
                with open(dxf_filename, 'rb') as dxf_file:
                    dxf_content = dxf_file.read()
                    dxf_base64 = base64.b64encode(dxf_content).decode('utf-8')

                print(f"📁 DXF file size: {len(dxf_content)} bytes")

                # Generate image from DXF
                print("🖼️ Generating image from DXF...")
                try:
                    # Generate PNG image
                    png_data = dxf_to_image(dxf_filename, 'PNG', dpi=300)
                    png_base64 = base64.b64encode(png_data).decode('utf-8')

                    # Generate PDF image for printing
                    pdf_data = dxf_to_image(dxf_filename, 'PDF', dpi=300)
                    pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')

                    print(f"🖼️ PNG image size: {len(png_data)} bytes")
                    print(f"📄 PDF image size: {len(pdf_data)} bytes")

                    image_success = True
                    image_error = None

                except Exception as img_error:
                    print(f"⚠️ Image generation failed: {img_error}")
                    png_base64 = None
                    pdf_base64 = None
                    image_success = False
                    image_error = str(img_error)

                # Get execution log
                execution_log = stdout_capture.getvalue()
                file_size = len(dxf_content)

                print(f"🎯 Drawing generation completed successfully!")

                # Prepare response
                response_data = {
                    'success': True,
                    'dxf_content': dxf_base64,
                    'filename': dxf_filename,
                    'file_size': file_size,
                    'execution_log': execution_log or 'Drawing generated successfully',
                    'description': f'Professional CAD drawing generated with ezdxf library',
                    'timestamp': datetime.now().isoformat(),
                    'image_png': png_base64,
                    'image_pdf': pdf_base64,
                    'image_success': image_success,
                    'image_error': image_error
                }
                
                return jsonify(response_data)
                
            except Exception as e:
                error_msg = str(e)
                error_traceback = traceback.format_exc()
                
                print(f"❌ Execution error: {error_msg}")
                print(f"📋 Traceback: {error_traceback}")
                
                return jsonify({
                    'error': f'Python execution error: {error_msg}',
                    'traceback': error_traceback,
                    'execution_log': stdout_capture.getvalue()
                }), 400
                
            finally:
                # Restore stdout and working directory
                sys.stdout = old_stdout
                os.chdir(old_cwd)
    
    except Exception as e:
        error_msg = str(e)
        error_traceback = traceback.format_exc()
        
        print(f"❌ Server error: {error_msg}")
        print(f"📋 Traceback: {error_traceback}")
        
        return jsonify({
            'error': f'Server error: {error_msg}',
            'traceback': error_traceback
        }), 500

@app.route('/test', methods=['GET'])
def test_ezdxf():
    """Test ezdxf functionality"""
    try:
        # Create a simple test drawing
        doc = ezdxf.new("R2010")
        msp = doc.modelspace()
        
        # Add a simple line
        msp.add_line((0, 0), (10, 0))
        msp.add_circle((5, 5), radius=2.5)
        msp.add_text("Test Drawing", dxfattribs={"height": 1.0})
        
        return jsonify({
            'status': 'success',
            'message': 'ezdxf is working correctly',
            'ezdxf_version': ezdxf.version,
            'test_entities': 3
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'ezdxf test failed: {str(e)}',
            'traceback': traceback.format_exc()
        }), 500

def print_startup_info():
    """Print server startup information"""
    print("\n" + "="*60)
    print("🏗️  HSR Construction Estimator - ezdxf Drawing Server")
    print("="*60)
    print(f"🚀 Server starting on: http://{SERVER_HOST}:{SERVER_PORT}")
    print(f"📐 ezdxf version: {ezdxf.version}")
    print(f"🕒 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n📋 Available endpoints:")
    print(f"   • Health check: http://{SERVER_HOST}:{SERVER_PORT}/")
    print(f"   • Generate drawing: http://{SERVER_HOST}:{SERVER_PORT}/generate-drawing")
    print(f"   • Test ezdxf: http://{SERVER_HOST}:{SERVER_PORT}/test")
    print("\n✅ Server is ready to generate professional DXF drawings!")
    print("="*60)

if __name__ == '__main__':
    print_startup_info()
    
    try:
        app.run(
            host=SERVER_HOST,
            port=SERVER_PORT,
            debug=False,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        sys.exit(1)
