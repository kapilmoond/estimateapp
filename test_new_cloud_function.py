#!/usr/bin/env python3
"""
Test the newly deployed cloud function with dimension creation fixes
"""

import requests
import json
import time

def test_new_cloud_function():
    """Test the new cloud function with dimension fixes"""
    print("🌐 Testing NEW Cloud Function (dxf-generator-fixed)")
    print("=" * 60)
    
    # We'll need to get the URL once deployment completes
    # For now, let's check if the new function exists
    
    print("1. Checking for new function deployment...")
    
    # List functions to see if dxf-generator-fixed is deployed
    try:
        import subprocess
        result = subprocess.run([
            'gcloud', 'functions', 'list', 
            '--filter=name:dxf-generator-fixed',
            '--format=value(name,httpsTrigger.url)',
            '--project=micada-division'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 and result.stdout.strip():
            lines = result.stdout.strip().split('\n')
            if lines and lines[0]:
                parts = lines[0].split('\t')
                if len(parts) >= 2:
                    function_name = parts[0]
                    function_url = parts[1]
                    print(f"   ✅ Found function: {function_name}")
                    print(f"   🌐 URL: {function_url}")
                    
                    # Test the new function
                    return test_function_with_dimensions(function_url)
                else:
                    print("   ⚠️  Function found but no URL available yet")
                    return False
            else:
                print("   ⚠️  Function not deployed yet")
                return False
        else:
            print("   ⚠️  Could not list functions or function not found")
            return False
            
    except Exception as e:
        print(f"   ❌ Error checking functions: {e}")
        return False

def test_function_with_dimensions(function_url):
    """Test the function's dimension creation capability"""
    print(f"\n2. Testing dimension creation with URL: {function_url}")
    
    # Test health endpoint
    try:
        print("   Testing health endpoint...")
        health_response = requests.get(f"{function_url}/health", timeout=10)
        
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"   ✅ Health OK")
            print(f"      Service: {health_data.get('service', 'Unknown')}")
            print(f"      Version: {health_data.get('version', 'Unknown')}")
            print(f"      AI Dependency: {health_data.get('ai_dependency', 'Unknown')}")
            print(f"      Generation Mode: {health_data.get('generation_mode', 'Unknown')}")
        else:
            print(f"   ❌ Health check failed: {health_response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
        return False
    
    # Test dimension generation
    print("\n   Testing dimension generation...")
    test_payload = {
        "title": "NEW Function Test Building",
        "description": "A test building 10m x 6m with professional dimensions",
        "user_requirements": "Include length, width, and all major structural dimensions"
    }
    
    try:
        response = requests.post(
            f"{function_url}/generate-dxf-endpoint",
            json=test_payload,
            timeout=60
        )
        
        if response.status_code == 200:
            print(f"   ✅ DXF generation successful")
            
            # Save and verify the DXF
            with open("test_new_function_output.dxf", "wb") as f:
                f.write(response.content)
            
            # Verify dimensions
            try:
                import ezdxf
                doc = ezdxf.readfile("test_new_function_output.dxf")
                msp = doc.modelspace()
                
                # Count different entity types
                entity_counts = {}
                dimension_entities = []
                
                for entity in msp:
                    entity_type = entity.dxftype()
                    entity_counts[entity_type] = entity_counts.get(entity_type, 0) + 1
                    
                    if entity_type == 'DIMENSION':
                        dimension_entities.append(entity)
                
                print(f"   📊 DXF contains:")
                for entity_type, count in sorted(entity_counts.items()):
                    print(f"      {entity_type}: {count}")
                
                dimension_count = len(dimension_entities)
                print(f"\n   📐 DIMENSION entities: {dimension_count}")
                
                if dimension_count > 0:
                    print("   🎉 SUCCESS: NEW function creates dimensions!")
                    
                    # Show first dimension details
                    first_dim = dimension_entities[0]
                    print(f"   📋 First dimension details:")
                    print(f"      Layer: {first_dim.dxf.layer}")
                    print(f"      Style: {getattr(first_dim.dxf, 'dimstyle', 'Unknown')}")
                    print(f"      Type: {getattr(first_dim.dxf, 'dimtype', 'Unknown')}")
                    
                    return True
                else:
                    print("   ❌ No dimensions found in DXF")
                    return False
                    
            except Exception as verify_e:
                print(f"   ⚠️  Could not verify DXF: {verify_e}")
                return False
                
        else:
            print(f"   ❌ DXF generation failed: {response.status_code}")
            try:
                error_text = response.text
                print(f"      Error: {error_text}")
            except:
                pass
            return False
            
    except Exception as e:
        print(f"   ❌ Request error: {e}")
        return False

def wait_for_deployment():
    """Wait for deployment to complete and test"""
    print("⏳ Waiting for deployment to complete...")
    
    max_attempts = 20  # Wait up to 10 minutes
    attempt = 0
    
    while attempt < max_attempts:
        attempt += 1
        print(f"\n🔍 Attempt {attempt}/{max_attempts}")
        
        success = test_new_cloud_function()
        if success:
            return True
        
        if attempt < max_attempts:
            print("   ⏳ Waiting 30 seconds before next check...")
            time.sleep(30)
    
    print("\n⏰ Timeout waiting for deployment")
    return False

if __name__ == "__main__":
    success = wait_for_deployment()
    print("\n" + "=" * 60)
    if success:
        print("🎉 ALL TASKS COMPLETED SUCCESSFULLY!")
        print("   ✅ Dimension creation is working in cloud deployment")
        print("   ✅ End-to-end functionality verified")
    else:
        print("⏰ DEPLOYMENT STILL IN PROGRESS")
        print("   ℹ️  Check deployment status and test manually when ready")
    print("=" * 60)