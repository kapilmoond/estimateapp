import React, { useState, useEffect } from 'react';
import { RAGService } from '../services/ragService';
import { RAGServerStatus } from '../types';

export const RAGServerManager: React.FC = () => {
  const [serverStatus, setServerStatus] = useState<RAGServerStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    checkServerStatus();
    // Check server status every 30 seconds
    const interval = setInterval(checkServerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    setIsChecking(true);
    try {
      const status = await RAGService.checkServerStatus();
      setServerStatus(status);
      setLastCheck(new Date());
    } catch (error) {
      console.warn('Failed to check RAG server status:', error);
      setServerStatus(null);
    } finally {
      setIsChecking(false);
    }
  };

  const openServerFolder = () => {
    // This will need to be implemented based on the platform
    alert('Please navigate to the python_rag_server folder and run start_rag_server.bat');
  };

  const getStatusColor = (isRunning: boolean): string => {
    return isRunning ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (isRunning: boolean): string => {
    return isRunning ? '🟢' : '🔴';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          🧠 RAG Server Status
        </h3>
        <button
          onClick={checkServerStatus}
          disabled={isChecking}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isChecking ? '🔄 Checking...' : '🔄 Refresh'}
        </button>
      </div>

      {serverStatus ? (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className={`font-semibold ${getStatusColor(serverStatus.isRunning)}`}>
              {getStatusIcon(serverStatus.isRunning)} 
              {serverStatus.isRunning ? 'Server Running' : 'Server Offline'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Port:</span>
              <span className="ml-2">{serverStatus.port}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Documents:</span>
              <span className="ml-2">{serverStatus.documentsCount}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Chunks:</span>
              <span className="ml-2">{serverStatus.chunksCount}</span>
            </div>
            <div className="col-span-2">
              <span className="font-medium text-gray-600">Model:</span>
              <span className="ml-2 text-xs">{serverStatus.embeddingModel}</span>
            </div>
          </div>

          {lastCheck && (
            <div className="text-xs text-gray-500">
              Last checked: {lastCheck.toLocaleTimeString()}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-red-600">
              🔴 Server Not Running
            </span>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">
              🚀 Start RAG Server
            </h4>
            <p className="text-yellow-700 text-sm mb-3">
              The RAG server needs to be started to use the knowledge base features.
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="font-medium text-yellow-800">Quick Start:</div>
              <ol className="list-decimal list-inside space-y-1 text-yellow-700">
                <li>Navigate to the <code className="bg-yellow-100 px-1 rounded">python_rag_server</code> folder</li>
                <li>Double-click <code className="bg-yellow-100 px-1 rounded">start_rag_server.bat</code></li>
                <li>Wait for the server to start (first run downloads AI models)</li>
                <li>The server will be available at <code className="bg-yellow-100 px-1 rounded">http://127.0.0.1:8001</code></li>
              </ol>
            </div>

            <button
              onClick={openServerFolder}
              className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
            >
              📁 Open Server Folder
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">
              ℹ️ About the RAG Server
            </h4>
            <div className="text-blue-700 text-sm space-y-1">
              <p>• <strong>Professional Vector Database:</strong> Uses ChromaDB for semantic search</p>
              <p>• <strong>Advanced Embeddings:</strong> Sentence-transformers for high-quality text understanding</p>
              <p>• <strong>Local Processing:</strong> All data stays on your computer</p>
              <p>• <strong>Multiple Formats:</strong> Supports PDF, DOCX, TXT, XLSX, XLS files</p>
              <p>• <strong>Intelligent Chunking:</strong> Smart text splitting for optimal retrieval</p>
            </div>
          </div>

          {lastCheck && (
            <div className="text-xs text-gray-500">
              Last checked: {lastCheck.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
