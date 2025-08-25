#!/usr/bin/env python3
"""
Test the current cloud function to see if dimension creation works
"""

import requests
import json

def test_current_cloud_function():
    """Test the current deployed cloud function"""
    print("🌐 Testing Current Cloud Function")
    print("=" * 50)
    
    base_url = "https://dxf-generator-nrkslkdoza-uc.a.run.app"
    
    # Test health first
    print("1. Testing health endpoint...")
    try:
        health_response = requests.get(f"{base_url}/health", timeout=10)
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"   ✅ Health OK")
            print(f"   Service: {health_data.get('service', 'Unknown')}")
            print(f"   Version: {health_data.get('version', 'Unknown')}")
            print(f"   AI Dependency: {health_data.get('ai_dependency', 'Unknown')}")
        else:
            print(f"   ❌ Health check failed: {health_response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
        return False
    
    # Test dimension generation
    print("\n2. Testing dimension generation...")
    test_payload = {
        "title": "Cloud Test Building",
        "description": "A rectangular building 8m x 5m with dimensions",
        "user_requirements": "Include length and width dimensions clearly"
    }
    
    try:
        # Try the new endpoint first
        print("   Trying /generate-dxf-endpoint...")
        response = requests.post(
            f"{base_url}/generate-dxf-endpoint",
            json=test_payload,
            timeout=60
        )
        
        if response.status_code == 200:
            print(f"   ✅ DXF generation successful")
            
            # Save and check the DXF
            with open("test_cloud_current.dxf", "wb") as f:
                f.write(response.content)
            
            # Try to verify dimensions
            try:
                import ezdxf
                doc = ezdxf.readfile("test_cloud_current.dxf")
                msp = doc.modelspace()
                dimension_count = sum(1 for entity in msp if entity.dxftype() == 'DIMENSION')
                
                print(f"   📐 DXF contains {dimension_count} DIMENSION entities")
                
                if dimension_count > 0:
                    print("   🎉 SUCCESS: Cloud function creates dimensions!")
                    return True
                else:
                    print("   ⚠️  Cloud function doesn't create dimensions yet")
                    return False
                    
            except Exception as verify_e:
                print(f"   ⚠️  Could not verify DXF: {verify_e}")
                return False
                
        else:
            print(f"   ❌ DXF generation failed: {response.status_code}")
            try:
                error_text = response.text
                print(f"   Error: {error_text}")
            except:
                pass
            return False
            
    except Exception as e:
        print(f"   ❌ Request error: {e}")
        return False

if __name__ == "__main__":
    success = test_current_cloud_function()
    print("\n" + "=" * 50)
    if success:
        print("🎉 CURRENT CLOUD FUNCTION CREATES DIMENSIONS!")
    else:
        print("⏳ WAITING FOR UPDATED DEPLOYMENT...")
    print("=" * 50)