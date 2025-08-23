import React, { useState, useEffect } from 'react';
import { CloudConfig } from '../services/cloudConfig';
import { DXFService } from '../services/dxfService';

interface BackendStatus {
  available: boolean;
  type: string;
  url: string;
  responseTime: number;
  error?: string;
}

export const BackendConfig: React.FC = () => {
  const [cloudFunctionsUrl, setCloudFunctionsUrl] = useState('');
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    // Load saved URL
    const savedUrl = CloudConfig.getCloudFunctionsUrl();
    setCloudFunctionsUrl(savedUrl);
    
    // Test current configuration
    testBackend();
  }, []);

  const testBackend = async () => {
    setTesting(true);
    try {
      const result = await DXFService.getBackendStatus();
      setStatus(result);
    } catch (error) {
      setStatus({
        available: false,
        type: 'unknown',
        url: 'unknown',
        responseTime: 0,
        error: 'Test failed'
      });
    }
    setTesting(false);
  };

  const saveConfiguration = () => {
    // Validate URL format
    if (cloudFunctionsUrl && !isValidUrl(cloudFunctionsUrl)) {
      setStatus({
        available: false,
        type: 'unknown',
        url: cloudFunctionsUrl,
        responseTime: 0,
        error: 'Invalid URL format. Please enter a valid Google Cloud Functions URL.'
      });
      return;
    }

    CloudConfig.setCloudFunctionsUrl(cloudFunctionsUrl);
    testBackend();
    setShowConfig(false);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      // Check if it's a valid Google Cloud Functions URL pattern
      return urlObj.protocol === 'https:' && 
             (urlObj.hostname.includes('cloudfunctions.net') || 
              urlObj.hostname.includes('run.app') ||
              urlObj.hostname === 'localhost' ||
              urlObj.hostname.includes('ngrok'));
    } catch {
      return false;
    }
  };

  const resetToLocal = () => {
    setCloudFunctionsUrl('');
    CloudConfig.setCloudFunctionsUrl('');
    testBackend();
  };

  const getStatusColor = () => {
    if (!status) return 'text-gray-500';
    return status.available ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = () => {
    if (testing) return '🔄';
    if (!status) return '❓';
    return status.available ? '✅' : '❌';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Backend Configuration</h3>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {showConfig ? 'Hide Config' : 'Configure'}
        </button>
      </div>

      {/* Status Display */}
      <div className="flex items-center space-x-3 mb-3">
        <span className="text-xl">{getStatusIcon()}</span>
        <div>
          <div className={`font-medium ${getStatusColor()}`}>
            {testing ? 'Testing...' : status?.available ? 'Backend Available' : 'Backend Unavailable'}
          </div>
          {status && (
            <div className="text-sm text-gray-600">
              {status.type === 'cloud-functions' ? 'Google Cloud Functions' : 
               status.type === 'local' ? 'Local Development' : 'Unknown'}
              {status.available && ` • ${status.responseTime}ms`}
            </div>
          )}
          {status?.error && (
            <div className="text-sm text-red-600">{status.error}</div>
          )}
        </div>
        <button
          onClick={testBackend}
          disabled={testing}
          className="ml-auto px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
        >
          Test
        </button>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="border-t pt-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Cloud Functions URL
            </label>
            <input
              type="url"
              value={cloudFunctionsUrl}
              onChange={(e) => setCloudFunctionsUrl(e.target.value)}
              placeholder="https://your-region-your-project.cloudfunctions.net/dxf-generator"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your Google Cloud Functions URL after deployment (should end with /dxf-generator)
            </p>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={saveConfiguration}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Save & Test
            </button>
            <button
              onClick={resetToLocal}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
            >
              Use Local
            </button>
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Google Cloud Functions URL Format:</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>Format:</strong> <code>https://region-project.cloudfunctions.net/function-name</code></p>
              <p><strong>Example:</strong> <code>https://us-central1-myproject.cloudfunctions.net/dxf-generator</code></p>
              <p className="mt-2"><strong>Deployment steps:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Navigate to <code>python-backend</code> directory</li>
                <li>Run <code>python deploy.py</code></li>
                <li>Copy the function URL from deployment output</li>
                <li>Paste the complete URL above and click "Save & Test"</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Current Configuration Display */}
      {status && (
        <div className="text-xs text-gray-500 mt-2">
          Current: {status.url}
        </div>
      )}
    </div>
  );
};
