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

# Import ezdxf after installation
import ezdxf
from ezdxf import colors
from ezdxf.enums import TextEntityAlignment

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Server configuration
SERVER_PORT = 8080
SERVER_HOST = '127.0.0.1'

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
                
                # Get execution log
                execution_log = stdout_capture.getvalue()
                file_size = len(dxf_content)
                
                print(f"📁 File size: {file_size} bytes")
                print(f"🎯 Drawing generation completed successfully!")
                
                # Prepare response
                response_data = {
                    'success': True,
                    'dxf_content': dxf_base64,
                    'filename': dxf_filename,
                    'file_size': file_size,
                    'execution_log': execution_log or 'Drawing generated successfully',
                    'description': f'Professional CAD drawing generated with ezdxf library',
                    'timestamp': datetime.now().isoformat()
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
