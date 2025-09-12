import React, { useState, useEffect } from 'react';
import { KnowledgeBaseDocument, RAGContext, KnowledgeBaseStats } from '../types';
import { EnhancedKnowledgeBaseService, KnowledgeBaseService } from '../services/knowledgeBaseService';
import { RAGService } from '../services/ragService';

interface KnowledgeBaseDisplayProps {
  includeInPrompts: boolean;
  onToggleInclude: (include: boolean) => void;
  onOpenManager: () => void;
}

export const KnowledgeBaseDisplay: React.FC<KnowledgeBaseDisplayProps> = ({
  includeInPrompts,
  onToggleInclude,
  onOpenManager
}) => {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RAGContext | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Try IndexedDB first
      const docs = await EnhancedKnowledgeBaseService.loadDocuments();
      const statsData = await EnhancedKnowledgeBaseService.getStats();
      setDocuments(docs);
      setStats(statsData);
      console.log(`Loaded ${docs.length} documents from IndexedDB for display`);
    } catch (error) {
      console.error('Error loading from IndexedDB, falling back to localStorage:', error);
      // Fallback to localStorage
      setDocuments(KnowledgeBaseService.loadDocuments());
      setStats(KnowledgeBaseService.getStats());
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const results = RAGService.searchKnowledgeBase(searchQuery, 5);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    switch (fileType) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'xlsx':
      case 'xls': return '📊';
      case 'txt': return '📄';
      default: return '📄';
    }
  };

  const activeDocuments = documents.filter(doc => doc.isActive);
  const isAvailable = RAGService.isKnowledgeBaseAvailable();

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-800">Knowledge Base</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isAvailable 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isAvailable ? `${activeDocuments.length} docs` : 'Empty'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg 
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <button
            onClick={onOpenManager}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Manage
          </button>
        </div>
      </div>

      {/* Include in Prompts Toggle */}
      <div className="flex items-center space-x-3 mb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeInPrompts}
            onChange={(e) => onToggleInclude(e.target.checked)}
            disabled={!isAvailable}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
          />
          <span className={`text-sm font-medium ${
            isAvailable ? 'text-gray-700' : 'text-gray-400'
          }`}>
            Include knowledge base in AI prompts
          </span>
        </label>
        
        {includeInPrompts && isAvailable && (
          <span className="text-xs text-green-600 font-medium">✓ Active</span>
        )}
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-4 text-center">
          <div className="bg-white p-2 rounded border">
            <div className="text-lg font-bold text-blue-600">{stats.activeDocuments}</div>
            <div className="text-xs text-gray-600">Active Docs</div>
          </div>
          <div className="bg-white p-2 rounded border">
            <div className="text-lg font-bold text-purple-600">{stats.totalChunks}</div>
            <div className="text-xs text-gray-600">Chunks</div>
          </div>
          <div className="bg-white p-2 rounded border">
            <div className="text-lg font-bold text-orange-600">{formatFileSize(stats.totalSize)}</div>
            <div className="text-xs text-gray-600">Total Size</div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-4">
          {/* Search Interface */}
          {isAvailable && (
            <div className="bg-white p-4 rounded border">
              <h4 className="font-medium text-gray-800 mb-3">Search Knowledge Base</h4>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search your documents..."
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isSearching ? '...' : 'Search'}
                </button>
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Search Results */}
              {searchResults && (
                <div className="mt-4">
                  <h5 className="font-medium text-gray-700 mb-2">
                    Search Results ({searchResults.relevantChunks.length} chunks found)
                  </h5>
                  {searchResults.relevantChunks.length === 0 ? (
                    <p className="text-gray-500 text-sm">No relevant content found for your search.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.relevantChunks.map((chunk, index) => {
                        const document = documents.find(doc => doc.id === chunk.documentId);
                        return (
                          <div key={chunk.id} className="bg-gray-50 p-3 rounded border-l-4 border-blue-400">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {getFileIcon(document?.fileType || 'txt')} {document?.fileName}
                              </span>
                              <span className="text-xs text-gray-500">
                                Chunk {chunk.chunkIndex + 1}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-3">
                              {chunk.content.substring(0, 200)}
                              {chunk.content.length > 200 && '...'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Documents List */}
          <div className="bg-white p-4 rounded border">
            <h4 className="font-medium text-gray-800 mb-3">Documents</h4>
            {documents.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p className="mb-2">No documents in knowledge base</p>
                <button
                  onClick={onOpenManager}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Upload your first document
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-2 rounded border ${
                      doc.isActive 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getFileIcon(doc.fileType)}</span>
                      <div>
                        <div className="font-medium text-sm text-gray-800">{doc.fileName}</div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(doc.metadata.fileSize)} • {doc.chunks.length} chunks
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        doc.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {doc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Knowledge Base Summary */}
          {isAvailable && includeInPrompts && (
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h5 className="font-medium text-blue-800 mb-1">Knowledge Base Active</h5>
                  <p className="text-sm text-blue-700">
                    Your personal documents will be included in AI responses when relevant. 
                    The AI will reference your uploaded content to provide more accurate and personalized answers.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
