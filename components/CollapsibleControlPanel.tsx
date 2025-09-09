import React, { useState } from 'react';
import { ReferenceDoc, ChatMessage, ComponentDesign, TechnicalDrawing } from '../types';
import { SaveTemplateButton } from './SaveTemplateButton';

interface CollapsibleControlPanelProps {
  // Settings Props
  onOpenGuidelines: () => void;
  onOpenLLMSettings: () => void;
  onOpenDrawingSettings?: () => void;
  onOpenKnowledgeBase: () => void;
  onOpenContextManager?: () => void;
  onOpenTemplateManager?: () => void;
  onOpenTemplateSelector?: () => void;
  onOpenProjectManager?: () => void;
  onOpenStorageManager?: () => void;

  // Status Props
  guidelinesCount: number;
  currentProvider: string;
  outputMode: string;
  uploadedFiles: ReferenceDoc[];

  // Project Actions
  onNewProject: () => void;
  onToggleProjectData: () => void;
  onTestLLM: () => void;

  // Template Props
  conversationHistory: ChatMessage[];
  finalizedScope: string;
  keywords: string[];
  hsrItems: any[];
  finalEstimate: string;
  designs: ComponentDesign[];
  drawings: TechnicalDrawing[];
  referenceText: string;
}

export const CollapsibleControlPanel: React.FC<CollapsibleControlPanelProps> = ({
  onOpenGuidelines,
  onOpenLLMSettings,
  onOpenDrawingSettings,
  onOpenKnowledgeBase,
  onOpenContextManager,
  onOpenTemplateManager,
  onOpenTemplateSelector,
  onOpenProjectManager,
  onOpenStorageManager,
  guidelinesCount,
  currentProvider,
  outputMode,
  uploadedFiles,
  onNewProject,
  onToggleProjectData,
  onTestLLM,
  conversationHistory,
  finalizedScope,
  keywords,
  hsrItems,
  finalEstimate,
  designs,
  drawings,
  referenceText
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Compact Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Primary Actions - Always Visible */}
          <div className="flex items-center gap-3">
            {onOpenProjectManager && (
              <button
                onClick={onOpenProjectManager}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                📁 Projects
              </button>
            )}

            {onOpenStorageManager && (
              <button
                onClick={onOpenStorageManager}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                💾 Storage
              </button>
            )}

            <button
              onClick={onNewProject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              🔄 New Project
            </button>

            <button
              onClick={onToggleProjectData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              📊 Project Data
            </button>

            {onOpenTemplateSelector && (
              <button
                onClick={onOpenTemplateSelector}
                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs"
                title="Use existing templates"
              >
                📋 Use Template
              </button>
            )}

            <SaveTemplateButton
              conversationHistory={conversationHistory}
              finalizedScope={finalizedScope}
              keywords={keywords}
              hsrItems={hsrItems}
              finalEstimate={finalEstimate}
              designs={designs}
              drawings={drawings}
              referenceText={referenceText}
            />

            <button
              onClick={onTestLLM}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs"
              title="Test LLM Service"
            >
              🧪 Test LLM
            </button>
          </div>

          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
          >
            ⚙️ Controls
            <span className="text-xs">
              {isExpanded ? '▲' : '▼'}
            </span>
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left Column - Main Settings */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Settings & Configuration</h3>
                <div className="bg-white rounded-lg p-3 border space-y-2">

                  <button
                    onClick={onOpenGuidelines}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      📋 Guidelines
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {guidelinesCount} active
                    </span>
                  </button>

                  <button
                    onClick={onOpenLLMSettings}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      🤖 LLM Provider
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {currentProvider}
                    </span>
                  </button>

                  {onOpenDrawingSettings && (
                    <button
                      onClick={onOpenDrawingSettings}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      📐 Drawing Settings
                    </button>
                  )}

                  <button
                    onClick={onOpenKnowledgeBase}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                  >
                    📚 Knowledge Base Manager
                  </button>

                  {outputMode === 'discussion' && onOpenContextManager && (
                    <button
                      onClick={onOpenContextManager}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      🧹 Context Manager
                    </button>
                  )}

                  {onOpenTemplateManager && (
                    <button
                      onClick={onOpenTemplateManager}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      📋 Template Manager
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Quick Status */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Status</h3>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Mode:</span>
                      <span className="ml-2 font-medium capitalize">{outputMode}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Files:</span>
                      <span className="ml-2 font-medium">{uploadedFiles.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Guidelines:</span>
                      <span className="ml-2 font-medium">{guidelinesCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Provider:</span>
                      <span className="ml-2 font-medium">{currentProvider}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
