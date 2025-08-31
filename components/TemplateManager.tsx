import React, { useState, useEffect } from 'react';
import { MasterTemplate, TemplateService } from '../services/templateService';
import { ChatMessage, ComponentDesign, TechnicalDrawing } from '../types';

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationHistory: ChatMessage[];
  finalizedScope: string;
  keywords: string[];
  hsrItems: any[];
  finalEstimate: string;
  designs: ComponentDesign[];
  drawings: TechnicalDrawing[];
  referenceText: string;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  isOpen,
  onClose,
  conversationHistory,
  finalizedScope,
  keywords,
  hsrItems,
  finalEstimate,
  designs,
  drawings,
  referenceText
}) => {
  const [templates, setTemplates] = useState<MasterTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [projectType, setProjectType] = useState('');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    const allTemplates = TemplateService.loadTemplates();
    setTemplates(allTemplates);
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !templateDescription.trim() || !projectType.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsCreating(true);
    try {
      await TemplateService.createMasterTemplate(
        templateName,
        templateDescription,
        projectType,
        conversationHistory,
        finalizedScope,
        keywords,
        hsrItems,
        finalEstimate,
        designs,
        drawings,
        referenceText
      );

      // Reset form
      setTemplateName('');
      setTemplateDescription('');
      setProjectType('');
      
      // Reload templates
      loadTemplates();
      
      alert('Master template created successfully!');
    } catch (error) {
      console.error('Template creation error:', error);
      alert(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      TemplateService.deleteTemplate(templateId);
      loadTemplates();
    }
  };

  const handleDownloadTemplate = (template: MasterTemplate) => {
    const content = `MASTER TEMPLATE: ${template.name}
Created: ${template.createdAt.toLocaleString()}
Project Type: ${template.projectType}
Description: ${template.description}
Usage Count: ${template.usageCount}

${template.stepByStepProcedure}

---
Template ID: ${template.id}
Tags: ${template.tags.join(', ')}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/[^a-z0-9]/gi, '_')}_template.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const canCreateTemplate = conversationHistory.length > 0 && finalizedScope.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b bg-green-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              📋 Master Template Manager
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Create and manage master templates from completed projects. Templates capture proven estimation procedures and best practices.
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Create New Template */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Master Template</h3>
            
            {!canCreateTemplate ? (
              <div className="text-center py-6 text-gray-500">
                <div className="text-4xl mb-2">⚠️</div>
                <p className="text-sm">
                  Complete a project with finalized scope to create a master template.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Residential Foundation Estimation"
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Type *</label>
                  <input
                    type="text"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    placeholder="e.g., Residential, Commercial, Infrastructure"
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Describe what this template covers and when to use it..."
                    className="w-full p-3 border rounded-lg resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <button
                    onClick={handleCreateTemplate}
                    disabled={isCreating || !templateName.trim() || !templateDescription.trim() || !projectType.trim()}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isCreating ? '🔄 Creating Template...' : '📋 Create Master Template'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Existing Templates */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Existing Templates ({templates.length})
            </h3>
            
            {templates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📋</div>
                <h4 className="text-lg font-medium mb-2">No Templates Created</h4>
                <p className="text-sm">Complete a project and create your first master template!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {templates.map(template => (
                  <div key={template.id} className="border rounded-lg bg-white">
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{template.projectType}</span>
                            <span>Used {template.usageCount} times</span>
                            <span>Created {template.createdAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadTemplate(template)}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            📄 Download
                          </button>
                          <button
                            onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
                            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                          >
                            {expandedTemplate === template.id ? 'Collapse' : 'View'}
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {expandedTemplate === template.id && (
                      <div className="p-4">
                        <h5 className="font-medium text-gray-700 mb-3">Step-by-Step Procedure:</h5>
                        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                            {template.stepByStepProcedure}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
