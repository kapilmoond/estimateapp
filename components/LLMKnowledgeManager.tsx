import React, { useState, useEffect } from 'react';
import { KnowledgeBaseConfig, KnowledgeBaseDocument } from '../types';
import { EnhancedKnowledgeBaseService, KnowledgeBaseService } from '../services/knowledgeBaseService';
import { LLMKnowledgeService } from '../services/llmKnowledgeService';

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
  const [isGeneratingSummaries, setIsGeneratingSummaries] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState('');
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

  const generateAllSummaries = async () => {
    if (!config) return;

    setIsGeneratingSummaries(true);
    setError(null);
    setSummaryProgress('Starting summary generation...');

    try {
      const activeDocuments = documents.filter(doc => doc.isActive);
      
      for (let i = 0; i < activeDocuments.length; i++) {
        const doc = activeDocuments[i];
        setSummaryProgress(`Generating summaries for ${doc.fileName} (${i + 1}/${activeDocuments.length})...`);

        const updatedDoc = await LLMKnowledgeService.generateDocumentSummaries(
          doc,
          config.summaryCompressionRatio
        );

        // Save updated document
        try {
          await EnhancedKnowledgeBaseService.saveDocument(updatedDoc);
        } catch (error) {
          // Fallback to localStorage (though this won't work perfectly due to different structure)
          console.warn('Failed to save to IndexedDB, document summaries may not persist');
        }
      }

      setSummaryProgress('Summary generation completed!');
      await loadData(); // Reload to show updated summaries
      
      setTimeout(() => {
        setSummaryProgress('');
      }, 3000);
    } catch (error) {
      console.error('Error generating summaries:', error);
      setError(`Failed to generate summaries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingSummaries(false);
    }
  };

  const getSummaryStats = () => {
    let totalChunks = 0;
    let chunksWithSummaries = 0;

    documents.forEach(doc => {
      totalChunks += doc.chunks.length;
      chunksWithSummaries += doc.chunks.filter(chunk => chunk.summaryGenerated && chunk.summary).length;
    });

    return { totalChunks, chunksWithSummaries };
  };

  if (!isOpen) return null;

  const stats = getSummaryStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b bg-blue-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              🤖 LLM Knowledge Management
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Configure intelligent LLM-based knowledge selection and manage document summaries.
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">⚙️ LLM Selection Settings</h3>
            
            {config && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableLLMSelection"
                    checked={config.enableLLMSelection || false}
                    onChange={(e) => handleConfigChange({ enableLLMSelection: e.target.checked })}
                    className="mr-3"
                  />
                  <label htmlFor="enableLLMSelection" className="text-sm font-medium text-gray-700">
                    Enable LLM-based Intelligent Chunk Selection
                  </label>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  Use AI to intelligently select relevant knowledge chunks instead of similarity search
                </p>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoGenerateSummaries"
                    checked={config.autoGenerateSummaries || false}
                    onChange={(e) => handleConfigChange({ autoGenerateSummaries: e.target.checked })}
                    className="mr-3"
                  />
                  <label htmlFor="autoGenerateSummaries" className="text-sm font-medium text-gray-700">
                    Auto-generate Summaries for New Documents
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Summary Statistics</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{documents.length}</div>
                  <div className="text-sm text-gray-600">Documents</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.chunksWithSummaries}</div>
                  <div className="text-sm text-gray-600">Summarized Chunks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{stats.totalChunks - stats.chunksWithSummaries}</div>
                  <div className="text-sm text-gray-600">Pending Summaries</div>
                </div>
              </div>
              
              {stats.totalChunks > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Summary Progress</span>
                    <span>{Math.round((stats.chunksWithSummaries / stats.totalChunks) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(stats.chunksWithSummaries / stats.totalChunks) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary Generation */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🔄 Generate Summaries</h3>
            
            {summaryProgress && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                {summaryProgress}
              </div>
            )}

            <button
              onClick={generateAllSummaries}
              disabled={isGeneratingSummaries || documents.length === 0}
              className={`px-4 py-2 rounded-lg text-white font-medium ${
                isGeneratingSummaries || documents.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isGeneratingSummaries ? '🔄 Generating...' : '🚀 Generate All Summaries'}
            </button>
            
            <p className="text-xs text-gray-500 mt-2">
              This will generate LLM summaries for all document chunks that don't have recent summaries.
              The process may take several minutes depending on the number of chunks.
            </p>
          </div>

          {/* Document List */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">📚 Documents</h3>
            <div className="space-y-2">
              {documents.map(doc => {
                const chunksWithSummaries = doc.chunks.filter(chunk => chunk.summaryGenerated && chunk.summary).length;
                const summaryPercentage = doc.chunks.length > 0 ? Math.round((chunksWithSummaries / doc.chunks.length) * 100) : 0;
                
                return (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{doc.fileName}</div>
                      <div className="text-sm text-gray-600">
                        {doc.chunks.length} chunks • {chunksWithSummaries} summarized ({summaryPercentage}%)
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      doc.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {doc.isActive ? 'Active' : 'Inactive'}
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
