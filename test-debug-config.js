// Test script to check backend configuration and debug endpoint
const checkBackendConfig = () => {
  console.log('=== BACKEND CONFIGURATION TEST ===');
  
  // Check localStorage configuration
  const cloudUrl = localStorage.getItem('cloudFunctionsUrl');
  console.log('Cloud Functions URL from localStorage:', cloudUrl);
  
  // Check environment variable
  const envUrl = import.meta.env?.VITE_CLOUD_FUNCTIONS_URL;
  console.log('Cloud Functions URL from environment:', envUrl);
  
  // Test health endpoint
  const backendUrl = cloudUrl || envUrl || 'http://localhost:5000';
  console.log('Using backend URL:', backendUrl);
  
  return backendUrl;
};

const testDebugEndpoint = async () => {
  const backendUrl = checkBackendConfig();
  
  try {
    console.log('\\n=== TESTING DEBUG ENDPOINT ===');
    
    const response = await fetch(`${backendUrl}/get-debug-info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Debug endpoint response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Debug endpoint result:', result);
    } else {
      const errorText = await response.text();
      console.log('Debug endpoint error:', errorText);
    }
  } catch (error) {
    console.error('Error testing debug endpoint:', error);
  }
};

// Run the test
checkBackendConfig();
setTimeout(testDebugEndpoint, 1000);

console.log('\\nTo run this test, copy and paste this code into the browser console when the app is loaded.');