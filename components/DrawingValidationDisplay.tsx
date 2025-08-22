import React, { useState } from 'react';
import { DrawingValidationResult, ValidationIssue } from '../services/drawingValidationService';

interface DrawingValidationDisplayProps {
  validationResult: DrawingValidationResult;
  onProceedToCAD: (correctedSpec: string) => void;
  onRegenerate: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

export const DrawingValidationDisplay: React.FC<DrawingValidationDisplayProps> = ({
  validationResult,
  onProceedToCAD,
  onRegenerate,
  onCancel,
  isVisible
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  if (!isVisible) return null;

  const criticalIssues = validationResult.issues.filter(issue => issue.severity === 'critical');
  const warningIssues = validationResult.issues.filter(issue => issue.severity === 'warning');
  const suggestionIssues = validationResult.issues.filter(issue => issue.severity === 'suggestion');

  const getIssueIcon = (type: ValidationIssue['type']): string => {
    switch (type) {
      case 'overlap': return '🔄';
      case 'missing_element': return '❌';
      case 'dimension_error': return '📏';
      case 'layout_issue': return '📐';
      case 'title_block_error': return '📋';
      case 'scale_issue': return '⚖️';
      case 'annotation_error': return '📝';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: ValidationIssue['severity']): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'suggestion': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const toggleIssueExpansion = (index: number) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIssues(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Drawing Validation Results</h2>
              <p className="text-blue-100 mt-1">
                AI analysis of drawing specification for quality assurance
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full font-semibold ${
              validationResult.isValid 
                ? 'bg-green-500 text-white' 
                : 'bg-yellow-500 text-black'
            }`}>
              {validationResult.isValid ? '✅ READY' : '⚠️ NEEDS REVIEW'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Issues Summary */}
          {validationResult.issues.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Issues Identified</h3>
              
              {/* Issue Statistics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{criticalIssues.length}</div>
                  <div className="text-sm text-red-800">Critical Issues</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{warningIssues.length}</div>
                  <div className="text-sm text-yellow-800">Warnings</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{suggestionIssues.length}</div>
                  <div className="text-sm text-blue-800">Suggestions</div>
                </div>
              </div>

              {/* Issue Details */}
              <div className="space-y-3">
                {validationResult.issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleIssueExpansion(index)}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{getIssueIcon(issue.type)}</span>
                        <div>
                          <h4 className="font-semibold capitalize">
                            {issue.type.replace('_', ' ')} 
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                              issue.severity === 'critical' ? 'bg-red-200 text-red-800' :
                              issue.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {issue.severity}
                            </span>
                          </h4>
                          <p className="text-sm">{issue.description}</p>
                        </div>
                      </div>
                      <svg 
                        className={`w-5 h-5 transform transition-transform ${
                          expandedIssues.has(index) ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {expandedIssues.has(index) && (
                      <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                        {issue.location && (
                          <p className="text-sm mb-2">
                            <strong>Location:</strong> {issue.location}
                          </p>
                        )}
                        <p className="text-sm">
                          <strong>Suggested Fix:</strong> {issue.suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {validationResult.recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Recommendations</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {validationResult.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2 text-green-800">
                      <span className="text-green-600 mt-1">💡</span>
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Specification Comparison */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Drawing Specification</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowOriginal(false)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    !showOriginal 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Corrected
                </button>
                <button
                  onClick={() => setShowOriginal(true)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    showOriginal 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Original
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {showOriginal ? validationResult.originalSpecification : validationResult.correctedSpecification}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {validationResult.isValid 
                ? 'Specification is ready for CAD drawing generation'
                : `${criticalIssues.length} critical issues need attention`
              }
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={onRegenerate}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
              >
                Regenerate Specification
              </button>
              <button
                onClick={() => onProceedToCAD(validationResult.correctedSpecification)}
                className={`px-6 py-2 rounded-lg font-medium ${
                  validationResult.isValid
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {validationResult.isValid ? '✅ Proceed to CAD' : '⚠️ Proceed Anyway'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
