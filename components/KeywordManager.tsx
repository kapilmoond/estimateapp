import React, { useState } from 'react';
import { KeywordGenerationResult, KeywordSet, KeywordGenerationService } from '../services/keywordGenerationService';
import { searchHSREnhanced, searchHSRManual, combineHSRResults, HSRSearchOptions } from '../services/hsrService';
import { HsrItem } from '../types';

interface KeywordManagerProps {
  subcomponentItems: string[];
  onKeywordsGenerated: (keywords: KeywordGenerationResult) => void;
  onHSRResults: (results: HsrItem[]) => void;
  existingKeywords?: KeywordGenerationResult;
}

export const KeywordManager: React.FC<KeywordManagerProps> = ({
  subcomponentItems,
  onKeywordsGenerated,
  onHSRResults,
  existingKeywords
}) => {
  const [keywords, setKeywords] = useState<KeywordGenerationResult | null>(existingKeywords || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [regenerationInstructions, setRegenerationInstructions] = useState('');
  const [manualKeywords, setManualKeywords] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [searchStats, setSearchStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateKeywords = async (instructions?: string) => {
    if (subcomponentItems.length === 0) {
      setError('No subcomponent items provided');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await KeywordGenerationService.generateKeywords(
        subcomponentItems,
        instructions
      );
      
      setKeywords(result);
      onKeywordsGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate keywords');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateKeywords = async () => {
    if (!keywords || !regenerationInstructions.trim()) {
      setError('Please provide regeneration instructions');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await KeywordGenerationService.regenerateKeywords(
        keywords,
        regenerationInstructions
      );
      
      setKeywords(result);
      onKeywordsGenerated(result);
      setRegenerationInstructions('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate keywords');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchHSR = async () => {
    if (!keywords) {
      setError('Generate keywords first');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchOptions: HSRSearchOptions = {
        maxResultsPerSet: 50,
        includePartialMatches: true,
        prioritizeExactMatches: true,
        includeHSRNumbers: true
      };

      const { results, stats } = searchHSREnhanced(keywords.keywordSets, searchOptions);
      setSearchStats(stats);
      onHSRResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search HSR');
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = async () => {
    if (!manualKeywords.trim()) {
      setError('Please enter manual keywords');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const keywordArray = manualKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const manualResults = searchHSRManual(keywordArray, 100);
      
      // If we have existing results, combine them
      if (keywords) {
        const { results: existingResults } = searchHSREnhanced(keywords.keywordSets);
        const combinedResults = combineHSRResults(existingResults, manualResults);
        onHSRResults(combinedResults);
      } else {
        onHSRResults(manualResults);
      }
      
      setManualKeywords('');
      setShowManualSearch(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search with manual keywords');
    } finally {
      setIsSearching(false);
    }
  };

  const validateKeywords = (keywordSet: KeywordSet) => {
    return KeywordGenerationService.validateKeywords(keywordSet.keywords);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🔑 Professional Keyword Generation & HSR Search
        </h3>
        <div className="text-sm text-gray-500">
          {subcomponentItems.length} items to process
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Initial Generation */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => handleGenerateKeywords()}
            disabled={isGenerating || subcomponentItems.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isGenerating ? '🔄 Generating...' : '🎯 Generate Keywords'}
          </button>
          
          {keywords && (
            <button
              onClick={handleSearchHSR}
              disabled={isSearching}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {isSearching ? '🔍 Searching...' : '🔍 Search HSR Data'}
            </button>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>Rules:</strong> Generates exactly 5 single-word keywords per item focusing on work types, materials, and specifications.</p>
          <p><strong>Examples:</strong> "brickwork,foundation,mortar,1:6,masonry" for brick foundation work</p>
        </div>
      </div>

      {/* Keyword Display */}
      {keywords && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Generated Keywords:</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {keywords.keywordSets.map((set, index) => {
              const validation = validateKeywords(set);
              return (
                <div key={index} className="p-3 bg-gray-50 rounded-md border">
                  <div className="font-medium text-sm text-gray-800 mb-1">
                    Item {index + 1}: {set.itemDescription.substring(0, 80)}...
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {set.keywords.map((keyword, kIndex) => (
                      <span
                        key={kIndex}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                      >
                        {keyword}
                      </span>
                    ))}
                    {set.hsrNumbers && set.hsrNumbers.map((hsrNum, hIndex) => (
                      <span
                        key={`hsr-${hIndex}`}
                        className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md"
                      >
                        HSR:{hsrNum}
                      </span>
                    ))}
                  </div>
                  {!validation.valid && (
                    <div className="text-xs text-red-600">
                      ⚠️ {validation.errors.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Statistics */}
          <div className="mt-3 p-3 bg-blue-50 rounded-md">
            <div className="text-sm text-blue-800">
              <strong>Statistics:</strong> {keywords.keywordSets.length} items, {keywords.totalKeywords} total keywords
              {searchStats && (
                <span className="ml-4">
                  | HSR Search: {searchStats.finalResults} results, {searchStats.duplicatesRemoved} duplicates removed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Regeneration */}
      {keywords && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">🔄 Regenerate Keywords:</h4>
          <div className="space-y-3">
            <textarea
              value={regenerationInstructions}
              onChange={(e) => setRegenerationInstructions(e.target.value)}
              placeholder="Enter instructions for keyword regeneration (e.g., 'Focus more on materials', 'Include HSR numbers 7.21.2, 6.9', 'Use more technical terms')"
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={3}
            />
            <button
              onClick={handleRegenerateKeywords}
              disabled={isGenerating || !regenerationInstructions.trim()}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
            >
              {isGenerating ? '🔄 Regenerating...' : '🔄 Regenerate with Instructions'}
            </button>
          </div>
        </div>
      )}

      {/* Manual Search */}
      <div className="mb-4">
        <button
          onClick={() => setShowManualSearch(!showManualSearch)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {showManualSearch ? '▼' : '▶'} Manual Keyword Search
        </button>
        
        {showManualSearch && (
          <div className="mt-3 p-4 bg-gray-50 rounded-md">
            <div className="space-y-3">
              <textarea
                value={manualKeywords}
                onChange={(e) => setManualKeywords(e.target.value)}
                placeholder="Enter manual keywords separated by commas (e.g., concrete, cement, 1:2:4, foundation)"
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows={2}
              />
              <button
                onClick={handleManualSearch}
                disabled={isSearching || !manualKeywords.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              >
                {isSearching ? '🔍 Searching...' : '🔍 Search with Manual Keywords'}
              </button>
              <div className="text-xs text-gray-600">
                Manual search will find all HSR items containing any of the specified keywords and combine with existing results.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Keyword Rules:</strong></p>
        <p>• Exactly 5 single words per item</p>
        <p>• Focus on work types (brickwork, plastering, excavation)</p>
        <p>• Include materials (cement, steel, concrete)</p>
        <p>• Include specifications (1:6, M25, 600mm)</p>
        <p>• Include HSR numbers if specified (7.21.2, 6.9)</p>
        <p>• NO location words (room, building) or action words (supplying, fixing)</p>
      </div>
    </div>
  );
};
