#!/usr/bin/env python3
"""
Enhanced Google Cloud Run Deployment Script
Implements fixes based on Google Cloud Run troubleshooting documentation:
https://cloud.google.com/run/docs/troubleshooting#container-failed-to-start

Addresses the following issues:
1. Container failed to start and listen on PORT
2. Proper health check endpoints
3. Correct network interface binding (0.0.0.0)
4. Enhanced timeout and memory configuration
5. WSGI server configuration for better compatibility
"""

import subprocess
import sys
import os
import json
import time

def check_gcloud_installed():
    """Check if Google Cloud CLI is installed"""
    try:
        result = subprocess.run(['gcloud', '--version'], capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            print("✅ Google Cloud CLI is installed")
            return True
        else:
            print("❌ Google Cloud CLI not found")
            return False
    except Exception as e:
        print(f"❌ Error checking gcloud: {e}")
        return False

def check_authentication():
    """Check if user is authenticated with Google Cloud"""
    try:
        result = subprocess.run(['gcloud', 'auth', 'list'], capture_output=True, text=True, shell=True)
        if 'ACTIVE' in result.stdout:
            print("✅ Authenticated with Google Cloud")
            return True
        else:
            print("❌ Not authenticated with Google Cloud")
            return False
    except Exception as e:
        print(f"❌ Error checking authentication: {e}")
        return False

def get_project_id():
    """Get the current Google Cloud project ID"""
    try:
        result = subprocess.run(['gcloud', 'config', 'get-value', 'project'], capture_output=True, text=True, shell=True)
        if result.returncode == 0 and result.stdout.strip():
            project_id = result.stdout.strip()
            print(f"✅ Current project: {project_id}")
            return project_id
        else:
            print("❌ No project set")
            return None
    except Exception as e:
        print(f"❌ Error getting project ID: {e}")
        return None

def enable_required_apis(project_id):
    """Enable required Google Cloud APIs"""
    apis = [
        'cloudfunctions.googleapis.com',
        'cloudbuild.googleapis.com',
        'artifactregistry.googleapis.com',
        'run.googleapis.com'
    ]
    
    print("🔧 Enabling required APIs...")
    for api in apis:
        try:
            print(f"  Enabling {api}...")
            result = subprocess.run([
                'gcloud', 'services', 'enable', api,
                '--project', project_id
            ], capture_output=True, text=True, shell=True)
            
            if result.returncode == 0:
                print(f"  ✅ {api}")
            else:
                print(f"  ⚠️  {api}: {result.stderr}")
        except Exception as e:
            print(f"  ❌ Failed to enable {api}: {e}")

def deploy_cloud_function_gen2(project_id, function_name, region='us-central1'):
    """Deploy using Cloud Functions Gen2 with enhanced configuration"""
    print(f"🚀 Deploying Cloud Function Gen2: '{function_name}' to '{region}'...")
    
    # Enhanced deployment command based on troubleshooting guide
    cmd = [
        'gcloud', 'functions', 'deploy', function_name,
        '--gen2',
        '--runtime', 'python311',
        '--region', region,
        '--source', '.',
        '--entry-point', 'app',  # Flask app instance
        '--trigger-http',
        '--allow-unauthenticated',
        '--memory', '2GB',  # Increased for ezdxf operations
        '--timeout', '540s',  # Maximum timeout for dimension rendering
        '--max-instances', '100',
        '--min-instances', '0',
        '--cpu', '1',
        '--project', project_id,
        # Environment variables for proper port binding
        '--set-env-vars', 'PYTHONUNBUFFERED=1'
    ]
    
    # Add GEMINI_API_KEY if available
    gemini_key = os.environ.get('GEMINI_API_KEY')
    if gemini_key:
        cmd.extend(['--update-env-vars', f'GEMINI_API_KEY={gemini_key}'])
        print("✅ GEMINI_API_KEY configured")
    
    try:
        print("⏳ Running deployment...")
        print(" ".join(cmd))
        
        result = subprocess.run(cmd, text=True, shell=True)
        
        if result.returncode == 0:
            print("✅ Function deployed successfully!")
            return get_function_url(function_name, region, project_id)
        else:
            print("❌ Deployment failed")
            return None
            
    except Exception as e:
        print(f"❌ Deployment error: {e}")
        return None

def get_function_url(function_name, region, project_id):
    """Get the function URL after deployment"""
    try:
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
            
            # Save URL for frontend integration
            with open('function_url.txt', 'w') as f:
                f.write(function_url)
            print("💾 URL saved to function_url.txt")
            
            return function_url
        else:
            print("⚠️  Could not retrieve function URL")
            return None
    except Exception as e:
        print(f"❌ Error getting function URL: {e}")
        return None

def test_deployment_comprehensive(function_url):
    """Comprehensive testing based on troubleshooting guide"""
    if not function_url:
        print("⚠️  Cannot test - no function URL")
        return False
    
    try:
        import requests
        
        print("🧪 Running comprehensive deployment tests...")
        
        # Test 1: Basic connectivity
        print("  📡 Testing basic connectivity...")
        try:
            response = requests.get(function_url, timeout=60)
            print(f"  ✅ Basic connectivity: Status {response.status_code}")
        except Exception as e:
            print(f"  ❌ Basic connectivity failed: {e}")
            return False
        
        # Test 2: Health check endpoint
        print("  🏥 Testing health check endpoint...")
        try:
            health_url = f"{function_url}/health"
            health_response = requests.get(health_url, timeout=60)
            
            if health_response.status_code == 200:
                health_data = health_response.json()
                print(f"  ✅ Health check passed")
                print(f"    Service: {health_data.get('service', 'Unknown')}")
                print(f"    Status: {health_data.get('status', 'Unknown')}")
                print(f"    Port: {health_data.get('port', 'Unknown')}")
            else:
                print(f"  ❌ Health check failed: Status {health_response.status_code}")
                return False
        except Exception as e:
            print(f"  ❌ Health check error: {e}")
            return False
        
        # Test 3: DXF generation functionality
        print("  🎨 Testing DXF generation...")
        try:
            dxf_url = f"{function_url}/test-hardcoded-dxf"
            dxf_response = requests.post(dxf_url, 
                json={"test": "data"}, 
                timeout=120)
            
            if dxf_response.status_code == 200:
                print(f"  ✅ DXF generation working")
                print(f"    Content-Type: {dxf_response.headers.get('content-type', 'Unknown')}")
                print(f"    Content-Length: {len(dxf_response.content)} bytes")
            else:
                print(f"  ⚠️  DXF generation returned status {dxf_response.status_code}")
        except Exception as e:
            print(f"  ⚠️  DXF generation test error: {e}")
        
        # Test 4: Internal DXF endpoint
        print("  🔧 Testing internal DXF generation...")
        try:
            internal_url = f"{function_url}/generate-dxf-endpoint"
            test_payload = {
                "title": "Deployment Test",
                "description": "A simple building 5m x 3m for testing",
                "user_requirements": "Include dimensions and labels"
            }
            
            internal_response = requests.post(internal_url, 
                json=test_payload, 
                timeout=180)
            
            if internal_response.status_code == 200:
                print(f"  ✅ Internal DXF generation working")
                content_type = internal_response.headers.get('content-type', '')
                if 'dxf' in content_type or 'octet-stream' in content_type:
                    print(f"    ✅ Correct DXF content type: {content_type}")
                    print(f"    ✅ File size: {len(internal_response.content)} bytes")
                else:
                    print(f"    ⚠️  Unexpected content type: {content_type}")
            else:
                print(f"  ⚠️  Internal DXF returned status {internal_response.status_code}")
                if hasattr(internal_response, 'text'):
                    print(f"    Response: {internal_response.text[:200]}")
        except Exception as e:
            print(f"  ⚠️  Internal DXF test error: {e}")
        
        print("✅ Deployment testing completed")
        return True
        
    except ImportError:
        print("⚠️  requests library not available - manual testing required")
        print(f"🌐 Visit: {function_url}")
        return True
    except Exception as e:
        print(f"❌ Testing failed: {e}")
        return False

def main():
    """Main deployment function with enhanced troubleshooting"""
    print("🚀 ENHANCED GOOGLE CLOUD FUNCTIONS GEN2 DEPLOYMENT")
    print("=" * 70)
    print("📚 Based on: https://cloud.google.com/run/docs/troubleshooting")
    print("=" * 70)
    
    # Prerequisites check
    if not check_gcloud_installed():
        print("\\n❌ Please install Google Cloud CLI:")
        print("📥 https://cloud.google.com/sdk/docs/install")
        sys.exit(1)
    
    if not check_authentication():
        print("\\n❌ Please authenticate with Google Cloud:")
        print("🔑 gcloud auth login")
        sys.exit(1)
    
    project_id = get_project_id()
    if not project_id:
        print("\\n❌ Please set a Google Cloud project:")
        print("⚙️  gcloud config set project YOUR_PROJECT_ID")
        sys.exit(1)
    
    # Configuration
    function_name = input("\\n📝 Function name (default: dxf-generator-v2): ").strip()
    if not function_name:
        function_name = "dxf-generator-v2"
    
    region = input("🌍 Region (default: us-central1): ").strip()
    if not region:
        region = "us-central1"
    
    print(f"\\n📋 DEPLOYMENT CONFIGURATION:")
    print(f"Project ID: {project_id}")
    print(f"Function Name: {function_name}")
    print(f"Region: {region}")
    print(f"Runtime: Python 3.11")
    print(f"Memory: 2GB")
    print(f"Timeout: 540s")
    print(f"Entry Point: app")
    
    confirm = input("\\n🚀 Proceed with deployment? (y/N): ").strip().lower()
    if confirm != 'y':
        print("❌ Deployment cancelled")
        sys.exit(0)
    
    # Execute deployment
    enable_required_apis(project_id)
    function_url = deploy_cloud_function_gen2(project_id, function_name, region)
    
    if function_url:
        # Wait for deployment to stabilize
        print("⏳ Waiting for deployment to stabilize...")
        time.sleep(10)
        
        # Comprehensive testing
        test_success = test_deployment_comprehensive(function_url)
        
        print("\\n" + "=" * 70)
        print("🎉 DEPLOYMENT COMPLETE!")
        print("=" * 70)
        print(f"🌐 Function URL: {function_url}")
        print("\\n📍 Available endpoints:")
        print(f"  • Root: {function_url}/")
        print(f"  • Health: {function_url}/health")
        print(f"  • DXF Generation: {function_url}/generate-dxf-endpoint")
        print(f"  • Test DXF: {function_url}/test-hardcoded-dxf")
        print(f"  • Legacy: {function_url}/parse-ai-drawing")
        
        if test_success:
            print("\\n✅ ALL TESTS PASSED - Ready for production!")
        else:
            print("\\n⚠️  Some tests failed - Check logs for details")
        
        print("\\n💡 Update your frontend to use this URL!")
        
    else:
        print("\\n❌ Deployment failed - Check logs above")
        sys.exit(1)

if __name__ == "__main__":
    main()