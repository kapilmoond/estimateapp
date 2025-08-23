import React, { useState, useEffect } from 'react';
import { DXFService } from '../services/dxfService';

export const DXFSetupGuide: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    setBackendStatus('checking');
    const isAvailable = await DXFService.checkBackendHealth();
    setBackendStatus(isAvailable ? 'available' : 'unavailable');
  };

  if (backendStatus === 'available') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-600 text-xl">✅</span>
          <h3 className="font-semibold text-green-800">Professional DXF System Ready</h3>
        </div>
        <p className="text-green-700 text-sm">
          Python backend is running. You can now generate professional CAD-quality DXF files!
        </p>
      </div>
    );
  }

  if (backendStatus === 'checking') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600 text-xl">🔄</span>
          <h3 className="font-semibold text-blue-800">Checking Backend Status...</h3>
        </div>
        <p className="text-blue-700 text-sm">
          Checking if Python DXF backend is available...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-yellow-600 text-xl">⚠️</span>
        <h3 className="font-semibold text-yellow-800">Professional DXF Backend Setup Required</h3>
      </div>
      
      <div className="text-yellow-700 text-sm space-y-3">
        <p>
          <strong>Currently in DEMO MODE.</strong> To generate real professional DXF files compatible with AutoCAD, Revit, and other CAD software, please set up the Python backend:
        </p>
        
        <div className="bg-yellow-100 p-3 rounded border">
          <h4 className="font-semibold mb-2">🚀 Setup Options:</h4>

          <div className="mb-3">
            <h5 className="font-medium text-xs mb-1">Option 1: Google Cloud Functions (Recommended)</h5>
            <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
              <li>Navigate to <code className="bg-yellow-200 px-1 rounded">python-backend</code> folder</li>
              <li>Run: <code className="bg-yellow-200 px-1 rounded">python deploy.py</code></li>
              <li>Copy the function URL and configure it in Backend Configuration above</li>
              <li>Enjoy serverless, scalable DXF generation with 2M free requests/month!</li>
            </ol>
          </div>

          <div>
            <h5 className="font-medium text-xs mb-1">Option 2: Local Development</h5>
            <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
              <li>Run: <code className="bg-yellow-200 px-1 rounded">python setup.py</code></li>
              <li>Keep the server running while using the app</li>
              <li>Refresh this page to activate professional DXF generation</li>
            </ol>
          </div>
        </div>

        <div className="bg-yellow-100 p-3 rounded border">
          <h4 className="font-semibold mb-2">📋 Requirements:</h4>
          <div className="mb-2">
            <h5 className="font-medium text-xs mb-1">For Google Cloud Functions:</h5>
            <ul className="list-disc list-inside space-y-1 text-xs ml-2">
              <li>Google Cloud account (free tier available)</li>
              <li>Google Cloud CLI installed</li>
              <li>Python 3.11+ and pip</li>
              <li>Gemini API key (optional, for AI features)</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-xs mb-1">For Local Development:</h5>
            <ul className="list-disc list-inside space-y-1 text-xs ml-2">
              <li>Python 3.8 or higher</li>
              <li>pip (Python package installer)</li>
              <li>Internet connection (for installing ezdxf library)</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-100 p-3 rounded border">
          <h4 className="font-semibold mb-2">🏗️ What You'll Get:</h4>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Professional DXF files</strong> using ezdxf library</li>
            <li><strong>CAD software compatibility</strong> (AutoCAD, Revit, etc.)</li>
            <li><strong>Construction industry standards</strong> (layers, dimensions, title blocks)</li>
            <li><strong>AI-powered geometry generation</strong> with Gemini 2.0 Flash</li>
            <li><strong>Comprehensive debugging</strong> with 3-checkpoint logging</li>
            <li><strong>Serverless scalability</strong> with Google Cloud Functions</li>
            <li><strong>Professional quality</strong> suitable for real construction projects</li>
          </ul>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={checkBackendStatus}
            className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
          >
            🔄 Check Again
          </button>
          <button
            onClick={() => window.open('/GOOGLE_CLOUD_FUNCTIONS_SETUP.md', '_blank')}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            📖 Cloud Functions Guide
          </button>
          <button
            onClick={() => window.open('/python-backend/CLOUD_FUNCTIONS_DEPLOYMENT.md', '_blank')}
            className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            🚀 Deployment Guide
          </button>
        </div>

        <div className="mt-3 p-2 bg-yellow-100 rounded border-l-4 border-yellow-400">
          <p className="text-xs">
            <strong>Note:</strong> Demo mode generates basic DXF files for testing.
            For professional construction drawings with AI-powered geometry generation,
            deploy the Python backend to Google Cloud Functions (recommended) or run locally.
          </p>
        </div>
      </div>
    </div>
  );
};
