#!/usr/bin/env python3
"""
Comprehensive test to compare:
1. LLM-generated code (corrected version)
2. Your backend system
3. Cloud deployment system

This will help identify where the dimension/text issue actually occurs.
"""

import sys
import os
import ezdxf
from ezdxf import units
import requests
import json

# Add the python-backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-backend'))

try:
    from app import InternalDXFGenerator
    backend_available = True
except ImportError as e:
    print(f"⚠️ Backend import failed: {e}")
    backend_available = False

def test_corrected_llm_code():
    """Test the corrected LLM-generated code"""
    print("🔧 TEST 1: CORRECTED LLM-GENERATED CODE")
    print("-" * 50)
    
    try:
        # Professional document setup
        doc = ezdxf.new("R2010", setup=True)
        doc.units = units.MM
        msp = doc.modelspace()

        # Create standard layers
        layers = {
            "0-STRUCTURAL-TEST": {"color": 1, "lineweight": 50},
            "2-DIMENSIONS-LINEAR": {"color": 256, "lineweight": 18},
            "3-TEXT-ANNOTATIONS": {"color": 256, "lineweight": 18}
        }

        for name, props in layers.items():
            if name not in doc.layers:
                layer = doc.layers.add(name)
                layer.color = props["color"]

        # CORRECTED: Text style creation with required 'font' parameter
        if "STANDARD" not in doc.styles:
            doc.styles.add("STANDARD", font="arial.ttf").dxf.height = 2.5

        # CORRECTED: Complete dimension style configuration
        if "STRUCTURAL" in doc.dimstyles:
            del doc.dimstyles["STRUCTURAL"]

        dimstyle = doc.dimstyles.add("STRUCTURAL")
        dimstyle.dxf.dimtxt = 2.5      # Text height
        dimstyle.dxf.dimasz = 2.5      # Arrow size
        dimstyle.dxf.dimexo = 3.0      # Extension line offset
        dimstyle.dxf.dimexe = 2.0      # Extension line extension

        # CRITICAL ADDITIONS based on ezdxf documentation
        dimstyle.dxf.dimse1 = 0        # Show first extension line (0 = show)
        dimstyle.dxf.dimse2 = 0        # Show second extension line (0 = show)
        dimstyle.dxf.dimtad = 1        # Text above dimension line
        dimstyle.dxf.dimgap = 1.0      # Gap between text and dimension line
        dimstyle.dxf.dimscale = 1.0    # Overall scale factor
        dimstyle.dxf.dimlfac = 1.0     # Linear measurement factor
        dimstyle.dxf.dimdec = 0        # Decimal places
        dimstyle.dxf.dimlunit = 2      # Linear unit format (decimal)

        # Create geometry
        start_point = (0, 0)
        end_point = (1000, 0)

        # Draw line
        msp.add_line(start_point, end_point, dxfattribs={"layer": "0-STRUCTURAL-TEST"})

        # Add dimension with proper rendering
        dimension = msp.add_linear_dim(
            base=(500, 500),
            p1=start_point,
            p2=end_point,
            dimstyle="STRUCTURAL",
            dxfattribs={"layer": "2-DIMENSIONS-LINEAR"}
        )
        dimension.render()  # CRITICAL: Must call render()

        # Add text with corrected positioning
        msp.add_text(
            "1.0 m",
            dxfattribs={
                "layer": "3-TEXT-ANNOTATIONS",
                "height": 2.5,
                "insert": (500, -200),
                "halign": 1,
                "valign": 2
            }
        )

        msp.add_text(
            "TEST LINE - 1000mm LENGTH",
            dxfattribs={
                "layer": "3-TEXT-ANNOTATIONS",
                "height": 2.0,
                "insert": (500, 200),
                "halign": 1
            }
        )

        # Save and verify
        doc.saveas("test_corrected_llm.dxf")
        
        # Verify contents
        verify_doc = ezdxf.readfile("test_corrected_llm.dxf")
        verify_msp = verify_doc.modelspace()
        
        entity_counts = {}
        for entity in verify_msp:
            entity_type = entity.dxftype()
            entity_counts[entity_type] = entity_counts.get(entity_type, 0) + 1
        
        print("✅ LLM Code Results:")
        for entity_type, count in sorted(entity_counts.items()):
            print(f"   {entity_type}: {count}")
        
        dimensions = entity_counts.get('DIMENSION', 0)
        texts = entity_counts.get('TEXT', 0)
        
        print(f"📐 Dimensions: {dimensions}")
        print(f"📝 Text entities: {texts}")
        
        if dimensions > 0 and texts > 0:
            print("🎉 LLM CODE: WORKING (dimensions and text created)")
            return True
        else:
            print("❌ LLM CODE: FAILED (missing dimensions or text)")
            return False
            
    except Exception as e:
        print(f"❌ LLM CODE: ERROR - {e}")
        return False

