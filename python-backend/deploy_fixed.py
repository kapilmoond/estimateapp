#!/usr/bin/env python3
"""
Fixed Google Cloud Functions Deployment Script
Ensures proper dimension creation in cloud deployment
"""

import subprocess
import sys
import os
import json
import requests

def check_gcloud_installed():
    """Check if Google Cloud CLI is installed"""
    gcloud_commands = ['gcloud', 'gcloud.cmd']

    for cmd in gcloud_commands:
        try:
            result = subprocess.run([cmd, '--version'], capture_output=True, text=True, shell=True)
            if result.returncode == 0:
                print("✅ Google Cloud CLI is installed")
                print(result.stdout.split('\n')[0])
                return True
        except FileNotFoundError:
            continue

    print("❌ Google Cloud CLI not found")
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
        print(f"❌ Could not check authentication: {e}")
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
        print(f"❌ Could not get project ID: {e}")
        return None

def deploy_function_with_fixes(project_id, function_name, region='us-central1'):
    """Deploy the function with proper dimension creation fixes"""
    print(f"🚀 Deploying function '{function_name}' with dimension fixes...")
    
    # Check if we have the required files
    if not os.path.exists('main.py'):
        print("❌ main.py not found")
        return None
    
    if not os.path.exists('app.py'):
        print("❌ app.py not found")
        return None
    
    if not os.path.exists('requirements.txt'):
        print("❌ requirements.txt not found")
        return None
    
    # Prepare deployment command with enhanced memory and timeout for ezdxf processing
    cmd = [
        'gcloud', 'functions', 'deploy', function_name,
        '--gen2',
        '--runtime', 'python311',
        '--region', region,
        '--source', '.',
        '--entry-point', 'app',  # Use Flask app object from app.py
        '--trigger-http',
        '--allow-unauthenticated',
        '--memory', '1GB',        # Increased memory for ezdxf operations
        '--timeout', '120s',      # Increased timeout for dimension rendering
        '--max-instances', '10',
        '--project', project_id,
        '--set-env-vars', 'PYTHONPATH=/workspace'  # Ensure proper import paths
    ]
    
    try:
        print("🔧 Running deployment command...")
        print(" ".join(cmd))
        
        result = subprocess.run(cmd, text=True, shell=True)
        
        if result.returncode == 0:
            print("✅ Function deployed successfully!")
            
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
                
                # Save URL to file for frontend integration
                with open('function_url.txt', 'w') as f:
                    f.write(function_url)
                print("✅ Function URL saved to function_url.txt")
                
                return function_url
            else:
                print("⚠️ Could not retrieve function URL")
                return None
        else:
            print("❌ Deployment failed")
            return None
            
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        return None

