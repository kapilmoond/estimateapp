import React, { useState, useEffect } from 'react';
import { RAGService } from '../services/ragService';
import { RAGDocument, RAGServerStatus } from '../types';

interface RAGKnowledgeManagerProps {
  onKnowledgeBaseUpdate?: () => void;
}

export const RAGKnowledgeManager: React.FC<RAGKnowledgeManagerProps> = ({
  onKnowledgeBaseUpdate
}) => {
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [serverStatus, setServerStatus] = useState<RAGServerStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadData();
    // Check server status periodically
    const interval = setInterval(checkServerStatus, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    try {
      const status = await RAGService.checkServerStatus();
      setServerStatus(status);
    } catch (error) {
      console.warn('Failed to check server status:', error);
      setServerStatus(null);
    }
  };

  const loadData = async () => {
    try {
      setError(null);
      const status = await RAGService.checkServerStatus();
      setServerStatus(status);
      
      if (status && status.isRunning) {
        const docs = await RAGService.getDocuments();
        setDocuments(docs);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error loading RAG data:', error);
      setError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDocuments([]);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = ['.pdf', '.docx', '.txt', '.xlsx', '.xls'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
      setError(`Unsupported file type: ${fileExt}. Supported types: ${allowedTypes.join(', ')}`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(`Uploading ${file.name}...`);
      setError(null);

      const result = await RAGService.uploadDocument(file);
      
      setUploadProgress(`${file.name} uploaded successfully. Processing...`);
      
      // Wait a moment for processing to start, then reload data
      setTimeout(async () => {
        await loadData();
        setIsUploading(false);
        setUploadProgress('');
        onKnowledgeBaseUpdate?.();
      }, 2000);

    } catch (error) {
      console.error('Error uploading file:', error);
      setError(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
      setUploadProgress('');
    }

    // Clear the input
    event.target.value = '';
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      await RAGService.deleteDocument(documentId);
      await loadData();
      onKnowledgeBaseUpdate?.();
    } catch (error) {
      console.error('Error deleting document:', error);
      setError(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear the entire knowledge base? This action cannot be undone.')) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress('Clearing knowledge base...');
      setError(null);

      await RAGService.clearAllDocuments();
      
      setUploadProgress('Knowledge base cleared successfully');
      await loadData();
      onKnowledgeBaseUpdate?.();

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress('');
      }, 1000);

    } catch (error) {
      console.error('Error clearing knowledge base:', error);
      setError(`Failed to clear knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-yellow-600';
      case 'pending': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'pending': return '⏸️';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div 
        className="p-4 border-b border-gray-200 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-800">
            🧠 Professional RAG Knowledge Base
          </h3>
          {serverStatus && (
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${serverStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${serverStatus.isRunning ? 'text-green-600' : 'text-red-600'}`}>
                {serverStatus.isRunning ? 'Server Running' : 'Server Offline'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {serverStatus && serverStatus.isRunning && (
            <span className="text-sm text-gray-600">
              {serverStatus.documentsCount} docs, {serverStatus.chunksCount} chunks
            </span>
          )}
          <span className="text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          {!serverStatus || !serverStatus.isRunning ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-lg mb-2">🚫 RAG Server Not Running</div>
              <p className="text-gray-600 mb-4">
                The RAG server needs to be started to use the knowledge base.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg text-left">
                <p className="font-semibold mb-2">To start the RAG server:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Navigate to the <code className="bg-gray-200 px-1 rounded">python_rag_server</code> folder</li>
                  <li>Double-click <code className="bg-gray-200 px-1 rounded">start_rag_server.bat</code></li>
                  <li>Wait for the server to start (it will download models on first run)</li>
                  <li>Return here and the knowledge base will be available</li>
                </ol>
              </div>
            </div>
          ) : (
            <>
              {/* Upload Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700">Upload Documents</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadData()}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      disabled={isUploading}
                    >
                      🔄 Refresh
                    </button>
                    {documents.length > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                        disabled={isUploading}
                      >
                        🗑️ Clear All
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Supported formats: PDF, DOCX, TXT, XLSX, XLS
                  </p>
                </div>

                {isUploading && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="text-blue-700">{uploadProgress}</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <span className="text-red-700">{error}</span>
                  </div>
                )}
              </div>

              {/* Documents List */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">
                  Knowledge Base Documents ({documents.length})
                </h4>

                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📚</div>
                    <p>No documents uploaded yet</p>
                    <p className="text-sm">Upload documents to build your knowledge base</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-800">{doc.fileName}</span>
                              <span className={`text-sm ${getStatusColor(doc.metadata.processingStatus)}`}>
                                {getStatusIcon(doc.metadata.processingStatus)} {doc.metadata.processingStatus}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {formatFileSize(doc.metadata.fileSize)} • 
                              {doc.metadata.wordCount} words • 
                              {doc.metadata.chunkCount} chunks • 
                              {new Date(doc.uploadDate).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="ml-3 px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                            title="Delete document"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Server Info */}
              {serverStatus && (
                <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Server: {serverStatus.isRunning ? '🟢 Running' : '🔴 Offline'}</div>
                      <div>Port: {serverStatus.port}</div>
                      <div>Documents: {serverStatus.documentsCount}</div>
                      <div>Chunks: {serverStatus.chunksCount}</div>
                      <div className="col-span-2">Model: {serverStatus.embeddingModel}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
