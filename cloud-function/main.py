import functions_framework
import json
import base64
import tempfile
import os
import sys
import traceback
from io import StringIO
import subprocess

# Install ezdxf if not available
try:
    import ezdxf
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "ezdxf"])
    import ezdxf

from ezdxf import colors
from ezdxf.enums import TextEntityAlignment
from ezdxf.tools.standards import setup_dimstyle

@functions_framework.http
def ezdxf_drawing_generator(request):
    """
    Google Cloud Function to execute ezdxf Python code and return DXF file
    """
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    if request.method != 'POST':
        return (json.dumps({'error': 'Method not allowed'}), 405, headers)
    
    try:
        # Parse request data
        request_json = request.get_json(silent=True)
        if not request_json:
            return (json.dumps({'error': 'No JSON data provided'}), 400, headers)
        
        python_code = request_json.get('python_code', '')
        filename = request_json.get('filename', 'drawing')
        
        if not python_code:
            return (json.dumps({'error': 'No Python code provided'}), 400, headers)
        
        # Create temporary directory for execution
        with tempfile.TemporaryDirectory() as temp_dir:
            # Prepare the execution environment
            execution_globals = {
                'ezdxf': ezdxf,
                'colors': colors,
                'TextEntityAlignment': TextEntityAlignment,
                'setup_dimstyle': setup_dimstyle,
                '__name__': '__main__'
            }
            
            # Capture stdout for logging
            old_stdout = sys.stdout
            stdout_capture = StringIO()
            sys.stdout = stdout_capture
            
            # Change to temp directory
            old_cwd = os.getcwd()
            os.chdir(temp_dir)
            
            try:
                # Execute the Python code
                exec(python_code, execution_globals)
                
                # Look for generated DXF files
                dxf_files = [f for f in os.listdir('.') if f.endswith('.dxf')]
                
                if not dxf_files:
                    return (json.dumps({
                        'error': 'No DXF file was generated. Make sure your code calls doc.saveas("filename.dxf")'
                    }), 400, headers)
                
                # Use the first DXF file found
                dxf_filename = dxf_files[0]
                
                # Read the DXF file and encode as base64
                with open(dxf_filename, 'rb') as dxf_file:
                    dxf_content = dxf_file.read()
                    dxf_base64 = base64.b64encode(dxf_content).decode('utf-8')
                
                # Get execution log
                execution_log = stdout_capture.getvalue()
                
                # Prepare response
                response_data = {
                    'success': True,
                    'dxf_content': dxf_base64,
                    'filename': dxf_filename,
                    'file_size': len(dxf_content),
                    'execution_log': execution_log or 'Drawing generated successfully',
                    'description': f'Professional CAD drawing generated with ezdxf library'
                }
                
                return (json.dumps(response_data), 200, headers)
                
            except Exception as e:
                error_traceback = traceback.format_exc()
                return (json.dumps({
                    'error': f'Python execution error: {str(e)}',
                    'traceback': error_traceback,
                    'execution_log': stdout_capture.getvalue()
                }), 400, headers)
                
            finally:
                # Restore stdout and working directory
                sys.stdout = old_stdout
                os.chdir(old_cwd)
    
    except Exception as e:
        return (json.dumps({
            'error': f'Function error: {str(e)}',
            'traceback': traceback.format_exc()
        }), 500, headers)

# For local testing
if __name__ == '__main__':
    # Test the function locally
    import flask
    
    app = flask.Flask(__name__)
    
    @app.route('/', methods=['POST', 'OPTIONS'])
    def test_function():
        return ezdxf_drawing_generator(flask.request)
    
    app.run(debug=True, port=8080)
