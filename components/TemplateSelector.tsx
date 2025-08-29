import React, { useState, useEffect } from 'react';
import { MasterTemplate, TemplateService } from '../services/templateService';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelected: (templates: MasterTemplate[], customInstructions: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  isOpen,
  onClose,
  onTemplateSelected
}) => {
  const [templates, setTemplates] = useState<MasterTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    const allTemplates = TemplateService.loadTemplates();
    setTemplates(allTemplates);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.projectType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || 
      template.projectType.toLowerCase() === filterType.toLowerCase();
    
    return matchesSearch && matchesType;
  });

  const handleTemplateToggle = (templateId: string) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedTemplates(newSelected);
  };

  const handleApplyTemplates = () => {
    const selectedTemplateObjects = templates.filter(t => selectedTemplates.has(t.id));
    
    // Mark templates as used
    selectedTemplateObjects.forEach(template => {
      TemplateService.markTemplateUsed(template.id);
    });
    
    onTemplateSelected(selectedTemplateObjects, customInstructions);
    onClose();
  };

  const getProjectTypes = () => {
    const types = [...new Set(templates.map(t => t.projectType))];
    return types;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b bg-blue-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              📋 Select Master Templates
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Choose one or more master templates to guide your estimation process. Templates provide proven procedures and best practices.
          </p>
        </div>

        <div className="p-6">
          {/* Search and Filter */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Templates</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, description, or project type..."
                className="w-full p-3 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="all">All Project Types</option>
                {getProjectTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Enter any specific modifications or additional requirements for the selected templates..."
              className="w-full p-3 border rounded-lg resize-none"
              rows={3}
            />
          </div>

          {/* Templates List */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Available Templates ({filteredTemplates.length})
            </h3>
            
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📋</div>
                <h4 className="text-lg font-medium mb-2">No Templates Found</h4>
                <p className="text-sm">
                  {templates.length === 0 
                    ? 'No master templates created yet. Complete a project and create your first template!'
                    : 'No templates match your search criteria. Try adjusting your search or filter.'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTemplates.has(template.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTemplateToggle(template.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={selectedTemplates.has(template.id)}
                            onChange={() => handleTemplateToggle(template.id)}
                            className="rounded"
                          />
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded">{template.projectType}</span>
                          <span>Used {template.usageCount} times</span>
                          <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                        </div>
                        {template.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedTemplates.size > 0 && (
                <span>{selectedTemplates.size} template(s) selected</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Skip Templates
              </button>
              <button
                onClick={handleApplyTemplates}
                disabled={selectedTemplates.size === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                Apply Selected Templates
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
