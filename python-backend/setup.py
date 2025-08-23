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
    print("📦 Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def check_ezdxf():
    """Test ezdxf installation with comprehensive debugging"""
    print("🔧 Testing ezdxf installation...")
    try:
        import ezdxf
        print(f"✅ ezdxf version {ezdxf.version} installed successfully")

        # Test basic functionality
        print("🧪 Testing basic ezdxf functionality...")
        doc = ezdxf.new('R2018')
        msp = doc.modelspace()
        msp.add_line((0, 0), (10, 10))
        msp.add_circle((5, 5), radius=3)
        print("✅ ezdxf basic functionality test passed")

        # Test file writing
        print("🧪 Testing DXF file writing...")
        import tempfile
        import io

        # Test memory buffer writing
        mem_buffer = io.BytesIO()
        doc.write(mem_buffer)
        mem_buffer.seek(0)
        buffer_size = len(mem_buffer.getvalue())
        print(f"✅ Memory buffer writing successful ({buffer_size} bytes)")

        # Test file writing
        with tempfile.NamedTemporaryFile(suffix='.dxf', delete=False) as tmp_file:
            doc.saveas(tmp_file.name)
            file_size = os.path.getsize(tmp_file.name)
            print(f"✅ File writing successful ({file_size} bytes)")
            os.unlink(tmp_file.name)

        return True
    except ImportError:
        print("❌ ezdxf not installed properly")
        return False
    except Exception as e:
        print(f"❌ ezdxf test failed: {e}")
        return False

def check_gemini_api():
    """Check if Gemini API key is configured"""
    print("🤖 Checking Gemini AI configuration...")
    api_key = os.environ.get('GEMINI_API_KEY')
    if api_key:
        print("✅ GEMINI_API_KEY found in environment variables")
        print("🎯 AI-powered DXF generation will be available")
        return True
    else:
        print("⚠️ GEMINI_API_KEY not found in environment variables")
        print("📋 To enable AI-powered DXF generation:")
        print("   1. Get a Gemini API key from https://makersuite.google.com/app/apikey")
        print("   2. Set environment variable: set GEMINI_API_KEY=your_api_key_here")
        print("   3. Restart this script")
        print("🔄 The server will still work with basic DXF generation")
        return False

def test_hardcoded_dxf():
    """Test hardcoded DXF generation as per debugging guidelines"""
    print("🧪 Running hardcoded DXF test (as per debugging guidelines)...")
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

        for entity in hardcoded_geometry['entities']:
            if entity['type'] == 'LINE':
                msp.add_line(entity['start_point'], entity['end_point'])
            elif entity['type'] == 'CIRCLE':
                msp.add_circle(entity['center'], radius=entity['radius'])

        mem_buffer = io.BytesIO()
        doc.write(mem_buffer)
        mem_buffer.seek(0)

        buffer_size = len(mem_buffer.getvalue())
        print(f"✅ Hardcoded DXF test successful ({buffer_size} bytes generated)")
        print("🎯 ezdxf library is working correctly for AI-generated geometry")
        return True

    except Exception as e:
        print(f"❌ Hardcoded DXF test failed: {e}")
        print("🔴 This indicates a problem with the ezdxf library or environment")
        return False

def start_server():
    """Start the Flask development server"""
    print("🚀 Starting Professional DXF Drawing Generator server...")
    print("📍 Server will run on http://localhost:5000")
    print("🔄 Press Ctrl+C to stop the server")
    print("\n🐛 DEBUGGING FEATURES ENABLED:")
    print("• Raw AI responses will be logged to console")
    print("• Cleaned JSON parsing will be logged")
    print("• Final geometry data will be logged")
    print("• Entity processing will be logged")
    print("• Use /test-hardcoded-dxf endpoint for isolated testing")
    print("-" * 50)

    try:
        subprocess.run([sys.executable, "app.py"])
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")

def main():
    """Main setup function"""
    print("🏗️ Professional DXF Drawing Generator Setup with ezdxf Debugging")
    print("=" * 70)

    # Check if we're in the right directory
    if not os.path.exists("app.py"):
        print("❌ Error: app.py not found. Please run this script from the python-backend directory.")
        sys.exit(1)

    # Install dependencies
    if not install_requirements():
        print("❌ Setup failed: Could not install dependencies")
        sys.exit(1)

    # Test ezdxf
    if not check_ezdxf():
        print("❌ Setup failed: ezdxf not working properly")
        sys.exit(1)

    # Test hardcoded DXF generation
    if not test_hardcoded_dxf():
        print("❌ Setup failed: Hardcoded DXF test failed")
        sys.exit(1)

    # Check Gemini API
    gemini_available = check_gemini_api()

    print("\n✅ Setup completed successfully!")
    print("\n📋 Available endpoints:")
    print("• GET  /health - Health check")
    print("• POST /generate-dxf - Basic DXF generation")
    print("• POST /download-dxf - Direct DXF download")
    if gemini_available:
        print("• POST /generate-dxf-endpoint - AI-powered DXF generation (NEW)")
    print("• POST /parse-ai-drawing - Legacy AI parsing")
    print("• POST /test-hardcoded-dxf - Hardcoded test for debugging")

    print("\n🔧 Debugging Guidelines Implemented:")
    print("1. ✅ Comprehensive logging at all checkpoints")
    print("2. ✅ Robust entity processing with error handling")
    print("3. ✅ Hardcoded test endpoint for isolation")
    print("4. ✅ Defensive programming for malformed data")

    input("\nPress Enter to start the server...")
    start_server()

if __name__ == "__main__":
    main()
