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

# Import ezdxf library after installation
import ezdxf
from ezdxf import colors
from ezdxf.enums import TextEntityAlignment

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Server configuration
SERVER_PORT = 8080
SERVER_HOST = '127.0.0.1'

def analyze_error(error_msg, traceback_str, code):
    """
    Analyze common ezdxf errors and provide helpful suggestions
    """
    suggestions = []

    # Common ezdxf errors and solutions
    if "dimpost" in error_msg.lower() or "invalid dimpost string" in error_msg.lower():
        suggestions.append("DO NOT set dimpost parameter - it causes 'Invalid dimpost string' errors")
        suggestions.append("DO NOT add units to dimension text (e.g., text='<> mm')")
        suggestions.append("Use only text='<>' for automatic measurements")
        suggestions.append("Remove any dimpost, dimunit, or unit-related parameters")

    if "render" in error_msg.lower():
        suggestions.append("Make sure to call dim.render() after creating dimensions")
        suggestions.append("Example: dim = msp.add_linear_dim(...); dim.render()")

    if "dimension" in error_msg.lower() and "style" in error_msg.lower():
        suggestions.append("Use setup=True when creating document: doc = ezdxf.new('R2010', setup=True)")
        suggestions.append("Configure dimstyle before creating dimensions")

    if "layer" in error_msg.lower():
        suggestions.append("Create layers before using them: doc.layers.add(name='LAYERNAME', color=7)")
        suggestions.append("Check layer names in dxfattribs={'layer': 'LAYERNAME'}")

    if "saveas" in error_msg.lower() or "save" in error_msg.lower():
        suggestions.append("Make sure to save the document: doc.saveas('filename.dxf')")
        suggestions.append("Check file permissions and disk space")

    if "import" in error_msg.lower():
        suggestions.append("Check import statements - use: import ezdxf")
        suggestions.append("Make sure all required modules are imported")

    if "attribute" in error_msg.lower():
        suggestions.append("Check object method names and attributes")
        suggestions.append("Verify ezdxf syntax - refer to documentation")

    if "coordinate" in error_msg.lower() or "point" in error_msg.lower():
        suggestions.append("Check coordinate format: use (x, y) tuples for 2D points")
        suggestions.append("Ensure coordinates are numeric values")

    if "leader" in error_msg.lower():
        suggestions.append("DO NOT use msp.add_leader() - it causes errors")
        suggestions.append("Use simple lines and text instead of complex leaders")

    if not suggestions:
        suggestions.append("Check the ezdxf documentation for correct syntax")
        suggestions.append("Verify all required parameters are provided")
        suggestions.append("Make sure the code follows ezdxf patterns")

    return {
        'suggestions': suggestions,
        'error_type': type(error_msg).__name__,
        'common_fixes': [
            "Add doc = ezdxf.new('R2010', setup=True) at the beginning",
            "Create layers before using them",
            "Call dim.render() after creating dimensions",
            "Add doc.saveas('filename.dxf') at the end"
        ]
    }

# Image generation removed - only DXF files are generated now

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
                print(f"📝 Code preview: {python_code[:200]}...")

                # Validate code before execution
                try:
                    compile(python_code, '<string>', 'exec')
                    print("✅ Code syntax validation passed")
                except SyntaxError as e:
                    print(f"❌ Syntax error in generated code: {e}")
                    return jsonify({
                        'error': f'Syntax error in generated Python code: {str(e)}',
                        'execution_log': f'Syntax validation failed at line {e.lineno}: {e.text}',
                        'code_preview': python_code[:500]
                    }), 400

                # Execute the Python code with enhanced error handling
                try:
                    exec(python_code, execution_globals)
                    print("✅ Code execution completed")
                except Exception as exec_error:
                    print(f"❌ Runtime error during execution: {exec_error}")
                    return jsonify({
                        'error': f'Runtime error during code execution: {str(exec_error)}',
                        'execution_log': stdout_capture.getvalue(),
                        'traceback': traceback.format_exc(),
                        'code_preview': python_code[:500]
                    }), 400

                # Look for generated DXF files
                dxf_files = [f for f in os.listdir('.') if f.endswith('.dxf')]
                print(f"📁 Found {len(dxf_files)} DXF files: {dxf_files}")

                if not dxf_files:
                    # Check if doc variable exists but wasn't saved
                    if 'doc' in execution_globals:
                        print("⚠️ Document created but not saved, attempting auto-save...")
                        try:
                            doc = execution_globals['doc']
                            auto_filename = f"auto_generated_{datetime.now().strftime('%Y%m%d_%H%M%S')}.dxf"
                            doc.saveas(auto_filename)
                            dxf_files = [auto_filename]
                            print(f"✅ Auto-saved as {auto_filename}")
                        except Exception as save_error:
                            print(f"❌ Auto-save failed: {save_error}")

                    if not dxf_files:
                        return jsonify({
                            'error': 'No DXF file was generated. Make sure your code calls doc.saveas("filename.dxf")',
                            'execution_log': stdout_capture.getvalue(),
                            'suggestion': 'Add doc.saveas("drawing.dxf") at the end of your code',
                            'code_preview': python_code[:500]
                        }), 400
                
                # Use the first DXF file found
                dxf_filename = dxf_files[0]
                
                print(f"✅ DXF file generated: {dxf_filename}")
                
                # Read the DXF file and encode as base64
                with open(dxf_filename, 'rb') as dxf_file:
                    dxf_content = dxf_file.read()
                    dxf_base64 = base64.b64encode(dxf_content).decode('utf-8')

                print(f"📁 DXF file size: {len(dxf_content)} bytes")

                # Image generation removed - only DXF files are provided
                print("✅ DXF file generated successfully - no image generation needed")
                png_base64 = None
                pdf_base64 = None
                image_success = False
                image_error = "Image generation disabled - only DXF files are generated"

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

                # Provide helpful error analysis
                error_analysis = analyze_error(error_msg, error_traceback, python_code)

                return jsonify({
                    'error': f'Python execution error: {error_msg}',
                    'traceback': error_traceback,
                    'execution_log': stdout_capture.getvalue(),
                    'error_analysis': error_analysis,
                    'code_preview': python_code[:500]
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
