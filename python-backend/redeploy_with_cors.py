#!/usr/bin/env python3
"""
Quick redeploy script for Google Cloud Functions with CORS fixes
Run this after fixing CORS issues in main.py
"""

import subprocess
import sys
import os

def redeploy_function():
    """Redeploy the Google Cloud Function"""
    print("🚀 Redeploying Google Cloud Function with CORS fixes...")
    
    # Check if we're in the right directory
    if not os.path.exists('main.py'):
        print("❌ Error: Please run this script from the python-backend directory")
        print("   Current directory should contain main.py")
        sys.exit(1)
    
    # Get current project
    try:
        result = subprocess.run(['gcloud', 'config', 'get-value', 'project'], 
                               capture_output=True, text=True, shell=True)
        if result.returncode == 0 and result.stdout.strip():
            project_id = result.stdout.strip()
            print(f"📋 Current project: {project_id}")
        else:
            print("❌ No Google Cloud project set. Please run:")
            print("   gcloud config set project YOUR_PROJECT_ID")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error checking project: {e}")
        sys.exit(1)
    
    # Get function name from user
    function_name = input("Enter function name (default: dxf-generator): ").strip()
    if not function_name:
        function_name = "dxf-generator"
    
    # Get region from user
    region = input("Enter region (default: us-central1): ").strip()
    if not region:
        region = "us-central1"
    
    # Check for GEMINI_API_KEY
    gemini_key = os.environ.get('GEMINI_API_KEY')
    if not gemini_key:
        print("⚠️  WARNING: GEMINI_API_KEY not found in environment variables")
        print("   AI features will not work without this key")
        
        set_key = input("Do you want to set GEMINI_API_KEY now? (y/N): ").strip().lower()
        if set_key == 'y':
            gemini_key = input("Enter your Gemini API key: ").strip()
            if gemini_key:
                os.environ['GEMINI_API_KEY'] = gemini_key
                print("✅ GEMINI_API_KEY set for this deployment")
    
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
    
    # Add GEMINI_API_KEY if available
    if gemini_key:
        cmd.extend(['--set-env-vars', f'GEMINI_API_KEY={gemini_key}'])
    
    print(f"\n🔄 Deploying function '{function_name}' to region '{region}'...")
    print("This may take a few minutes...")
    
    try:
        # Run deployment
        result = subprocess.run(cmd, text=True, shell=True)
        
        if result.returncode == 0:
            print("\n✅ Function redeployed successfully!")
            
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
                print(f"\n🌐 Function URL: {function_url}")
                print(f"🧪 Test URL: {function_url}/health")
                print("\n📋 Next steps:")
                print("1. Copy the Function URL above")
                print("2. Go to your EstimateApp")
                print("3. Click 'Setup Backend' in Backend Configuration")
                print("4. Paste the URL and click 'Save & Test'")
                
                # Save URL to file
                with open('function_url.txt', 'w') as f:
                    f.write(function_url)
                print(f"\n💾 URL saved to function_url.txt")
                
                return True
            else:
                print("⚠️  Could not retrieve function URL, but deployment succeeded")
                return True
        else:
            print("\n❌ Deployment failed!")
            return False
            
    except Exception as e:
        print(f"\n❌ Deployment error: {e}")
        return False

if __name__ == "__main__":
    success = redeploy_function()
    if success:
        print("\n🎉 CORS fixes deployed! Your 'Failed to fetch' error should be resolved.")
    else:
        print("\n💥 Deployment failed. Please check the errors above.")
        sys.exit(1)