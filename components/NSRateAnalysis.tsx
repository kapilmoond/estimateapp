import React, { useState } from 'react';
import { NSRateAnalysisService, RateAnalysisResult } from '../services/nsRateAnalysisService';
import { HsrItem } from '../types';

interface NSRateAnalysisProps {
  projectContext: string;
  hsrItems: HsrItem[];
  onClose: () => void;
}

export const NSRateAnalysis: React.FC<NSRateAnalysisProps> = ({
  projectContext,
  hsrItems,
  onClose
}) => {
  const [userInstructions, setUserInstructions] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<RateAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAnalysis = async () => {
    if (!userInstructions.trim()) {
      setError('Please provide instructions for the rate analysis.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const analysisResult = await NSRateAnalysisService.generateRateAnalysis(
        userInstructions,
        projectContext,
        hsrItems,
        useWebSearch,
        useKnowledgeBase
      );

      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate rate analysis');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = () => {
    if (result) {
      const filename = `ns_rate_analysis_${new Date().toISOString().split('T')[0]}.html`;
      NSRateAnalysisService.downloadHTMLReport(result.htmlReport, filename);
    }
  };

  const handlePreviewReport = () => {
    if (result) {
      NSRateAnalysisService.previewHTMLReport(result.htmlReport);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b bg-orange-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              📊 NS Item Rate Analysis
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Generate comprehensive rate analysis for Non-Standard (NS) items using web search and knowledge base data.
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!result ? (
            <div className="space-y-6">
              {/* Instructions Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Analysis Instructions
                </label>
                <textarea
                  value={userInstructions}
                  onChange={(e) => setUserInstructions(e.target.value)}
                  placeholder="Specify which NS items to analyze or provide specific requirements (e.g., 'Analyze custom steel fabrication rates', 'Focus on specialized equipment costs', 'All NS items in the project')"
                  className="w-full p-3 border border-gray-300 rounded-md resize-none"
                  rows={4}
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useWebSearch"
                    checked={useWebSearch}
                    onChange={(e) => setUseWebSearch(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="useWebSearch" className="text-sm text-gray-700">
                    <strong>Use Web Search:</strong> Fetch current market rates and pricing data
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useKnowledgeBase"
                    checked={useKnowledgeBase}
                    onChange={(e) => setUseKnowledgeBase(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="useKnowledgeBase" className="text-sm text-gray-700">
                    <strong>Use Knowledge Base:</strong> Include uploaded documents and project data
                  </label>
                </div>
              </div>

              {/* Project Context Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Available Data:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">HSR Items:</span> {hsrItems.length} items
                  </div>
                  <div>
                    <span className="font-medium">Project Context:</span> {projectContext.length} characters
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center">
                    <span className="text-red-600 mr-2">⚠️</span>
                    <span className="text-red-800">{error}</span>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleGenerateAnalysis}
                  disabled={isGenerating || !userInstructions.trim()}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
                >
                  {isGenerating ? '🔄 Generating Analysis...' : '📊 Generate Rate Analysis'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Analysis Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  ✅ Analysis Complete
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.totalItems}</div>
                    <div className="text-green-800">NS Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(result.averageVariance * 100).toFixed(1)}%
                    </div>
                    <div className="text-blue-800">Avg Variance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {result.recommendations.length}
                    </div>
                    <div className="text-purple-800">Recommendations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {result.analysisDate.toLocaleDateString()}
                    </div>
                    <div className="text-orange-800">Generated</div>
                  </div>
                </div>
              </div>

              {/* NS Items Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">NS Items Analyzed:</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {result.nsItems.map((item, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.itemCode}: {item.description}</h4>
                          <p className="text-sm text-gray-600">Unit: {item.unit}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">₹{item.estimatedRate.toFixed(2)}</div>
                          {item.marketRates && (
                            <div className="text-xs text-gray-500">
                              Market: ₹{item.marketRates.min.toFixed(2)} - ₹{item.marketRates.max.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations:</h3>
                <div className="space-y-2">
                  {result.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span className="text-gray-700">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handlePreviewReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  👁️ Preview Report
                </button>
                <button
                  onClick={handleDownloadReport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  📥 Download HTML Report
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  🔄 Generate New Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
