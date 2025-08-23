#!/usr/bin/env python3
"""
Setup script for Professional DXF Drawing Generator with ezdxf Debugging
Installs dependencies, tests ezdxf functionality, and starts the Flask server
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    print("Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("SUCCESS: Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Failed to install dependencies: {e}")
        return False

def check_ezdxf():
    """Test ezdxf installation with comprehensive debugging"""
    print("Testing ezdxf installation...")
    try:
        import ezdxf
        print(f"SUCCESS: ezdxf version {ezdxf.version} installed successfully")

        # Test basic functionality
        print("Testing basic ezdxf functionality...")
        doc = ezdxf.new('R2018')
        msp = doc.modelspace()
        msp.add_line((0, 0), (10, 10))
        msp.add_circle((5, 5), radius=3)
        print("SUCCESS: ezdxf basic functionality test passed")

        # Test memory buffer writing (this is what we use in the app)
        print("Testing DXF memory buffer writing...")
        import io

        # Test memory buffer writing with StringIO (ezdxf expects text stream)
        string_buffer = io.StringIO()
        doc.write(string_buffer)
        string_buffer.seek(0)
        content = string_buffer.getvalue()
        buffer_size = len(content)
        print(f"SUCCESS: StringIO writing successful ({buffer_size} characters)")

        # Test conversion to bytes for web transfer
        content_bytes = content.encode('utf-8')
        print(f"SUCCESS: Converted to {len(content_bytes)} bytes for transfer")

        # This is the critical test - if memory buffer works, the app will work
        print("SUCCESS: ezdxf memory buffer functionality verified")

        return True
    except ImportError:
        print("ERROR: ezdxf not installed properly")
        return False
    except Exception as e:
        print(f"ERROR: ezdxf test failed: {e}")
        return False

def check_gemini_api():
    """Check if Gemini API key is configured"""
    print("Checking Gemini AI configuration...")
    api_key = os.environ.get('GEMINI_API_KEY')
    if api_key:
        print("SUCCESS: GEMINI_API_KEY found in environment variables")
        print("AI-powered DXF generation will be available")
        return True
    else:
        print("WARNING: GEMINI_API_KEY not found in environment variables")
        print("To enable AI-powered DXF generation:")
        print("   1. Get a Gemini API key from https://makersuite.google.com/app/apikey")
        print("   2. Set environment variable: set GEMINI_API_KEY=your_api_key_here")
        print("   3. Restart this script")
        print("The server will still work with basic DXF generation")
        return False

def test_hardcoded_dxf():
    """Test hardcoded DXF generation as per debugging guidelines"""
    print("Running hardcoded DXF test (as per debugging guidelines)...")
    try:
        from ezdxf import new
        import io

        # Create hardcoded geometry (exactly as in the debugging guidelines)
        hardcoded_geometry = {
          "entities": [
            { "type": "LINE", "start_point": [0, 0], "end_point": [50, 25] },
            { "type": "CIRCLE", "center": [25, 12.5], "radius": 10 }
          ]
        }

        doc = new()
        msp = doc.modelspace()

        print("Processing hardcoded entities...")
        for entity in hardcoded_geometry['entities']:
            entity_type = entity['type']
            print(f"Processing entity: {entity_type}")

            if entity_type == 'LINE':
                start_point = entity['start_point']
                end_point = entity['end_point']
                msp.add_line(start_point, end_point)
                print(f"   SUCCESS: LINE added: {start_point} to {end_point}")
            elif entity_type == 'CIRCLE':
                center = entity['center']
                radius = entity['radius']
                msp.add_circle(center, radius=radius)
                print(f"   SUCCESS: CIRCLE added: center {center}, radius {radius}")

        # Test memory buffer writing with StringIO
        string_buffer = io.StringIO()
        doc.write(string_buffer)
        string_buffer.seek(0)

        content = string_buffer.getvalue()
        content_bytes = content.encode('utf-8')
        buffer_size = len(content_bytes)
        print(f"SUCCESS: Hardcoded DXF test successful ({buffer_size} bytes generated)")
        print("ezdxf library is working correctly for AI-generated geometry")
        return True

    except Exception as e:
        print(f"ERROR: Hardcoded DXF test failed: {e}")
        print("This indicates a problem with the ezdxf library or environment")
        import traceback
        traceback.print_exc()
        return False

def start_server():
    """Start the Flask development server"""
    print("Starting Professional DXF Drawing Generator server...")
    print("Server will run on http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    print("\nDEBUGGING FEATURES ENABLED:")
    print("- Raw AI responses will be logged to console")
    print("- Cleaned JSON parsing will be logged")
    print("- Final geometry data will be logged")
    print("- Entity processing will be logged")
    print("- Use /test-hardcoded-dxf endpoint for isolated testing")
    print("-" * 50)

    try:
        subprocess.run([sys.executable, "app.py"])
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"ERROR: Server error: {e}")

def main():
    """Main setup function"""
    print("Professional DXF Drawing Generator Setup with ezdxf Debugging")
    print("=" * 70)

    # Check if we're in the right directory
    if not os.path.exists("app.py"):
        print("ERROR: app.py not found. Please run this script from the python-backend directory.")
        sys.exit(1)

    # Install dependencies
    if not install_requirements():
        print("ERROR: Setup failed: Could not install dependencies")
        sys.exit(1)

    # Test ezdxf
    if not check_ezdxf():
        print("ERROR: Setup failed: ezdxf not working properly")
        sys.exit(1)

    # Test hardcoded DXF generation
    if not test_hardcoded_dxf():
        print("ERROR: Setup failed: Hardcoded DXF test failed")
        sys.exit(1)

    # Check Gemini API
    gemini_available = check_gemini_api()

    print("\nSUCCESS: Setup completed successfully!")
    print("\nAvailable endpoints:")
    print("- GET  /health - Health check")
    print("- POST /generate-dxf - Basic DXF generation")
    print("- POST /download-dxf - Direct DXF download")
    if gemini_available:
        print("- POST /generate-dxf-endpoint - AI-powered DXF generation (NEW)")
    print("- POST /parse-ai-drawing - Legacy AI parsing")
    print("- POST /test-hardcoded-dxf - Hardcoded test for debugging")

    print("\nDebugging Guidelines Implemented:")
    print("1. SUCCESS: Comprehensive logging at all checkpoints")
    print("2. SUCCESS: Robust entity processing with error handling")
    print("3. SUCCESS: Hardcoded test endpoint for isolation")
    print("4. SUCCESS: Defensive programming for malformed data")

    input("\nPress Enter to start the server...")
    start_server()

if __name__ == "__main__":
    main()
