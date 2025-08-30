import React, { useState } from 'react';
import { ChatMessage, ComponentDesign, TechnicalDrawing } from '../types';
import { TemplateService } from '../services/templateService';

interface SaveTemplateButtonProps {
  conversationHistory: ChatMessage[];
  finalizedScope: string;
  keywords: string[];
  hsrItems: any[];
  finalEstimate: string;
  designs: ComponentDesign[];
  drawings: TechnicalDrawing[];
  referenceText: string;
  disabled?: boolean;
}

export const SaveTemplateButton: React.FC<SaveTemplateButtonProps> = ({
  conversationHistory,
  finalizedScope,
  keywords,
  hsrItems,
  finalEstimate,
  designs,
  drawings,
  referenceText,
  disabled = false
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [projectType, setProjectType] = useState('');

  const canCreateTemplate = conversationHistory.length > 0 && 
    (finalizedScope.trim().length > 0 || designs.length > 0 || hsrItems.length > 0);

  const handleSaveTemplate = async () => {
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
      setShowForm(false);
      
      alert('Master template saved successfully! You can now use it in future projects.');
    } catch (error) {
      console.error('Template creation error:', error);
      alert(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const generateSuggestedName = () => {
    if (designs.length > 0) {
      return `${designs[0].componentName} Estimation Template`;
    } else if (finalizedScope.length > 0) {
      const scopeWords = finalizedScope.split(' ').slice(0, 3).join(' ');
      return `${scopeWords} Template`;
    } else {
      return `Project Template ${new Date().toLocaleDateString()}`;
    }
  };

  const generateSuggestedDescription = () => {
    const parts = [];
    if (finalizedScope.length > 0) {
      parts.push(`Project scope: ${finalizedScope.substring(0, 100)}...`);
    }
    if (designs.length > 0) {
      parts.push(`Includes ${designs.length} component design(s)`);
    }
    if (hsrItems.length > 0) {
      parts.push(`${hsrItems.length} HSR items identified`);
    }
    return parts.join('. ') || 'Comprehensive estimation template';
  };

  const handleShowForm = () => {
    setTemplateName(generateSuggestedName());
    setTemplateDescription(generateSuggestedDescription());
    setProjectType('General');
    setShowForm(true);
  };

  if (!canCreateTemplate || disabled) {
    return (
      <button
        disabled
        className="px-3 py-1 text-xs bg-gray-400 text-white rounded cursor-not-allowed"
        title="Complete some project work to save as template"
      >
        💾 Save Template
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleShowForm}
        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        title="Save current project as reusable template"
      >
        💾 Save Template
      </button>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Save as Master Template</h3>
              <p className="text-sm text-gray-600 mt-1">
                Create a reusable template from your current project progress
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Residential Foundation Estimation"
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Type *
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">Select project type...</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Renovation">Renovation</option>
                  <option value="Foundation">Foundation</option>
                  <option value="Structural">Structural</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe what this template covers and when to use it..."
                  className="w-full p-3 border rounded-lg resize-none"
                  rows={3}
                />
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <strong>Template will include:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• {conversationHistory.length} conversation messages</li>
                  {finalizedScope && <li>• Project scope and requirements</li>}
                  {designs.length > 0 && <li>• {designs.length} component design(s)</li>}
                  {drawings.length > 0 && <li>• {drawings.length} technical drawing(s)</li>}
                  {hsrItems.length > 0 && <li>• {hsrItems.length} HSR items</li>}
                  {keywords.length > 0 && <li>• {keywords.length} keywords</li>}
                </ul>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={isCreating || !templateName.trim() || !templateDescription.trim() || !projectType.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {isCreating ? '💾 Saving...' : '💾 Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
