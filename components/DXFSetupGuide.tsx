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
          <h4 className="font-semibold mb-2">🚀 Quick Setup (2 minutes):</h4>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Open terminal/command prompt</li>
            <li>Navigate to the <code className="bg-yellow-200 px-1 rounded">python-backend</code> folder</li>
            <li>Run: <code className="bg-yellow-200 px-1 rounded">python setup.py</code></li>
            <li>Keep the server running while using the app</li>
            <li>Refresh this page to activate professional DXF generation</li>
          </ol>
        </div>

        <div className="bg-yellow-100 p-3 rounded border">
          <h4 className="font-semibold mb-2">📋 Requirements:</h4>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Python 3.8 or higher</li>
            <li>pip (Python package installer)</li>
            <li>Internet connection (for installing ezdxf library)</li>
          </ul>
        </div>

        <div className="bg-yellow-100 p-3 rounded border">
          <h4 className="font-semibold mb-2">🏗️ What You'll Get:</h4>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Professional DXF files</strong> using ezdxf library</li>
            <li><strong>CAD software compatibility</strong> (AutoCAD, Revit, etc.)</li>
            <li><strong>Construction industry standards</strong> (layers, dimensions, title blocks)</li>
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
          <a
            href="https://github.com/kapilmoond/estimateapp/tree/main/python-backend"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            📖 View Setup Guide
          </a>
        </div>

        <div className="mt-3 p-2 bg-yellow-100 rounded border-l-4 border-yellow-400">
          <p className="text-xs">
            <strong>Note:</strong> Demo mode generates basic DXF files for testing. 
            For professional construction drawings, the Python backend with ezdxf library is required.
          </p>
        </div>
      </div>
    </div>
  );
};
