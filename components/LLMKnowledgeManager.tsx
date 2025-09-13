import React, { useState, useEffect } from 'react';
import { KnowledgeBaseConfig, KnowledgeBaseDocument, DocumentSummaryFile } from '../types';
import { EnhancedKnowledgeBaseService, KnowledgeBaseService } from '../services/knowledgeBaseService';
import { LLMKnowledgeService } from '../services/llmKnowledgeService';
import { IntelligentChunkingService } from '../services/intelligentChunkingService';

interface LLMKnowledgeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate: () => void;
}

export const LLMKnowledgeManager: React.FC<LLMKnowledgeManagerProps> = ({
  isOpen,
  onClose,
  onConfigUpdate
}) => {
  const [config, setConfig] = useState<KnowledgeBaseConfig | null>(null);
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [summaryFiles, setSummaryFiles] = useState<DocumentSummaryFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      // Load configuration
      let configData;
      try {
        configData = await EnhancedKnowledgeBaseService.getConfig();
      } catch (error) {
        configData = KnowledgeBaseService.getConfig();
      }
      setConfig(configData);

      // Load documents
      let docs;
      try {
        docs = await EnhancedKnowledgeBaseService.loadDocuments();
      } catch (error) {
        docs = KnowledgeBaseService.loadDocuments();
      }
      setDocuments(docs);

      // Load summary files (processed documents)
      const summaries = await IntelligentChunkingService.listSummaryFiles();
      setSummaryFiles(summaries);
    } catch (error) {
      console.error('Error loading LLM knowledge data:', error);
      setError('Failed to load knowledge base data');
    }
  };

  const handleConfigChange = async (updates: Partial<KnowledgeBaseConfig>) => {
    if (!config) return;

    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    try {
      // Save to IndexedDB first, fallback to localStorage
      try {
        await EnhancedKnowledgeBaseService.saveConfig(newConfig);
      } catch (error) {
        KnowledgeBaseService.saveConfig(newConfig);
      }
      onConfigUpdate();
    } catch (error) {
      console.error('Error saving config:', error);
      setError('Failed to save configuration');
    }
  };

  const processAllDocuments = async () => {
    if (!config) return;

    setIsProcessing(true);
    setError(null);
    setProcessingProgress('Starting intelligent document processing...');

    try {
      const result = await LLMKnowledgeService.processAllDocuments();

      if (result.failed > 0) {
        setError(`Processing completed with ${result.failed} failures:\n${result.errors.join('\n')}`);
      }

      setProcessingProgress(`Processing completed! ${result.processed} documents processed successfully.`);
      await loadData(); // Reload to show updated data

      setTimeout(() => {
        setProcessingProgress('');
      }, 5000);
    } catch (error) {
      console.error('Error processing documents:', error);
      setError(`Failed to process documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getProcessingStats = () => {
    const totalDocuments = documents.filter(doc => doc.isActive).length;
    const processedDocuments = summaryFiles.length;
    const totalChunks = summaryFiles.reduce((sum, file) => sum + file.totalChunks, 0);

    return {
      totalDocuments,
      processedDocuments,
      totalChunks,
      pendingDocuments: totalDocuments - processedDocuments
    };
  };

  if (!isOpen) return null;

  const stats = getProcessingStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b bg-blue-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              🤖 Intelligent Knowledge Processing
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Configure intelligent LLM-based document processing with smart chunking and summarization.
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Configuration Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">⚙️ Intelligent Processing Settings</h3>

            {config && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoGenerateSummaries"
                    checked={config.autoGenerateSummaries || false}
                    onChange={(e) => handleConfigChange({ autoGenerateSummaries: e.target.checked })}
                    className="mr-3"
                  />
                  <label htmlFor="autoGenerateSummaries" className="text-sm font-medium text-gray-700">
                    Auto-process New Documents with Intelligent Chunking
                  </label>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  Automatically process new documents with LLM-based intelligent chunking and summarization
                </p>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Input Text Length
                    </label>
                    <select
                      value={config.maxInputTextLength || 50000}
                      onChange={(e) => handleConfigChange({ maxInputTextLength: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={30000}>30k chars</option>
                      <option value={50000}>50k chars (Recommended)</option>
                      <option value={70000}>70k chars</option>
                      <option value={100000}>100k chars</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Per LLM call limit</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Summary Compression Ratio
                    </label>
                    <select
                      value={config.summaryCompressionRatio || 0.1}
                      onChange={(e) => handleConfigChange({ summaryCompressionRatio: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={0.05}>5% (Very Concise)</option>
                      <option value={0.1}>10% (Recommended)</option>
                      <option value={0.15}>15% (Detailed)</option>
                      <option value={0.2}>20% (Comprehensive)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Summary length</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Selected Chunks
                    </label>
                    <select
                      value={config.maxSelectedChunks || 5}
                      onChange={(e) => handleConfigChange({ maxSelectedChunks: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value={3}>3 chunks</option>
                      <option value={5}>5 chunks (Recommended)</option>
                      <option value={7}>7 chunks</option>
                      <option value={10}>10 chunks</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Per query limit</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Processing Statistics */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Processing Statistics</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalDocuments}</div>
                  <div className="text-sm text-gray-600">Total Documents</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.processedDocuments}</div>
                  <div className="text-sm text-gray-600">Processed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{stats.pendingDocuments}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.totalChunks}</div>
                  <div className="text-sm text-gray-600">Smart Chunks</div>
                </div>
              </div>

              {stats.totalDocuments > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Processing Progress</span>
                    <span>{Math.round((stats.processedDocuments / stats.totalDocuments) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(stats.processedDocuments / stats.totalDocuments) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Intelligent Processing */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🤖 Intelligent Document Processing</h3>

            {processingProgress && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                {processingProgress}
              </div>
            )}

            <button
              onClick={processAllDocuments}
              disabled={isProcessing || documents.length === 0}
              className={`px-4 py-2 rounded-lg text-white font-medium ${
                isProcessing || documents.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isProcessing ? '🔄 Processing...' : '🤖 Process All Documents'}
            </button>

            <p className="text-xs text-gray-500 mt-2">
              This will process all documents with intelligent LLM-based chunking and summarization.
              The LLM will determine optimal chunk boundaries and create compressed summaries.
              Processing time depends on document size and complexity.
            </p>
          </div>

          {/* Document List */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">📚 Documents</h3>
            <div className="space-y-2">
              {documents.map(doc => {
                const summaryFile = summaryFiles.find(sf => sf.documentId === doc.id);
                const isProcessed = summaryFile && summaryFile.version === '2.0';

                return (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{doc.fileName}</div>
                      <div className="text-sm text-gray-600">
                        {isProcessed ? (
                          <>
                            ✅ Processed • {summaryFile.totalChunks} intelligent chunks
                            <div className="text-xs text-gray-500 mt-1">
                              Last updated: {new Date(summaryFile.updatedAt).toLocaleDateString()}
                            </div>
                          </>
                        ) : (
                          <>
                            ⏳ Pending processing • {doc.content.length.toLocaleString()} characters
                            <div className="text-xs text-gray-500 mt-1">
                              Needs intelligent chunking and summarization
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded text-xs ${
                        isProcessed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {isProcessed ? 'Processed' : 'Pending'}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        doc.isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {doc.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {documents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📚</div>
                  <p>No documents in knowledge base</p>
                  <p className="text-sm">Upload documents to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
