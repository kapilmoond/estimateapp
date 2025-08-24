#!/usr/bin/env python3
"""
Test the deployed backend to see if it's using the new internal system
"""

import requests
import json

def test_deployed_backend():
    """Test the deployed Google Cloud Function"""
    
    url = "https://dxf-generator-nrkslkdoza-uc.a.run.app"
    
    print("🧪 TESTING DEPLOYED BACKEND")
    print("=" * 50)
    
    # Test 1: Health check
    print("1️⃣ Testing health check...")
    try:
        response = requests.get(f"{url}/health", timeout=10)
        health_data = response.json()
        print(f"   Status: {response.status_code}")
        print(f"   Service: {health_data.get('service', 'Unknown')}")
        print(f"   AI Dependency: {health_data.get('ai_dependency', 'Unknown')}")
        print(f"   Generation Mode: {health_data.get('generation_mode', 'Unknown')}")
        
        if health_data.get('ai_dependency') is False:
            print("   ✅ SUCCESS: Backend reports NO AI dependency!")
        else:
            print("   ❌ ISSUE: Backend still shows AI dependency")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test 2: Generate DXF with the same request from debug report
    print("\n2️⃣ Testing DXF generation with same request...")
    
    test_request = {
        "title": "testing",
        "description": "make a single line with dimension line",
        "user_requirements": "line length is 2 m. make drawing for testing"
    }
    
    try:
        response = requests.post(
            f"{url}/generate-dxf-endpoint", 
            json=test_request,
            timeout=30
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            # Check if we got a DXF file
            content_type = response.headers.get('content-type', '')
            if 'dxf' in content_type.lower() or 'application' in content_type.lower():
                print("   ✅ SUCCESS: Got DXF file response!")
                print(f"   Content-Type: {content_type}")
                print(f"   File size: {len(response.content)} bytes")
                
                # Save the DXF file to verify
                with open("test_deployed_backend.dxf", "wb") as f:
                    f.write(response.content)
                print("   📁 DXF file saved as 'test_deployed_backend.dxf'")
                
            else:
                print(f"   ❌ Unexpected content type: {content_type}")
                print(f"   Response: {response.text[:200]}...")
        else:
            print(f"   ❌ ERROR: HTTP {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    # Test 3: Check debug info
    print("\n3️⃣ Testing debug info...")
    try:
        response = requests.get(f"{url}/get-debug-info", timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            debug_data = response.json()
            if debug_data.get('success'):
                debug_info = debug_data.get('debug_data', {})
                generation_method = debug_info.get('generation_method', 'Unknown')
                print(f"   Generation Method: {generation_method}")
                
                if 'Internal Logic' in generation_method:
                    print("   ✅ SUCCESS: Using internal logic!")
                elif 'AI' in generation_method:
                    print("   ❌ ISSUE: Still using AI logic")
                else:
                    print(f"   ❓ UNKNOWN: {generation_method}")
            else:
                print(f"   ❌ No debug data available")
        else:
            print(f"   ❌ ERROR: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    print("\n🎯 CONCLUSION:")
    print("If you see 'Internal Logic' and 'NO AI dependency', the new system is deployed!")
    print("If you see AI-related responses, we need to wait for deployment to complete.")

if __name__ == "__main__":
    test_deployed_backend()