def test_backend_system():
    """Test your internal backend system"""
    print("\n🔧 TEST 2: YOUR BACKEND SYSTEM")
    print("-" * 50)
    
    if not backend_available:
        print("❌ Backend not available for testing")
        return False
    
    try:
        # Test internal generation
        title = "Backend Test Building"
        description = "A simple building 8m x 5m with dimensions"
        user_requirements = "Include all major dimensions"
        
        geometry_data = InternalDXFGenerator.parse_user_description(description, title, user_requirements)
        entities = geometry_data.get('entities', [])
        
        # Count entity types
        entity_types = {}
        for entity in entities:
            etype = entity.get('type', 'UNKNOWN')
            entity_types[etype] = entity_types.get(etype, 0) + 1
        
        print("✅ Backend Results:")
        for entity_type, count in sorted(entity_types.items()):
            print(f"   {entity_type}: {count}")
        
        dimensions = entity_types.get('DIMENSION', 0)
        texts = entity_types.get('TEXT', 0)
        
        print(f"📐 Dimensions: {dimensions}")
        print(f"📝 Text entities: {texts}")
        
        if dimensions > 0:
            print("🎉 BACKEND SYSTEM: WORKING (dimensions created)")
            return True
        else:
            print("❌ BACKEND SYSTEM: ISSUE (no dimensions generated)")
            return False
            
    except Exception as e:
        print(f"❌ BACKEND SYSTEM: ERROR - {e}")
        return False

def test_cloud_deployment():
    """Test the cloud deployment if available"""
    print("\n🔧 TEST 3: CLOUD DEPLOYMENT")
    print("-" * 50)
    
    # Check if function_url.txt exists
    url_file = os.path.join("python-backend", "function_url.txt")
    if not os.path.exists(url_file):
        print("❌ No cloud function URL found (function_url.txt missing)")
        return False
    
    try:
        with open(url_file, 'r') as f:
            cloud_url = f.read().strip()
        
        if not cloud_url:
            print("❌ Cloud function URL is empty")
            return False
        
        # Test health endpoint
        print(f"Testing cloud function: {cloud_url}")
        
        health_response = requests.get(f"{cloud_url}/health", timeout=10)
        
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"✅ Cloud function is healthy")
            print(f"   Service: {health_data.get('service', 'Unknown')}")
            print(f"   AI Dependency: {health_data.get('ai_dependency', 'Unknown')}")
            
            # Test DXF generation
            payload = {
                "title": "Cloud Test Building",
                "description": "A test building 10m x 6m with dimensions",
                "user_requirements": "Include all dimensions"
            }
            
            dxf_response = requests.post(f"{cloud_url}/generate-dxf-endpoint", json=payload, timeout=60)
            
            if dxf_response.status_code == 200:
                print("✅ Cloud DXF generation successful")
                
                # Save and verify
                with open("test_cloud_output.dxf", "wb") as f:
                    f.write(dxf_response.content)
                
                try:
                    doc = ezdxf.readfile("test_cloud_output.dxf")
                    msp = doc.modelspace()
                    
                    entity_counts = {}
                    for entity in msp:
                        entity_type = entity.dxftype()
                        entity_counts[entity_type] = entity_counts.get(entity_type, 0) + 1
                    
                    print("✅ Cloud Results:")
                    for entity_type, count in sorted(entity_counts.items()):
                        print(f"   {entity_type}: {count}")
                    
                    dimensions = entity_counts.get('DIMENSION', 0)
                    texts = entity_counts.get('TEXT', 0)
                    
                    print(f"📐 Dimensions: {dimensions}")
                    print(f"📝 Text entities: {texts}")
                    
                    if dimensions > 0:
                        print("🎉 CLOUD DEPLOYMENT: WORKING (dimensions created)")
                        return True
                    else:
                        print("❌ CLOUD DEPLOYMENT: ISSUE (no dimensions in output)")
                        return False
                        
                except Exception as e:
                    print(f"❌ Could not verify cloud DXF: {e}")
                    return False
            else:
                print(f"❌ Cloud DXF generation failed: {dxf_response.status_code}")
                try:
                    error_data = dxf_response.json()
                    print(f"   Error: {error_data.get('error', 'Unknown error')}")
                except:
                    print(f"   Raw response: {dxf_response.text[:200]}")
                return False
        else:
            print(f"❌ Cloud function health check failed: {health_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Cloud deployment test failed: {e}")
        return False

