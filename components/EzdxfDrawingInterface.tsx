import React, { useState, useEffect } from 'react';
import { EzdxfDrawingService, DrawingRequest, DrawingResult } from '../services/ezdxfDrawingService';
import { DrawingDebugDisplay } from './DrawingDebugDisplay';
import { DrawingCodeGenerator } from '../services/drawingCodeGenerator';
import { DrawingSpecificationParser } from '../services/drawingSpecificationParser';
import { DrawingSettingsPanel, DrawingSettings } from './DrawingSettingsPanel';
import { DrawingSettingsService } from '../services/drawingSettingsService';

interface EzdxfDrawingInterfaceProps {
  userInput: string;
  projectContext: string;
  designContext: string;
  guidelines: string;
  referenceText: string;
  onDrawingGenerated: (result: DrawingResult) => void;
  onError: (error: string) => void;
}

export const EzdxfDrawingInterface: React.FC<EzdxfDrawingInterfaceProps> = ({
  userInput,
  projectContext,
  designContext,
  guidelines,
  referenceText,
  onDrawingGenerated,
  onError
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [showCode, setShowCode] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ running: boolean; message: string; version?: string } | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  // Settings management
  const [drawingSettings, setDrawingSettings] = useState<DrawingSettings>(DrawingSettingsService.loadSettings());
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Debug information
  const [debugInfo, setDebugInfo] = useState<{
    llmOutput: string;
    extractedCode: string;
    serverRequest: any;
    serverResponse: any;
    error: string | null;
  }>({
    llmOutput: '',
    extractedCode: '',
    serverRequest: null,
    serverResponse: null,
    error: null
  });

  // Check server status on component mount
  React.useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    setIsCheckingServer(true);
    try {
      const status = await EzdxfDrawingService.checkServerStatus();
      setServerStatus(status);
    } catch (error) {
      setServerStatus({
        running: false,
        message: 'Cannot connect to local server'
      });
    } finally {
      setIsCheckingServer(false);
    }
  };

  const testServer = async () => {
    setIsCheckingServer(true);
    try {
      const result = await EzdxfDrawingService.testServer();
      if (result.success) {
        setServerStatus({
          running: true,
          message: result.message,
          version: 'Working'
        });
      } else {
        setServerStatus({
          running: false,
          message: result.message
        });
      }
    } catch (error) {
      setServerStatus({
        running: false,
        message: 'Server test failed'
      });
    } finally {
      setIsCheckingServer(false);
    }
  };

  const handleGenerateDrawing = async () => {
    if (!userInput.trim()) {
      onError('Please provide drawing requirements');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('Analyzing requirements...');

    try {
      // Clear previous debug info
      setDebugInfo({
        llmOutput: '',
        extractedCode: '',
        serverRequest: null,
        serverResponse: null,
        error: null
      });

      // Step 1: LLM provides precise attribute specifications
      setCurrentStep('Getting precise drawing specifications from AI...');
      const specification = await DrawingSpecificationParser.parseDescription(userInput);
      console.log('LLM Attribute Specification:', specification);
      setDebugInfo(prev => ({ ...prev, llmOutput: JSON.stringify(specification, null, 2) }));

      // Step 2: App generates reliable Python code from attributes using settings
      setCurrentStep('Generating professional Python code from attributes...');
      const pythonCode = DrawingCodeGenerator.generatePythonCode(specification, drawingSettings);
      console.log('App-Generated Python Code:', pythonCode);
      setGeneratedCode(pythonCode);
      setDebugInfo(prev => ({ ...prev, extractedCode: pythonCode }));

      // Step 3: Execute reliable code on local server
      setCurrentStep('Executing Python code via local server...');

      const serverRequest = {
        python_code: pythonCode,
        filename: (specification.title || 'drawing').replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').toLowerCase()
      };
      setDebugInfo(prev => ({ ...prev, serverRequest }));

      const result = await EzdxfDrawingService.executeDrawingCode(pythonCode, specification.title || 'drawing');
      setDebugInfo(prev => ({ ...prev, serverResponse: result }));

      setCurrentStep('Drawing generated successfully!');
      onDrawingGenerated(result);

    } catch (error) {
      console.error('Drawing generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate drawing';
      setDebugInfo(prev => ({ ...prev, error: errorMessage }));
      onError(errorMessage);
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  };



  const extractTitle = (input: string): string => {
    // Try to extract a meaningful title from user input
    const lines = input.split('\n');
    const firstLine = lines[0].trim();
    
    // If first line is short and descriptive, use it as title
    if (firstLine.length > 5 && firstLine.length < 50 && !firstLine.includes('.')) {
      return firstLine;
    }
    
    // Look for drawing-related keywords
    const drawingMatch = input.match(/(?:draw|create|generate|design)\s+(?:a\s+)?(.+?)(?:\s+for|\s+with|\.|$)/i);
    if (drawingMatch && drawingMatch[1]) {
      return drawingMatch[1].trim();
    }
    
    // Default title
    return `Technical Drawing ${new Date().toLocaleDateString()}`;
  };

  const extractDescription = (input: string): string => {
    // Use the full input as description, cleaned up
    return input.trim().substring(0, 200) + (input.length > 200 ? '...' : '');
  };

  const handleDownloadCode = () => {
    if (!generatedCode) return;

    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ezdxf_drawing_code.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🔧 Professional CAD Drawing Generator
        </h3>
        <div className="text-sm text-gray-500">
          Powered by ezdxf + Google Cloud Functions
        </div>
      </div>

      {/* Server Status */}
      <div className={`mb-4 p-4 border rounded-lg ${
        serverStatus?.running
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`font-medium ${
            serverStatus?.running ? 'text-green-900' : 'text-red-900'
          }`}>
            🖥️ Local ezdxf Server Status
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={checkServerStatus}
              disabled={isCheckingServer}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
            >
              {isCheckingServer ? '⟳' : '🔄'} Check
            </button>
            {serverStatus?.running && (
              <button
                onClick={testServer}
                disabled={isCheckingServer}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                🧪 Test
              </button>
            )}
          </div>
        </div>

        <div className={`text-sm ${
          serverStatus?.running ? 'text-green-800' : 'text-red-800'
        }`}>
          {serverStatus?.running ? '✅' : '❌'} {serverStatus?.message || 'Checking server...'}
          {serverStatus?.version && (
            <span className="ml-2 text-xs opacity-75">
              (ezdxf {serverStatus.version})
            </span>
          )}
        </div>

        {!serverStatus?.running && (
          <div className="mt-2 text-xs text-red-700">
            <strong>To start the server:</strong><br/>
            • Windows: Double-click <code>start_server.bat</code> in the local-server folder<br/>
            • Linux/Mac: Run <code>./start_server.sh</code> in the local-server folder
          </div>
        )}
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. 🤖 AI generates complete ezdxf Python code based on your requirements</li>
          <li>2. 🖥️ Code executes on your local ezdxf server with full library access</li>
          <li>3. 📐 Professional DXF file created with dimensions, text, and annotations</li>
          <li>4. 💾 Download ready-to-use CAD file for AutoCAD, FreeCAD, etc.</li>
        </ol>
      </div>

      {/* Single Mode: Attribute-Based Drawing Generation */}
      <div className="mb-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="font-medium text-blue-900">🎯 Professional Attribute-Based Drawing</div>
          <div className="text-sm text-blue-700 mt-1">
            Describe your drawing requirements. AI will provide precise coordinates and attributes, then the app generates reliable code.
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Drawing Requirements:
        </label>
        <div className="p-3 bg-gray-50 border rounded-lg">
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {userInput || 'No requirements specified'}
          </div>
        </div>
      </div>

      {/* Context Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Project Context:</h4>
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
            {projectContext || 'No project context'}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Design Context:</h4>
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
            {designContext || 'No design context'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleGenerateDrawing}
          disabled={isGenerating || !userInput.trim() || !serverStatus?.running}
          className={`px-6 py-3 rounded-lg transition-colors font-medium ${
            serverStatus?.running
              ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
              : 'bg-red-600 text-white cursor-not-allowed'
          }`}
          title={!serverStatus?.running ? 'Please start the local ezdxf server first' : ''}
        >
          {isGenerating ? '⚙️ Generating...' :
           !serverStatus?.running ? '🔌 Server Required' :
           '🚀 Generate Professional Drawing'}
        </button>

        {generatedCode && (
          <>
            <button
              onClick={() => setShowCode(!showCode)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              {showCode ? 'Hide Code' : 'View Code'}
            </button>
            <button
              onClick={handleDownloadCode}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              📥 Download Python Code
            </button>
          </>
        )}
      </div>

      {/* Progress Indicator */}
      {isGenerating && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium text-yellow-800">{currentStep}</span>
          </div>
          <div className="mt-2 text-xs text-yellow-700">
            This may take 30-60 seconds for complex drawings...
          </div>
        </div>
      )}

      {/* Generated Code Display */}
      {showCode && generatedCode && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Generated ezdxf Python Code:</h4>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {generatedCode}
            </pre>
          </div>
        </div>
      )}

      {/* Features List */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Drawing Features:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
          <div>✓ Lines & Polylines</div>
          <div>✓ Circles & Arcs</div>
          <div>✓ Linear Dimensions</div>
          <div>✓ Radius Dimensions</div>
          <div>✓ Angular Dimensions</div>
          <div>✓ Text & Labels</div>
          <div>✓ Centerlines</div>
          <div>✓ Professional Layers</div>
          <div>✓ Title Blocks</div>
          <div>✓ Hatching</div>
          <div>✓ Blocks & Symbols</div>
          <div>✓ CAD Standards</div>
        </div>
      </div>

      {/* Debug Information Display */}
      <DrawingDebugDisplay
        llmOutput={debugInfo.llmOutput}
        extractedCode={debugInfo.extractedCode}
        serverRequest={debugInfo.serverRequest}
        serverResponse={debugInfo.serverResponse}
        error={debugInfo.error}
      />


    </div>
  );
};
