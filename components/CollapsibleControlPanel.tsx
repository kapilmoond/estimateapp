import React, { useState } from 'react';
import { ReferenceDoc } from '../types';
import { FileUpload } from './FileUpload';
import { KnowledgeBaseDisplay } from './KnowledgeBaseDisplay';

interface CollapsibleControlPanelProps {
  // File Upload Props
  onFileUpload: (newFiles: ReferenceDoc[]) => void;
  onFileRemove: (fileName: string) => void;
  uploadedFiles: ReferenceDoc[];
  isFileProcessing: boolean;
  setIsFileProcessing: (processing: boolean) => void;
  
  // Knowledge Base Props
  includeKnowledgeBase: boolean;
  onToggleInclude: (include: boolean) => void;
  onOpenManager: () => void;
  
  // Settings Props
  onOpenGuidelines: () => void;
  onOpenLLMSettings: () => void;
  onOpenKnowledgeBase: () => void;
  onOpenContextManager?: () => void;
  onOpenTemplateManager?: () => void;
  
  // Status Props
  guidelinesCount: number;
  currentProvider: string;
  outputMode: string;
  
  // Project Actions
  onNewProject: () => void;
  onToggleProjectData: () => void;
  onTestLLM: () => void;
}

export const CollapsibleControlPanel: React.FC<CollapsibleControlPanelProps> = ({
  onFileUpload,
  onFileRemove,
  uploadedFiles,
  isFileProcessing,
  setIsFileProcessing,
  includeKnowledgeBase,
  onToggleInclude,
  onOpenManager,
  onOpenGuidelines,
  onOpenLLMSettings,
  onOpenKnowledgeBase,
  onOpenContextManager,
  onOpenTemplateManager,
  guidelinesCount,
  currentProvider,
  outputMode,
  onNewProject,
  onToggleProjectData,
  onTestLLM
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      {/* Compact Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Primary Actions - Always Visible */}
          <div className="flex items-center gap-3">
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
            
            {/* Left Column - File Upload & Knowledge Base */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Reference Documents</h3>
                <div className="bg-white rounded-lg p-3 border">
                  <FileUpload
                    onFileUpload={onFileUpload}
                    onFileRemove={onFileRemove}
                    uploadedFiles={uploadedFiles}
                    isFileProcessing={isFileProcessing}
                    setIsFileProcessing={setIsFileProcessing}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Knowledge Base</h3>
                <div className="bg-white rounded-lg p-3 border">
                  <KnowledgeBaseDisplay
                    includeInPrompts={includeKnowledgeBase}
                    onToggleInclude={onToggleInclude}
                    onOpenManager={onOpenManager}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Settings & Actions */}
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