def check_ezdxf_version():
    """Check ezdxf version to ensure compatibility"""
    print("🔧 EZDXF VERSION CHECK")
    print("-" * 50)
    
    try:
        version = ezdxf.__version__
        print(f"✅ ezdxf version: {version}")
        
        # Check if it's a recent version (should be 1.0+)
        major_version = int(version.split('.')[0])
        if major_version >= 1:
            print("✅ ezdxf version is compatible")
            return True
        else:
            print("⚠️ ezdxf version may be outdated - consider upgrading")
            return True
    except Exception as e:
        print(f"❌ Could not check ezdxf version: {e}")
        return False

def main():
    """Run comprehensive comparison tests"""
    print("🧪 COMPREHENSIVE DIMENSION/TEXT ISSUE DIAGNOSIS")
    print("=" * 60)
    
    # Check ezdxf version first
    ezdxf_ok = check_ezdxf_version()
    
    results = {
        'ezdxf_version': ezdxf_ok,
        'llm_code': False,
        'backend_system': False,
        'cloud_deployment': False
    }
    
    # Test 1: Corrected LLM code
    results['llm_code'] = test_corrected_llm_code()
    
    # Test 2: Backend system
    results['backend_system'] = test_backend_system()
    
    # Test 3: Cloud deployment
    results['cloud_deployment'] = test_cloud_deployment()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 DIAGNOSIS SUMMARY:")
    print("=" * 60)
    print(f"ezdxf Version Check:     {'✅ PASS' if results['ezdxf_version'] else '❌ FAIL'}")
    print(f"LLM Code (Corrected):    {'✅ PASS' if results['llm_code'] else '❌ FAIL'}")
    print(f"Backend System:          {'✅ PASS' if results['backend_system'] else '❌ FAIL'}")
    print(f"Cloud Deployment:        {'✅ PASS' if results['cloud_deployment'] else '❌ FAIL'}")
    
    # Diagnosis
    print("\n🔍 DIAGNOSIS:")
    if results['llm_code'] and not results['backend_system']:
        print("❗ ISSUE: Your backend system is not generating dimensions properly")
        print("   The LLM-generated code works fine when corrected.")
        print("   Problem is in your internal DXF generation logic.")
        
    elif not results['llm_code'] and results['backend_system']:
        print("❗ ISSUE: LLM-generated code has problems")
        print("   Your backend system works fine.")
        print("   Problem is with the code generated by the LLM.")
        
    elif not results['llm_code'] and not results['backend_system']:
        print("❗ ISSUE: Both LLM code and backend system have problems")
        print("   This suggests fundamental ezdxf configuration issues.")
        
    elif results['llm_code'] and results['backend_system'] and not results['cloud_deployment']:
        print("❗ ISSUE: Cloud deployment problem")
        print("   Both LLM code and backend work locally.")
        print("   Problem is with deployment configuration or environment.")
        
    elif results['llm_code'] and results['backend_system'] and results['cloud_deployment']:
        print("🎉 ALL SYSTEMS WORKING!")
        print("   No dimension/text issues found in any component.")
        
    print("\n💡 RECOMMENDATIONS:")
    if not results['llm_code']:
        print("   1. Use the corrected LLM code patterns shown in Test 1")
        print("   2. Ensure dimension.render() is called")
        print("   3. Use proper dimension style configuration")
        
    if not results['backend_system']:
        print("   1. Fix internal DXF generation in app.py")
        print("   2. Ensure dimensions are generated in _generate_dimensions_for_entities()")
        print("   3. Add proper dimension style setup")
        
    if not results['cloud_deployment']:
        print("   1. Check deploy.py configuration")
        print("   2. Verify ezdxf is properly installed in cloud environment")
        print("   3. Check for environment-specific issues")
    
    print("=" * 60)

if __name__ == "__main__":
    main()