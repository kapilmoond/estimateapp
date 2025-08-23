#!/usr/bin/env python3
"""
Simple ezdxf test to isolate the issue
"""

import sys

def test_ezdxf_import():
    """Test if ezdxf can be imported"""
    try:
        import ezdxf
        print(f"SUCCESS: ezdxf imported, version: {ezdxf.version}")
        return True
    except ImportError as e:
        print(f"ERROR: Cannot import ezdxf: {e}")
        return False

def test_ezdxf_basic():
    """Test basic ezdxf functionality"""
    try:
        import ezdxf
        print("Testing basic document creation...")
        doc = ezdxf.new('R2018')
        print("SUCCESS: Document created")
        
        print("Testing modelspace access...")
        msp = doc.modelspace()
        print("SUCCESS: Modelspace accessed")
        
        print("Testing entity creation...")
        msp.add_line((0, 0), (10, 10))
        print("SUCCESS: Line entity added")
        
        msp.add_circle((5, 5), radius=3)
        print("SUCCESS: Circle entity added")
        
        return True
    except Exception as e:
        print(f"ERROR: Basic ezdxf test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_ezdxf_memory_buffer():
    """Test ezdxf memory buffer writing"""
    try:
        import ezdxf
        import io

        print("Creating document with entities...")
        doc = ezdxf.new('R2018')
        msp = doc.modelspace()
        msp.add_line((0, 0), (10, 10))
        msp.add_circle((5, 5), radius=3)

        print("Testing memory buffer writing with StringIO...")
        # ezdxf expects a text stream, not binary
        mem_buffer = io.StringIO()

        doc.write(mem_buffer)
        print("SUCCESS: doc.write() with StringIO worked")

        mem_buffer.seek(0)
        content = mem_buffer.getvalue()
        buffer_size = len(content)
        print(f"SUCCESS: Memory buffer contains {buffer_size} characters")

        # Convert to bytes for web transfer
        content_bytes = content.encode('utf-8')
        print(f"SUCCESS: Converted to {len(content_bytes)} bytes for transfer")

        return True
    except Exception as e:
        print(f"ERROR: Memory buffer test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("Simple ezdxf Test Suite")
    print("=" * 30)
    
    tests = [
        ("Import Test", test_ezdxf_import),
        ("Basic Functionality", test_ezdxf_basic),
        ("Memory Buffer", test_ezdxf_memory_buffer)
    ]
    
    passed = 0
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        if test_func():
            passed += 1
            print(f"PASSED: {test_name}")
        else:
            print(f"FAILED: {test_name}")
        print("-" * 20)
    
    print(f"\nResults: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("SUCCESS: All ezdxf tests passed!")
        print("The ezdxf library is working correctly.")
    else:
        print("ERROR: Some ezdxf tests failed.")
        print("There may be an issue with the ezdxf installation or environment.")
    
    return passed == len(tests)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
