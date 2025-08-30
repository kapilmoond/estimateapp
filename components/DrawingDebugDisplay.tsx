import React, { useState } from 'react';

interface DrawingDebugDisplayProps {
  llmOutput: string;
  extractedCode: string;
  serverRequest: any;
  serverResponse: any;
  error: string | null;
}

export const DrawingDebugDisplay: React.FC<DrawingDebugDisplayProps> = ({
  llmOutput,
  extractedCode,
  serverRequest,
  serverResponse,
  error
}) => {
  const [activeTab, setActiveTab] = useState<'llm' | 'code' | 'request' | 'response' | 'error'>('llm');

  if (!llmOutput && !extractedCode && !serverRequest && !serverResponse && !error) {
    return null;
  }

  return (
    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🔍 Drawing Generation Debug Information
      </h3>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-4">
        {llmOutput && (
          <button
            onClick={() => setActiveTab('llm')}
            className={`px-3 py-2 text-sm rounded ${
              activeTab === 'llm' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🤖 LLM Output
          </button>
        )}
        
        {extractedCode && (
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-2 text-sm rounded ${
              activeTab === 'code' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🐍 Extracted Python Code
          </button>
        )}
        
        {serverRequest && (
          <button
            onClick={() => setActiveTab('request')}
            className={`px-3 py-2 text-sm rounded ${
              activeTab === 'request' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📤 Server Request
          </button>
        )}
        
        {serverResponse && (
          <button
            onClick={() => setActiveTab('response')}
            className={`px-3 py-2 text-sm rounded ${
              activeTab === 'response' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📥 Server Response
          </button>
        )}
        
        {error && (
          <button
            onClick={() => setActiveTab('error')}
            className={`px-3 py-2 text-sm rounded ${
              activeTab === 'error' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ❌ Error Details
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="bg-white border rounded-lg p-4 max-h-96 overflow-y-auto">
        {activeTab === 'llm' && llmOutput && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">LLM Raw Output:</h4>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded">
              {llmOutput}
            </pre>
            <div className="mt-2 text-xs text-gray-600">
              Length: {llmOutput.length} characters
            </div>
          </div>
        )}

        {activeTab === 'code' && extractedCode && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Extracted Python Code:</h4>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-900 text-green-400 p-3 rounded">
              {extractedCode}
            </pre>
            <div className="mt-2 text-xs text-gray-600">
              Length: {extractedCode.length} characters | Lines: {extractedCode.split('\n').length}
            </div>
          </div>
        )}

        {activeTab === 'request' && serverRequest && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Server Request Data:</h4>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-blue-50 p-3 rounded">
              {JSON.stringify(serverRequest, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'response' && serverResponse && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Server Response Data:</h4>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-green-50 p-3 rounded">
              {JSON.stringify(serverResponse, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'error' && error && (
          <div>
            <h4 className="font-medium text-red-900 mb-2">Error Information:</h4>
            <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono bg-red-50 p-3 rounded">
              {error}
            </pre>
          </div>
        )}
      </div>

      {/* Quick Analysis */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-medium text-yellow-900 mb-2">Quick Analysis:</h4>
        <div className="text-sm text-yellow-800 space-y-1">
          {llmOutput && (
            <div>✓ LLM generated {llmOutput.length} characters of output</div>
          )}
          {extractedCode ? (
            <div>✓ Successfully extracted {extractedCode.length} characters of Python code</div>
          ) : llmOutput ? (
            <div>❌ Failed to extract valid Python code from LLM output</div>
          ) : null}
          {serverRequest && (
            <div>✓ Request sent to server with {serverRequest.python_code?.length || 0} characters of code</div>
          )}
          {serverResponse ? (
            <div>✓ Server responded successfully</div>
          ) : error ? (
            <div>❌ Server returned an error</div>
          ) : null}
        </div>
      </div>

      {/* Troubleshooting Tips */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-medium text-blue-900 mb-2">Troubleshooting Tips:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>• Check if the LLM output contains valid Python code</div>
          <div>• Verify the extracted code has import ezdxf, doc.new(), msp, and doc.saveas()</div>
          <div>• Ensure the local server is running (check server status above)</div>
          <div>• Look for syntax errors in the Python code</div>
          <div>• Check server logs for detailed error information</div>
        </div>
      </div>
    </div>
  );
};
