#!/usr/bin/env python3
"""
Test script to verify the debug endpoint is working on the deployed backend
"""

import requests
import json

BACKEND_URL = "https://dxf-generator-nrkslkdoza-uc.a.run.app"

def test_health_endpoint():
    """Test the health endpoint"""
    print("=== TESTING HEALTH ENDPOINT ===")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=10)
        print(f"Status: {response.status_code}")
        if response.ok:
            data = response.json()
            print(f"Service: {data.get('service')}")
            print(f"Version: {data.get('version')}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_debug_endpoint():
    """Test the debug endpoint"""
    print("\n=== TESTING DEBUG ENDPOINT ===")
    try:
        response = requests.get(f"{BACKEND_URL}/get-debug-info", timeout=10)
        print(f"Status: {response.status_code}")
        if response.ok:
            data = response.json()
            print(f"Success: {data.get('success')}")
            if data.get('debug_data'):
                print("Debug data available!")
                debug_data = data['debug_data']
                print(f"Timestamp: {debug_data.get('timestamp')}")
                print(f"Has AI response: {'ai_response_raw' in debug_data}")
                print(f"Has parsed data: {'parsed_data' in debug_data}")
                print(f"Has backend logs: {'backend_logs' in debug_data}")
            else:
                print("No debug data available (expected for first run)")
            return True
        else:
            data = response.json()
            print(f"Expected response: {data.get('message')}")
            return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_ai_generation():
    """Test AI-powered DXF generation to populate debug data"""
    print("\n=== TESTING AI DXF GENERATION ===")
    try:
        payload = {
            "title": "Debug Test Drawing",
            "description": "A simple test drawing to verify debug system",
            "user_requirements": "Create a simple rectangular table with dimensions 1000x600x750mm"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/generate-dxf-endpoint", 
            json=payload,
            timeout=60
        )
        
        print(f"Status: {response.status_code}")
        if response.ok:
            print("DXF generation successful!")
            print(f"Content length: {len(response.content)} bytes")
            
            # Check debug headers
            debug_summary = response.headers.get('X-Debug-Summary')
            debug_details = response.headers.get('X-Debug-Details')
            
            if debug_summary:
                print("Debug summary found in headers:")
                print(json.dumps(json.loads(debug_summary), indent=2))
            
            if debug_details:
                print("Debug details found in headers:")
                print(json.dumps(json.loads(debug_details), indent=2))
            
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Testing Enhanced Debug System on Deployed Backend")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    
    # Test health
    health_ok = test_health_endpoint()
    
    # Test debug endpoint (should be empty initially)
    debug_ok = test_debug_endpoint()
    
    if health_ok:
        # Test AI generation to populate debug data
        ai_ok = test_ai_generation()
        
        if ai_ok:
            # Test debug endpoint again (should have data now)
            print("\n=== TESTING DEBUG ENDPOINT AFTER GENERATION ===")
            test_debug_endpoint()
    
    print("\n=== TEST COMPLETE ===")
    print("If all tests passed, the debug system is working correctly!")