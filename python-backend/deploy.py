#!/usr/bin/env python3
"""
Google Cloud Functions Deployment Script
Automates the deployment of the DXF Drawing Generator to Google Cloud Functions
"""

import subprocess
import sys
import os
import json

def check_gcloud_installed():
    """Check if Google Cloud CLI is installed"""
    # Try different ways to find gcloud on Windows
    gcloud_commands = ['gcloud', 'gcloud.cmd']

    for cmd in gcloud_commands:
        try:
            result = subprocess.run([cmd, '--version'], capture_output=True, text=True, shell=True)
            if result.returncode == 0:
                print("SUCCESS: Google Cloud CLI is installed")
                print(result.stdout.split('\n')[0])  # Show version
                return True
        except FileNotFoundError:
            continue

    # If direct commands fail, try with full path detection
    try:
        # Try to find gcloud in common Windows locations
        import shutil
        gcloud_path = shutil.which('gcloud')
        if gcloud_path:
            result = subprocess.run([gcloud_path, '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print("SUCCESS: Google Cloud CLI is installed")
                print(result.stdout.split('\n')[0])
                return True
    except Exception:
        pass

    print("ERROR: Google Cloud CLI not found in PATH")
    print("Note: You may have gcloud installed but not in your Python environment's PATH")
    print("Try running this script from the Google Cloud SDK Shell instead")
    return False

def check_authentication():
    """Check if user is authenticated with Google Cloud"""
    try:
        result = subprocess.run(['gcloud', 'auth', 'list'], capture_output=True, text=True, shell=True)
        if 'ACTIVE' in result.stdout:
            print("SUCCESS: Authenticated with Google Cloud")
            return True
        else:
            print("WARNING: Not authenticated with Google Cloud")
            return False
    except Exception as e:
        print(f"ERROR: Could not check authentication: {e}")
        return False

def get_project_id():
    """Get the current Google Cloud project ID"""
    try:
        result = subprocess.run(['gcloud', 'config', 'get-value', 'project'], capture_output=True, text=True, shell=True)
        if result.returncode == 0 and result.stdout.strip():
            project_id = result.stdout.strip()
            print(f"Current project: {project_id}")
            return project_id
        else:
            print("WARNING: No project set")
            return None
    except Exception as e:
        print(f"ERROR: Could not get project ID: {e}")
        return None

def enable_required_apis(project_id):
    """Enable required Google Cloud APIs"""
    apis = [
        'cloudfunctions.googleapis.com',
        'cloudbuild.googleapis.com',
        'artifactregistry.googleapis.com'
    ]
    
    print("Enabling required APIs...")
    for api in apis:
        try:
            result = subprocess.run([
                'gcloud', 'services', 'enable', api,
                '--project', project_id
            ], capture_output=True, text=True, shell=True)
            
            if result.returncode == 0:
                print(f"SUCCESS: Enabled {api}")
            else:
                print(f"WARNING: Could not enable {api}: {result.stderr}")
        except Exception as e:
            print(f"ERROR: Failed to enable {api}: {e}")

def deploy_function(project_id, function_name, region='us-central1'):
    """Deploy the function to Google Cloud Functions"""
    print(f"Deploying function '{function_name}' to region '{region}'...")
    
    # Prepare deployment command
    cmd = [
        'gcloud', 'functions', 'deploy', function_name,
        '--gen2',
        '--runtime', 'python311',
        '--region', region,
        '--source', '.',
        '--entry-point', 'health_check',
        '--trigger-http',
        '--allow-unauthenticated',
        '--memory', '512MB',
        '--timeout', '60s',
        '--max-instances', '10',
        '--project', project_id
    ]
    
    # Add environment variables if GEMINI_API_KEY is set
    gemini_key = os.environ.get('GEMINI_API_KEY')
    if gemini_key:
        cmd.extend(['--set-env-vars', f'GEMINI_API_KEY={gemini_key}'])
        print("SUCCESS: GEMINI_API_KEY will be set in the function")
    else:
        print("WARNING: GEMINI_API_KEY not found in environment")
        print("AI-powered features will not work without the API key")
    
    try:
        print("Running deployment command...")
        print(" ".join(cmd))
        
        result = subprocess.run(cmd, text=True, shell=True)
        
        if result.returncode == 0:
            print("SUCCESS: Function deployed successfully!")
            
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
                print(f"Function URL: {function_url}")
                
                # Save URL to file for frontend integration
                with open('function_url.txt', 'w') as f:
                    f.write(function_url)
                print("Function URL saved to function_url.txt")
                
                return function_url
            else:
                print("WARNING: Could not retrieve function URL")
                return None
        else:
            print("ERROR: Deployment failed")
            return None
            
    except Exception as e:
        print(f"ERROR: Deployment failed: {e}")
        return None

def test_deployment(function_url):
    """Test the deployed function"""
    if not function_url:
        print("Cannot test deployment - no function URL")
        return False
    
    try:
        import requests
        
        print("Testing deployed function...")
        
        # Test health endpoint
        health_url = f"{function_url}/health"
        response = requests.get(health_url, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("SUCCESS: Health check passed")
            print(f"Service: {result.get('service', 'Unknown')}")
            print(f"Gemini Available: {result.get('gemini_available', False)}")
            return True
        else:
            print(f"ERROR: Health check failed with status {response.status_code}")
            return False
            
    except ImportError:
        print("WARNING: requests library not available for testing")
        print("You can test manually by visiting the function URL")
        return True
    except Exception as e:
        print(f"ERROR: Testing failed: {e}")
        return False

def main():
    """Main deployment function"""
    print("Google Cloud Functions Deployment for DXF Drawing Generator")
    print("=" * 60)
    
    # Check prerequisites
    if not check_gcloud_installed():
        print("\nPlease install Google Cloud CLI:")
        print("https://cloud.google.com/sdk/docs/install")
        sys.exit(1)
    
    if not check_authentication():
        print("\nPlease authenticate with Google Cloud:")
        print("gcloud auth login")
        sys.exit(1)
    
    project_id = get_project_id()
    if not project_id:
        print("\nPlease set a Google Cloud project:")
        print("gcloud config set project YOUR_PROJECT_ID")
        sys.exit(1)
    
    # Get function name
    function_name = input("\nEnter function name (default: dxf-generator): ").strip()
    if not function_name:
        function_name = "dxf-generator"
    
    # Get region
    region = input("Enter region (default: us-central1): ").strip()
    if not region:
        region = "us-central1"
    
    print(f"\nDeployment Configuration:")
    print(f"Project ID: {project_id}")
    print(f"Function Name: {function_name}")
    print(f"Region: {region}")
    
    confirm = input("\nProceed with deployment? (y/N): ").strip().lower()
    if confirm != 'y':
        print("Deployment cancelled")
        sys.exit(0)
    
    # Enable APIs
    enable_required_apis(project_id)
    
    # Deploy function
    function_url = deploy_function(project_id, function_name, region)
    
    if function_url:
        # Test deployment
        test_deployment(function_url)
        
        print("\n" + "=" * 60)
        print("DEPLOYMENT COMPLETE!")
        print(f"Function URL: {function_url}")
        print("\nAvailable endpoints:")
        print(f"- Health Check: {function_url}/health")
        print(f"- AI DXF Generation: {function_url}/generate-dxf-endpoint")
        print(f"- Hardcoded Test: {function_url}/test-hardcoded-dxf")
        print(f"- Legacy Parsing: {function_url}/parse-ai-drawing")
        print("\nUpdate your frontend DXF service to use this URL!")
    else:
        print("\nDeployment failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
