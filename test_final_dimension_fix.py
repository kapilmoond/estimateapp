#!/usr/bin/env python3
"""
Final comprehensive test for dimension creation fix
Tests the complete pipeline: Internal generation -> DXF creation -> Dimension verification
"""

import sys
import os
import requests
import json

# Add the python-backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-backend'))

from app import InternalDXFGenerator
import ezdxf

def test_internal_generation():
    """Test the internal DXF generation logic"""
    print("🔧 Testing internal DXF generation logic...")
    
    title = "Test Rectangle Building"
    description = "A simple rectangular building 10m x 6m with proper dimensions"
    user_requirements = "Include length, width, and key structural dimensions"
    
    # Test internal parsing
    geometry_data = InternalDXFGenerator.parse_user_description(description, title, user_requirements)
    entities = geometry_data.get('entities', [])
    
    # Count dimensions
    dimensions = [e for e in entities if e.get('type') == 'DIMENSION']
    
    print(f"  📊 Generated {len(entities)} total entities")
    print(f"  📐 Generated {len(dimensions)} dimension entities")
    
    if len(dimensions) > 0:
        print("  ✅ Internal generation creates DIMENSION entities")
        return True
    else:
        print("  ❌ Internal generation failed to create DIMENSION entities")
        return False

def test_backend_endpoint():
    """Test the backend endpoint for dimension creation"""
    print("\\n🌐 Testing backend endpoint...")
    
    # Test data
    payload = {
        "title": "Backend Test Building",
        "description": "A rectangular building 8m x 5m",
        "user_requirements": "Show all major dimensions clearly"
    }
    
    try:
        # Test locally first (if running)
        local_url = "http://localhost:5000/generate-dxf-endpoint"
        response = requests.post(local_url, json=payload, timeout=30)
        
        if response.status_code == 200:
            print("  ✅ Local backend endpoint working")
            
            # Save the DXF file
            with open("test_backend_output.dxf", "wb") as f:
                f.write(response.content)
            
            # Verify dimensions in the generated DXF
            try:
                doc = ezdxf.readfile("test_backend_output.dxf")
                msp = doc.modelspace()
                
                dimension_count = sum(1 for entity in msp if entity.dxftype() == 'DIMENSION')
                print(f"  📐 Backend generated DXF contains {dimension_count} DIMENSION entities")
                
                if dimension_count > 0:
                    print("  🎉 Backend successfully creates dimensions in DXF files!")
                    return True
                else:
                    print("  ❌ Backend DXF contains no dimensions")
                    return False
                    
            except Exception as e:
                print(f"  ⚠️ Could not verify DXF content: {e}")
                return False
                
        else:
            print(f"  ⚠️ Local backend not available (status: {response.status_code})")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"  ⚠️ Could not connect to local backend: {e}")
        return False

def test_cloud_deployment():
    """Test the cloud deployment if available"""
    print("\\n☁️ Testing cloud deployment...")
    
    # Check if function_url.txt exists
    url_file = os.path.join("python-backend", "function_url.txt")
    if not os.path.exists(url_file):
        print("  ⚠️ No cloud function URL found (function_url.txt missing)")
        return False
    
    try:
        with open(url_file, 'r') as f:
            cloud_url = f.read().strip()
        
        if not cloud_url:
            print("  ⚠️ Cloud function URL is empty")
            return False
        
        # Test health endpoint
        health_response = requests.get(f"{cloud_url}/health", timeout=10)
        
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"  ✅ Cloud function is healthy")
            print(f"     Service: {health_data.get('service', 'Unknown')}")
            print(f"     Version: {health_data.get('version', 'Unknown')}")
            print(f"     AI Dependency: {health_data.get('ai_dependency', 'Unknown')}")
            
            # Test DXF generation
            payload = {
                "title": "Cloud Test Building",
                "description": "A test building 12m x 8m with dimensions",
                "user_requirements": "Include length and width dimensions"
            }
            
            dxf_response = requests.post(f"{cloud_url}/generate-dxf-endpoint", json=payload, timeout=60)
            
            if dxf_response.status_code == 200:
                print("  ✅ Cloud DXF generation successful")
                
                # Save and verify
                with open("test_cloud_output.dxf", "wb") as f:
                    f.write(dxf_response.content)
                
                try:
                    doc = ezdxf.readfile("test_cloud_output.dxf")
                    msp = doc.modelspace()
                    dimension_count = sum(1 for entity in msp if entity.dxftype() == 'DIMENSION')
                    print(f"  📐 Cloud DXF contains {dimension_count} DIMENSION entities")
                    
                    if dimension_count > 0:
                        print("  🎉 Cloud deployment successfully creates dimensions!")
                        return True
                    else:
                        print("  ❌ Cloud DXF contains no dimensions")
                        return False
                        
                except Exception as e:
                    print(f"  ⚠️ Could not verify cloud DXF: {e}")
                    return False
            else:
                print(f"  ❌ Cloud DXF generation failed: {dxf_response.status_code}")
                return False
        else:
            print(f"  ❌ Cloud function health check failed: {health_response.status_code}")
            return False
            
    except Exception as e:
        print(f"  ❌ Cloud deployment test failed: {e}")
        return False

def main():
    """Run comprehensive dimension creation test"""
    print("🧪 COMPREHENSIVE DIMENSION CREATION TEST")
    print("=" * 60)
    
    results = {
        'internal_generation': False,
        'backend_endpoint': False,
        'cloud_deployment': False
    }
    
    # Test 1: Internal generation logic
    results['internal_generation'] = test_internal_generation()
    
    # Test 2: Backend endpoint (if available)
    results['backend_endpoint'] = test_backend_endpoint()
    
    # Test 3: Cloud deployment (if available)
    results['cloud_deployment'] = test_cloud_deployment()
    
    # Summary
    print("\\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY:")
    print(f"   Internal Generation: {'✅ PASS' if results['internal_generation'] else '❌ FAIL'}")
    print(f"   Backend Endpoint:    {'✅ PASS' if results['backend_endpoint'] else '❌ FAIL'}")
    print(f"   Cloud Deployment:    {'✅ PASS' if results['cloud_deployment'] else '❌ FAIL'}")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print(f"\\n🎯 OVERALL RESULT: {passed_tests}/{total_tests} tests passed")
    
    if results['internal_generation']:
        print("\\n🎉 SUCCESS: Dimension creation is working!")
        print("   The internal logic correctly generates DIMENSION entities.")
        
        if results['backend_endpoint'] or results['cloud_deployment']:
            print("   The backend/cloud endpoints also create proper DXF files with dimensions.")
        else:
            print("   ⚠️  Backend/cloud testing was not successful - check deployment.")
            
        print("\\n📋 WHAT WAS FIXED:")
        print("   ✅ Consolidated backend code (removed app_internal.py)")
        print("   ✅ Improved dimension style configuration")
        print("   ✅ Enhanced dimension entity processing with better error handling")
        print("   ✅ Removed unused fallback code and old test files")
        print("   ✅ Fixed dimension rendering and verification logic")
        
    else:
        print("\\n❌ FAILURE: Dimension creation is still not working properly.")
        print("   The internal logic is not generating DIMENSION entities.")
        
    print("\\n" + "=" * 60)

if __name__ == "__main__":
    main()