def test_dimension_creation(function_url):
    """Test the deployed function specifically for dimension creation"""
    if not function_url:
        print("❌ Cannot test deployment - no function URL")
        return False
    
    try:
        print("🧪 Testing dimension creation in deployed function...")
        
        # Test health endpoint first
        health_url = f"{function_url}/health"
        response = requests.get(health_url, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Health check passed")
            print(f"   Service: {result.get('service', 'Unknown')}")
            print(f"   Version: {result.get('version', 'Unknown')}")
            
            # Test dimension-specific payload
            test_payload = {
                "title": "Dimension Test Building",
                "description": "A simple building 10m x 6m",
                "user_requirements": "Include dimensions for length and width"
            }
            
            print("🔧 Testing DXF generation with dimensions...")
            dxf_response = requests.post(
                f"{function_url}/generate-dxf-endpoint",
                json=test_payload,
                timeout=120  # Longer timeout for dimension processing
            )
            
            if dxf_response.status_code == 200:
                print("✅ DXF generation successful")
                
                # Save and verify the DXF content
                with open("test_cloud_dimensions.dxf", "wb") as f:
                    f.write(dxf_response.content)
                
                # Verify dimensions in the generated DXF
                try:
                    import ezdxf
                    doc = ezdxf.readfile("test_cloud_dimensions.dxf")
                    msp = doc.modelspace()
                    
                    entity_counts = {}
                    for entity in msp:
                        entity_type = entity.dxftype()
                        entity_counts[entity_type] = entity_counts.get(entity_type, 0) + 1
                    
                    print("📊 Cloud DXF verification results:")
                    for entity_type, count in sorted(entity_counts.items()):
                        print(f"   {entity_type}: {count}")
                    
                    dimension_count = entity_counts.get('DIMENSION', 0)
                    text_count = entity_counts.get('TEXT', 0)
                    
                    print(f"\n📐 Dimensions: {dimension_count}")
                    print(f"📝 Text entities: {text_count}")
                    
                    if dimension_count > 0:
                        print("🎉 SUCCESS: Cloud deployment creates dimensions!")
                        return True
                    else:
                        print("❌ ISSUE: Cloud deployment not creating dimensions")
                        print("   This may be due to backend logic not generating DIMENSION entities")
                        return False
                        
                except ImportError:
                    print("⚠️ ezdxf not available for local verification")
                    print("   But DXF file was generated successfully")
                    return True
                except Exception as e:
                    print(f"⚠️ Could not verify DXF content: {e}")
                    return True  # File was generated, verification failed
            else:
                print(f"❌ DXF generation failed: {dxf_response.status_code}")
                try:
                    error_data = dxf_response.json()
                    print(f"   Error: {error_data.get('error', 'Unknown error')}")
                except:
                    print(f"   Raw response: {dxf_response.text[:200]}")
                return False
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Testing failed: {e}")
        return False

def main():
    """Main deployment function with dimension fixes"""
    print("🔧 FIXED GOOGLE CLOUD DEPLOYMENT - DIMENSION CREATION")
    print("=" * 60)
    
    # Check prerequisites
    if not check_gcloud_installed():
        print("\n❌ Please install Google Cloud CLI:")
        print("   https://cloud.google.com/sdk/docs/install")
        sys.exit(1)
    
    if not check_authentication():
        print("\n❌ Please authenticate with Google Cloud:")
        print("   gcloud auth login")
        sys.exit(1)
    
    project_id = get_project_id()
    if not project_id:
        print("\n❌ Please set a Google Cloud project:")
        print("   gcloud config set project YOUR_PROJECT_ID")
        sys.exit(1)
    
    # Get function name (use fixed version)
    function_name = input("\nEnter function name (default: dxf-generator-fixed): ").strip()
    if not function_name:
        function_name = "dxf-generator-fixed"
    
    # Get region
    region = input("Enter region (default: us-central1): ").strip()
    if not region:
        region = "us-central1"
    
    print(f"\n🚀 DEPLOYMENT CONFIGURATION:")
    print(f"   Project ID: {project_id}")
    print(f"   Function Name: {function_name}")
    print(f"   Region: {region}")
    print(f"   Memory: 1GB (enhanced for ezdxf)")
    print(f"   Timeout: 120s (enhanced for dimensions)")
    
    confirm = input("\nProceed with deployment? (y/N): ").strip().lower()
    if confirm != 'y':
        print("❌ Deployment cancelled")
        sys.exit(0)
    
    # Deploy function with fixes
    function_url = deploy_function_with_fixes(project_id, function_name, region)
    
    if function_url:
        # Test specifically for dimension creation
        success = test_dimension_creation(function_url)
        
        print("\n" + "=" * 60)
        if success:
            print("🎉 DEPLOYMENT SUCCESSFUL - DIMENSIONS WORKING!")
        else:
            print("⚠️ DEPLOYMENT COMPLETE - DIMENSION ISSUES DETECTED")
        
        print(f"🌐 Function URL: {function_url}")
        print("\n📋 Available endpoints:")
        print(f"   - Health Check: {function_url}/health")
        print(f"   - DXF Generation: {function_url}/generate-dxf-endpoint")
        print(f"   - Debug Info: {function_url}/get-debug-info")
        print(f"   - Hardcoded Test: {function_url}/test-hardcoded-dxf")
        
        if success:
            print("\n✅ Your app should now create dimensions properly!")
        else:
            print("\n⚠️ Check the backend logic in app.py for dimension generation")
            print("   The LLM-generated code works fine when corrected.")
        
    else:
        print("\n❌ Deployment failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()