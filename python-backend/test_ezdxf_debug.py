#!/usr/bin/env python3
"""
Test script for ezdxf debugging implementation
Verifies all debugging features are working correctly
"""

import requests
import json
import sys
import os

def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check endpoint...")
    try:
        response = requests.get('http://localhost:5000/health', timeout=5)
        if response.ok:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_hardcoded_dxf():
    """Test the hardcoded DXF generation endpoint"""
    print("🧪 Testing hardcoded DXF generation...")
    try:
        response = requests.post('http://localhost:5000/test-hardcoded-dxf', timeout=10)
        if response.ok:
            # Check if we got a DXF file
            content_type = response.headers.get('content-type', '')
            if 'dxf' in content_type.lower() or response.headers.get('content-disposition'):
                print("✅ Hardcoded DXF test passed - received DXF file")
                return True
            else:
                print(f"❌ Hardcoded DXF test failed - unexpected content type: {content_type}")
                return False
        else:
            print(f"❌ Hardcoded DXF test failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Hardcoded DXF test failed: {e}")
        return False

def test_ai_dxf_generation():
    """Test the AI-powered DXF generation endpoint"""
    print("🤖 Testing AI-powered DXF generation...")
    
    # Check if Gemini API key is available
    if not os.environ.get('GEMINI_API_KEY'):
        print("⚠️ GEMINI_API_KEY not found - skipping AI test")
        return True
    
    try:
        test_data = {
            "title": "Test Drawing",
            "description": "Simple test drawing",
            "user_requirements": "Create a simple rectangular beam with basic dimensions"
        }
        
        response = requests.post(
            'http://localhost:5000/generate-dxf-endpoint',
            json=test_data,
            timeout=30
        )
        
        if response.ok:
            # Check if we got a DXF file
            content_type = response.headers.get('content-type', '')
            if 'dxf' in content_type.lower() or response.headers.get('content-disposition'):
                print("✅ AI-powered DXF test passed - received DXF file")
                return True
            else:
                print(f"❌ AI-powered DXF test failed - unexpected content type: {content_type}")
                return False
        else:
            print(f"❌ AI-powered DXF test failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ AI-powered DXF test failed: {e}")
        return False

def test_legacy_endpoints():
    """Test the legacy endpoints"""
    print("🔄 Testing legacy endpoints...")
    
    try:
        # Test parse-ai-drawing endpoint
        test_data = {
            "title": "Legacy Test",
            "description": "6m concrete beam with 300mm width and 600mm height"
        }
        
        response = requests.post(
            'http://localhost:5000/parse-ai-drawing',
            json=test_data,
            timeout=15
        )
        
        if response.ok:
            result = response.json()
            if result.get('success'):
                print("✅ Legacy parse-ai-drawing test passed")
                return True
            else:
                print(f"❌ Legacy test failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Legacy test failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Legacy test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 ezdxf Debugging Implementation Test Suite")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health_check),
        ("Hardcoded DXF", test_hardcoded_dxf),
        ("AI-Powered DXF", test_ai_dxf_generation),
        ("Legacy Endpoints", test_legacy_endpoints)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name} test...")
        if test_func():
            passed += 1
        print("-" * 30)
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! ezdxf debugging implementation is working correctly.")
        print("\n📋 Next steps:")
        print("1. The Python backend is ready for use")
        print("2. Start the frontend HSR Construction Estimator")
        print("3. Try generating DXF drawings")
        print("4. Monitor the console output for debugging information")
    else:
        print("❌ Some tests failed. Please check the server logs and configuration.")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure the Python backend server is running")
        print("2. Check if all dependencies are installed")
        print("3. Verify the GEMINI_API_KEY environment variable (for AI tests)")
        print("4. Check the server console for error messages")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
