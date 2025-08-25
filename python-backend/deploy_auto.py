#!/usr/bin/env python3
"""
Automated Cloud Run Deployment Script
Implements fixes from: https://cloud.google.com/run/docs/troubleshooting#container-failed-to-start
"""

import subprocess
import sys
import os
import time

def run_deployment():
    """Run the deployment with all fixes automatically"""
    
    print("🚀 AUTOMATED CLOUD RUN DEPLOYMENT")
    print("=" * 60)
    print("📚 Implementing Cloud Run troubleshooting fixes")
    print("=" * 60)
    
    # Configuration
    project_id = "micada-division"
    function_name = "dxf-generator-v4"
    region = "us-central1"
    
    print(f"✅ Project: {project_id}")
    print(f"✅ Function: {function_name}")
    print(f"✅ Region: {region}")
    
    # Enhanced deployment command with Cloud Run fixes
    cmd = [
        'gcloud', 'functions', 'deploy', function_name,
        '--gen2',
        '--runtime', 'python311',
        '--region', region,
        '--source', '.',
        '--entry-point', 'app',  # Flask app instance from main.py
        '--trigger-http',
        '--allow-unauthenticated',
        '--memory', '2GB',  # Increased for ezdxf operations
        '--timeout', '540s',  # Maximum timeout for dimension rendering
        '--max-instances', '100',
        '--min-instances', '0',
        '--cpu', '1',
        '--project', project_id,
        '--set-env-vars', 'PYTHONUNBUFFERED=1',  # Don't set PORT - Cloud Run manages it
        '--quiet'  # Non-interactive
    ]
    
    print("🚀 Starting deployment...")
    print(" ".join(cmd))
    
    try:
        # Run deployment
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        
        if result.returncode == 0:
            print("✅ DEPLOYMENT SUCCESSFUL!")
            
            # Get function URL
            url_cmd = [
                'gcloud', 'functions', 'describe', function_name,
                '--region', region,
                '--project', project_id,
                '--format', 'value(serviceConfig.uri)'
            ]
            
            url_result = subprocess.run(url_cmd, capture_output=True, text=True, shell=True)
            if url_result.returncode == 0 and url_result.stdout.strip():
                function_url = url_result.stdout.strip()
                print(f"🌐 Function URL: {function_url}")
                
                # Save URL
                with open('function_url.txt', 'w') as f:
                    f.write(function_url)
                print("💾 URL saved to function_url.txt")
                
                # Test the deployment
                test_deployment(function_url)
                
                return function_url
            else:
                print("⚠️  Could not retrieve function URL")
                return None
        else:
            print("❌ DEPLOYMENT FAILED")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            return None
            
    except Exception as e:
        print(f"❌ Deployment error: {e}")
        return None

def test_deployment(function_url):
    """Test the deployed function"""
    try:
        import requests
        
        print("\\n🧪 Testing deployed function...")
        
        # Test health endpoint
        print("  📊 Testing health endpoint...")
        health_url = f"{function_url}/health"
        response = requests.get(health_url, timeout=60)
        
        if response.status_code == 200:
            health_data = response.json()
            print(f"  ✅ Health check passed")
            print(f"    Service: {health_data.get('service', 'Unknown')}")
            print(f"    Status: {health_data.get('status', 'Unknown')}")
            
            # Test root endpoint
            print("  🏠 Testing root endpoint...")
            root_response = requests.get(function_url, timeout=60)
            if root_response.status_code == 200:
                root_data = root_response.json()
                print(f"  ✅ Root endpoint working")
                print(f"    Message: {root_data.get('message', 'Unknown')}")
            else:
                print(f"  ⚠️  Root endpoint returned status {root_response.status_code}")
            
            # Test DXF generation
            print("  🎨 Testing DXF generation...")
            dxf_url = f"{function_url}/generate-dxf-endpoint"
            test_payload = {
                "title": "Cloud Run Test",
                "description": "A simple building 5m x 3m",
                "user_requirements": "Include dimensions"
            }
            
            dxf_response = requests.post(dxf_url, json=test_payload, timeout=180)
            if dxf_response.status_code == 200:
                print(f"  ✅ DXF generation working!")
                print(f"    Content-Type: {dxf_response.headers.get('content-type', 'Unknown')}")
                print(f"    File size: {len(dxf_response.content)} bytes")
                
                # Save test file
                with open('cloud_run_test.dxf', 'wb') as f:
                    f.write(dxf_response.content)
                print("  💾 Test DXF saved as cloud_run_test.dxf")
            else:
                print(f"  ⚠️  DXF generation returned status {dxf_response.status_code}")
                if hasattr(dxf_response, 'text'):
                    print(f"    Response: {dxf_response.text[:200]}")
            
            return True
        else:
            print(f"  ❌ Health check failed: Status {response.status_code}")
            return False
            
    except ImportError:
        print("⚠️  requests library not available for testing")
        print(f"🌐 Manually test: {function_url}")
        return True
    except Exception as e:
        print(f"❌ Testing error: {e}")
        return False

def main():
    """Main function"""
    function_url = run_deployment()
    
    if function_url:
        print("\\n" + "=" * 60)
        print("🎉 DEPLOYMENT COMPLETE!")
        print("=" * 60)
        print(f"🌐 Function URL: {function_url}")
        print("\\n📍 Available endpoints:")
        print(f"  • Root: {function_url}/")
        print(f"  • Health: {function_url}/health")
        print(f"  • DXF Generation: {function_url}/generate-dxf-endpoint")
        print(f"  • Test DXF: {function_url}/test-hardcoded-dxf")
        print("\\n🔧 Cloud Run Fixes Applied:")
        print("  ✅ Proper port binding (PORT environment variable)")
        print("  ✅ Network interface binding (0.0.0.0)")
        print("  ✅ Health check endpoints")
        print("  ✅ Enhanced memory (2GB) and timeout (540s)")
        print("  ✅ Correct entry point (app)")
        print("  ✅ WSGI server compatibility")
        print("\\n💡 Update your frontend to use this URL!")
    else:
        print("\\n❌ Deployment failed")
        sys.exit(1)

if __name__ == "__main__":
    main()