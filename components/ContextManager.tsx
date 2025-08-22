import React, { useState, useEffect } from 'react';
import { ContextService } from '../services/contextService';
import { ContextState, ContextItem } from '../types';

interface ContextManagerProps {
  onContextUpdate: () => void;
  showCompactView?: boolean;
}

export const ContextManager: React.FC<ContextManagerProps> = ({
  onContextUpdate,
  showCompactView = false
}) => {
  const [contextState, setContextState] = useState<ContextState | null>(null);
  const [isExpanded, setIsExpanded] = useState(!showCompactView);

  useEffect(() => {
    loadContextState();
  }, []);

  const loadContextState = () => {
    const state = ContextService.getCurrentContext();
    setContextState(state);
  };

  const handleToggleItem = (itemId: string) => {
    ContextService.toggleContextItem(itemId);
    loadContextState();
    onContextUpdate();
  };

  const handleClearContext = () => {
    if (confirm('Are you sure you want to clear all context data?')) {
      ContextService.clearContext();
      loadContextState();
      onContextUpdate();
    }
  };

  if (!contextState || contextState.activeContextItems.length === 0) {
    return showCompactView ? (
      <div className="text-sm text-gray-500 mb-2">
        No context data available
      </div>
    ) : null;
  }

  const activeItems = contextState.activeContextItems.filter(item => item.includeInContext);

  if (showCompactView) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-blue-800">
              Context: {activeItems.length} items active
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {isExpanded && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-blue-700">
              {contextState.compactSummary}
            </div>
            <div className="flex flex-wrap gap-1">
              {activeItems.map(item => (
                <span
                  key={item.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                >
                  {item.type === 'design' ? '🎨' : 
                   item.type === 'drawing' ? '📐' : 
                   item.type === 'discussion' ? '💬' : 
                   item.type === 'estimate' ? '💰' : '📋'}
                  {item.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Project Context</h3>
        <div className="flex space-x-2">
          <button
            onClick={loadContextState}
            className="text-gray-500 hover:text-gray-700"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleClearContext}
            className="text-red-500 hover:text-red-700"
            title="Clear All Context"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Project Summary */}
      <div className="mb-4 p-3 bg-gray-50 rounded border">
        <h4 className="font-medium text-gray-700 mb-2">Project Summary</h4>
        <p className="text-sm text-gray-600">{contextState.compactSummary}</p>
      </div>

      {/* Context Items */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700">Context Items ({contextState.activeContextItems.length})</h4>
        
        {contextState.activeContextItems.length === 0 ? (
          <p className="text-sm text-gray-500">No context items available</p>
        ) : (
          <div className="space-y-2">
            {contextState.activeContextItems.map(item => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 border rounded ${
                  item.includeInContext ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">
                    {item.type === 'design' ? '🎨' : 
                     item.type === 'drawing' ? '📐' : 
                     item.type === 'discussion' ? '💬' : 
                     item.type === 'estimate' ? '💰' : '📋'}
                  </span>
                  <div>
                    <h5 className="font-medium text-gray-800">{item.title}</h5>
                    <p className="text-sm text-gray-600">
                      {item.content.substring(0, 100)}
                      {item.content.length > 100 && '...'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.createdAt.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      item.includeInContext
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {item.includeInContext ? 'Included' : 'Excluded'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-lg font-bold text-blue-600">{activeItems.length}</div>
            <div className="text-xs text-blue-800">Active Items</div>
          </div>
          <div className="bg-purple-50 p-2 rounded">
            <div className="text-lg font-bold text-purple-600">
              {contextState.activeContextItems.length}
            </div>
            <div className="text-xs text-purple-800">Total Items</div>
          </div>
        </div>
      </div>
    </div>
  );
};
