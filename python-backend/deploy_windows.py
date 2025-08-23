#!/usr/bin/env python3
"""
Windows-specific Google Cloud Functions Deployment Script
Simplified deployment for Windows environments
"""

import subprocess
import sys
import os

def run_gcloud_command(cmd_args, description=""):
    """Run a gcloud command with proper Windows handling"""
    try:
        print(f"Running: gcloud {' '.join(cmd_args)}")
        
        # Use cmd.exe to run gcloud on Windows
        full_cmd = ['cmd', '/c', 'gcloud'] + cmd_args
        
        result = subprocess.run(
            full_cmd, 
            capture_output=True, 
            text=True, 
            encoding='utf-8',
            errors='replace'
        )
        
        if result.returncode == 0:
            if description:
                print(f"SUCCESS: {description}")
            if result.stdout.strip():
                print(result.stdout)
            return True, result.stdout
        else:
            print(f"ERROR: {description if description else 'Command failed'}")
            if result.stderr:
                print(f"Error details: {result.stderr}")
            return False, result.stderr
            
    except Exception as e:
        print(f"ERROR: Failed to run gcloud command: {e}")
        return False, str(e)

def check_prerequisites():
    """Check if all prerequisites are met"""
    print("Checking prerequisites...")
    
    # Check gcloud installation
    success, output = run_gcloud_command(['--version'], "Checking gcloud installation")
    if not success:
        print("\nGoogle Cloud CLI not found or not working properly.")
        print("Please ensure you're running this from a command prompt where 'gcloud' works.")
        print("You can test by running: gcloud --version")
        return False
    
    # Check authentication
    success, output = run_gcloud_command(['auth', 'list'], "Checking authentication")
    if not success or 'ACTIVE' not in output:
        print("\nNot authenticated with Google Cloud.")
        print("Please run: gcloud auth login")
        return False
    
    # Check project
    success, project_id = run_gcloud_command(['config', 'get-value', 'project'], "Getting project ID")
    if not success or not project_id.strip():
        print("\nNo Google Cloud project set.")
        print("Please run: gcloud config set project YOUR_PROJECT_ID")
        return False
    
    print(f"Using project: {project_id.strip()}")
    return True, project_id.strip()

def enable_apis(project_id):
    """Enable required APIs"""
    apis = [
        'cloudfunctions.googleapis.com',
        'cloudbuild.googleapis.com',
        'artifactregistry.googleapis.com'
    ]
    
    print("Enabling required APIs...")
    for api in apis:
        success, _ = run_gcloud_command([
            'services', 'enable', api, '--project', project_id
        ], f"Enabling {api}")
        
        if not success:
            print(f"Warning: Could not enable {api}")

def deploy_function(project_id, function_name='dxf-generator', region='us-central1'):
    """Deploy the function"""
    print(f"Deploying function '{function_name}' to region '{region}'...")
    
    # Check if requirements file exists
    if not os.path.exists('requirements-cloud.txt'):
        print("ERROR: requirements-cloud.txt not found")
        print("Please ensure you're running this from the python-backend directory")
        return False
    
    # Check if main.py exists
    if not os.path.exists('main.py'):
        print("ERROR: main.py not found")
        print("Please ensure you're running this from the python-backend directory")
        return False
    
    # Prepare deployment command
    cmd_args = [
        'functions', 'deploy', function_name,
        '--gen2',
        '--runtime', 'python311',
        '--region', region,
        '--source', '.',
        '--entry-point', 'health_check',
        '--trigger', 'http',
        '--allow-unauthenticated',
        '--memory', '512MB',
        '--timeout', '60s',
        '--max-instances', '10',
        '--requirements-file', 'requirements-cloud.txt',
        '--project', project_id
    ]
    
    # Add environment variables if GEMINI_API_KEY is set
    gemini_key = os.environ.get('GEMINI_API_KEY')
    if gemini_key:
        cmd_args.extend(['--set-env-vars', f'GEMINI_API_KEY={gemini_key}'])
        print("SUCCESS: GEMINI_API_KEY will be set in the function")
    else:
        print("WARNING: GEMINI_API_KEY not found in environment")
        print("AI-powered features will not work without the API key")
    
    # Deploy
    success, output = run_gcloud_command(cmd_args, "Deploying function")
    
    if success:
        print("SUCCESS: Function deployed successfully!")
        
        # Get function URL
        url_success, url_output = run_gcloud_command([
            'functions', 'describe', function_name,
            '--region', region,
            '--project', project_id,
            '--format', 'value(serviceConfig.uri)'
        ], "Getting function URL")
        
        if url_success and url_output.strip():
            function_url = url_output.strip()
            print(f"\nFunction URL: {function_url}")
            
            # Save URL to file
            try:
                with open('function_url.txt', 'w') as f:
                    f.write(function_url)
                print("Function URL saved to function_url.txt")
            except Exception as e:
                print(f"Could not save URL to file: {e}")
            
            return function_url
        else:
            print("WARNING: Could not retrieve function URL")
            return True
    else:
        print("ERROR: Deployment failed")
        return False

def main():
    """Main deployment function"""
    print("Google Cloud Functions Deployment for DXF Drawing Generator (Windows)")
    print("=" * 70)
    
    # Check prerequisites
    prereq_result = check_prerequisites()
    if not prereq_result:
        sys.exit(1)
    
    if isinstance(prereq_result, tuple):
        success, project_id = prereq_result
    else:
        print("ERROR: Could not determine project ID")
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
    print(f"Gemini API Key: {'Set' if os.environ.get('GEMINI_API_KEY') else 'Not set'}")
    
    confirm = input("\nProceed with deployment? (y/N): ").strip().lower()
    if confirm != 'y':
        print("Deployment cancelled")
        sys.exit(0)
    
    # Enable APIs
    enable_apis(project_id)
    
    # Deploy function
    result = deploy_function(project_id, function_name, region)
    
    if result:
        print("\n" + "=" * 70)
        print("DEPLOYMENT COMPLETE!")
        
        if isinstance(result, str):  # Function URL returned
            print(f"Function URL: {result}")
            print("\nAvailable endpoints:")
            print(f"- Health Check: {result}/health")
            print(f"- AI DXF Generation: {result}/generate-dxf-endpoint")
            print(f"- Hardcoded Test: {result}/test-hardcoded-dxf")
            print(f"- Legacy Parsing: {result}/parse-ai-drawing")
        
        print("\nNext steps:")
        print("1. Copy the function URL")
        print("2. Open your HSR Construction Estimator app")
        print("3. Go to 'View Project Data' → 'Backend Configuration'")
        print("4. Paste the URL and click 'Save & Test'")
        print("5. Start generating professional DXF files!")
    else:
        print("\nDeployment failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
