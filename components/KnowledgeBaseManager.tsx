import React, { useState, useEffect, useCallback } from 'react';
import { KnowledgeBaseDocument, KnowledgeBaseStats, KnowledgeBaseConfig } from '../types';
import { EnhancedKnowledgeBaseService, KnowledgeBaseService } from '../services/knowledgeBaseService';
import { LLMKnowledgeManager } from './LLMKnowledgeManager';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface KnowledgeBaseManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onKnowledgeBaseUpdate: () => void;
}

export const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({
  isOpen,
  onClose,
  onKnowledgeBaseUpdate
}) => {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [config, setConfig] = useState<KnowledgeBaseConfig | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'settings' | 'stats'>('documents');
  const [isLLMManagerOpen, setIsLLMManagerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      // Try to load from IndexedDB first
      const docs = await EnhancedKnowledgeBaseService.loadDocuments();
      const statsData = await EnhancedKnowledgeBaseService.getStats();
      const configData = await EnhancedKnowledgeBaseService.getConfig();

      setDocuments(docs);
      setStats(statsData);
      setConfig(configData);
      console.log(`Loaded ${docs.length} documents from IndexedDB`);
    } catch (error) {
      console.error('Error loading from IndexedDB, falling back to localStorage:', error);
      // Fallback to localStorage
      setDocuments(KnowledgeBaseService.loadDocuments());
      setStats(KnowledgeBaseService.getStats());
      setConfig(KnowledgeBaseService.getConfig());
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.txt')) {
      return await file.text();
    } else if (fileName.endsWith('.pdf')) {
      return await readPdfFile(file);
    } else if (fileName.endsWith('.docx')) {
      return await readWordFile(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return await readExcelFile(file);
    } else {
      throw new Error(`Unsupported file type: ${file.name}`);
    }
  };

  const readPdfFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          if (!data) {
            throw new Error('Failed to read PDF file data');
          }

          console.log('PDF.js worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);

          const pdf = await pdfjsLib.getDocument({ data }).promise;
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => (item as any).str).join(' ');
            fullText += pageText + '\n';
          }
          resolve(fullText);
        } catch (err) {
          console.error('PDF processing error:', err);
          reject(new Error(`Failed to process PDF: ${err instanceof Error ? err.message : 'Unknown error'}`));
        }
      };
      reader.onerror = (err) => {
        console.error('FileReader error:', err);
        reject(new Error('Failed to read PDF file'));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const readWordFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as ArrayBuffer;
        mammoth.extractRawText({ arrayBuffer: result })
          .then(resultObj => resolve(resultObj.value))
          .catch(reject);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const readExcelFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          let fullText = '';
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
            fullText += json.map(row => row.join(' ')).join('\n') + '\n';
          });
          resolve(fullText);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        setUploadProgress(`Processing ${file.name}...`);

        try {
          // Try to use enhanced service first (IndexedDB)
          await EnhancedKnowledgeBaseService.addDocument(file);
          console.log(`Successfully added ${file.name} to IndexedDB`);
        } catch (indexedDBError) {
          console.error('Error adding to IndexedDB, falling back to localStorage:', indexedDBError);
          // Fallback to localStorage
          const content = await readFileContent(file);
          await KnowledgeBaseService.addDocument(file, content);
          console.log(`Successfully added ${file.name} to localStorage`);
        }
      }

      await loadData();
      onKnowledgeBaseUpdate();
      setUploadProgress('');
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }, [onKnowledgeBaseUpdate]);

  const handleRemoveDocument = async (documentId: string) => {
    try {
      // Use the enhanced delete method that automatically cleans up summaries
      await EnhancedKnowledgeBaseService.deleteDocument(documentId);
      console.log(`Removed document and associated summaries for ${documentId}`);
    } catch (error) {
      console.error('Error removing document and summaries:', error);
      // Fallback to basic removal
      try {
        await EnhancedKnowledgeBaseService.removeDocument(documentId);
        console.log(`Removed document ${documentId} from IndexedDB (fallback)`);
      } catch (fallbackError) {
        console.error('Error with fallback removal, trying localStorage:', fallbackError);
        KnowledgeBaseService.removeDocument(documentId);
      }
    }
    await loadData();
    onKnowledgeBaseUpdate();
  };

  const handleToggleDocument = async (documentId: string) => {
    try {
      // Try IndexedDB first
      await EnhancedKnowledgeBaseService.toggleDocumentStatus(documentId);
      console.log(`Toggled document ${documentId} status in IndexedDB`);
    } catch (error) {
      console.error('Error toggling in IndexedDB, trying localStorage:', error);
      // Fallback to localStorage
      KnowledgeBaseService.toggleDocumentStatus(documentId);
    }
    await loadData();
    onKnowledgeBaseUpdate();
  };

  const handleConfigUpdate = async (newConfig: Partial<KnowledgeBaseConfig>) => {
    try {
      // Try IndexedDB first
      await EnhancedKnowledgeBaseService.saveConfig(newConfig as KnowledgeBaseConfig);
      const updatedConfig = await EnhancedKnowledgeBaseService.getConfig();
      setConfig(updatedConfig);
      console.log('Config updated in IndexedDB');
    } catch (error) {
      console.error('Error updating config in IndexedDB, trying localStorage:', error);
      // Fallback to localStorage
      KnowledgeBaseService.saveConfig(newConfig);
      setConfig(KnowledgeBaseService.getConfig());
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear the complete knowledge base including all documents, summaries, and chunks? This action cannot be undone.')) {
      try {
        setIsUploading(true);
        setUploadProgress('Clearing complete knowledge base...');

        // Use the comprehensive clear function from RAGService
        const { RAGService } = await import('../services/ragService');
        await RAGService.clearCompleteKnowledgeBase();

        setUploadProgress('Knowledge base cleared successfully');
        await loadData();
        onKnowledgeBaseUpdate();

        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress('');
        }, 1000);

      } catch (error) {
        console.error('Error clearing complete knowledge base:', error);
        setError(`Failed to clear knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsUploading(false);
        setUploadProgress('');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Knowledge Base Manager</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsLLMManagerOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              title="Configure LLM-based intelligent knowledge selection"
            >
              🤖 LLM Settings
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'documents', label: 'Documents', icon: '📄' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
              { id: 'stats', label: 'Statistics', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload Knowledge Base Documents
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload PDF, Word, Excel, or text files to build your personal knowledge base
                  </p>
                  <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-block">
                    {isUploading ? 'Uploading...' : 'Choose Files'}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.xlsx,.xls"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {isUploading && (
                    <div className="mt-2 text-sm text-gray-600">{uploadProgress}</div>
                  )}
                </div>
              </div>

              {/* Documents List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Documents ({documents.length})
                  </h3>
                  {documents.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No documents uploaded yet. Upload some files to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          doc.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <span className="text-2xl">
                              {doc.fileType === 'pdf' ? '📄' : 
                               doc.fileType === 'docx' ? '📝' : 
                               doc.fileType === 'xlsx' || doc.fileType === 'xls' ? '📊' : '📄'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{doc.fileName}</h4>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(doc.metadata?.fileSize || 0)} • {doc.chunks?.length || 0} chunks
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleDocument(doc.id)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              doc.isActive
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {doc.isActive ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && config && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Knowledge Base Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chunk Size (characters)
                  </label>
                  <input
                    type="number"
                    value={config.chunkSize}
                    onChange={(e) => handleConfigUpdate({ chunkSize: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    min="100"
                    max="5000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chunk Overlap (characters)
                  </label>
                  <input
                    type="number"
                    value={config.chunkOverlap}
                    onChange={(e) => handleConfigUpdate({ chunkOverlap: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    min="0"
                    max="1000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Chunks per Document
                  </label>
                  <input
                    type="number"
                    value={config.maxChunks}
                    onChange={(e) => handleConfigUpdate({ maxChunks: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    min="10"
                    max="500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Similarity Threshold
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.similarityThreshold}
                    onChange={(e) => handleConfigUpdate({ similarityThreshold: parseFloat(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    min="0"
                    max="1"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Knowledge Base Statistics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalDocuments}</div>
                  <div className="text-sm text-blue-800">Total Documents</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.activeDocuments}</div>
                  <div className="text-sm text-green-800">Active Documents</div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.totalChunks}</div>
                  <div className="text-sm text-purple-800">Total Chunks</div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{formatFileSize(stats.totalSize)}</div>
                  <div className="text-sm text-orange-800">Total Size</div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">
                  Last Updated: {stats.lastUpdated.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* LLM Knowledge Manager Modal */}
      <LLMKnowledgeManager
        isOpen={isLLMManagerOpen}
        onClose={() => setIsLLMManagerOpen(false)}
        onConfigUpdate={loadData}
      />
    </div>
  );
};
