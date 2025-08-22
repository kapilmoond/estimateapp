import React, { useState, useEffect } from 'react';
import { UserGuideline } from '../types';
import { GuidelinesService } from '../services/guidelinesService';

interface GuidelinesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onGuidelinesUpdate: () => void;
}

export const GuidelinesManager: React.FC<GuidelinesManagerProps> = ({
  isOpen,
  onClose,
  onGuidelinesUpdate
}) => {
  const [guidelines, setGuidelines] = useState<UserGuideline[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newGuideline, setNewGuideline] = useState({
    title: '',
    content: '',
    category: 'general' as UserGuideline['category'],
    isActive: true
  });

  useEffect(() => {
    if (isOpen) {
      loadGuidelines();
    }
  }, [isOpen]);

  const loadGuidelines = () => {
    const loaded = GuidelinesService.loadGuidelines();
    setGuidelines(loaded);
  };

  const handleAddGuideline = () => {
    if (!newGuideline.title.trim() || !newGuideline.content.trim()) return;

    GuidelinesService.addGuideline(newGuideline);
    setNewGuideline({
      title: '',
      content: '',
      category: 'general',
      isActive: true
    });
    loadGuidelines();
    onGuidelinesUpdate();
  };

  const handleUpdateGuideline = (id: string, updates: Partial<UserGuideline>) => {
    GuidelinesService.updateGuideline(id, updates);
    loadGuidelines();
    onGuidelinesUpdate();
    setIsEditing(null);
  };

  const handleDeleteGuideline = (id: string) => {
    if (window.confirm('Are you sure you want to delete this guideline?')) {
      GuidelinesService.deleteGuideline(id);
      loadGuidelines();
      onGuidelinesUpdate();
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    GuidelinesService.updateGuideline(id, { isActive });
    loadGuidelines();
    onGuidelinesUpdate();
  };

  const handleExport = () => {
    const exported = GuidelinesService.exportGuidelines();
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hsr_guidelines.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (GuidelinesService.importGuidelines(content)) {
        loadGuidelines();
        onGuidelinesUpdate();
        alert('Guidelines imported successfully!');
      } else {
        alert('Failed to import guidelines. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const categorizedGuidelines = guidelines.reduce((acc, guideline) => {
    if (!acc[guideline.category]) acc[guideline.category] = [];
    acc[guideline.category].push(guideline);
    return acc;
  }, {} as Record<string, UserGuideline[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Guidelines Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Add New Guideline */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Add New Guideline</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Guideline Title"
                value={newGuideline.title}
                onChange={(e) => setNewGuideline({ ...newGuideline, title: e.target.value })}
                className="p-2 border border-gray-300 rounded-md"
              />
              <select
                value={newGuideline.category}
                onChange={(e) => setNewGuideline({ ...newGuideline, category: e.target.value as UserGuideline['category'] })}
                className="p-2 border border-gray-300 rounded-md"
              >
                <option value="general">General</option>
                <option value="scoping">Scoping</option>
                <option value="design">Design</option>
                <option value="drawing">Drawing</option>
                <option value="estimation">Estimation</option>
              </select>
            </div>
            <textarea
              placeholder="Guideline Content"
              value={newGuideline.content}
              onChange={(e) => setNewGuideline({ ...newGuideline, content: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={3}
            />
            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newGuideline.isActive}
                  onChange={(e) => setNewGuideline({ ...newGuideline, isActive: e.target.checked })}
                  className="mr-2"
                />
                Active
              </label>
              <button
                onClick={handleAddGuideline}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Guideline
              </button>
            </div>
          </div>

          {/* Import/Export */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Export Guidelines
            </button>
            <label className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 cursor-pointer">
              Import Guidelines
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>

          {/* Guidelines by Category */}
          {Object.entries(categorizedGuidelines).map(([category, categoryGuidelines]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold mb-3 capitalize">{category} Guidelines</h3>
              <div className="space-y-3">
                {categoryGuidelines.map((guideline) => (
                  <div
                    key={guideline.id}
                    className={`p-4 border rounded-lg ${guideline.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    {isEditing === guideline.id ? (
                      <EditGuidelineForm
                        guideline={guideline}
                        onSave={(updates) => handleUpdateGuideline(guideline.id, updates)}
                        onCancel={() => setIsEditing(null)}
                      />
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{guideline.title}</h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleActive(guideline.id, !guideline.isActive)}
                              className={`px-2 py-1 text-xs rounded ${
                                guideline.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {guideline.isActive ? 'Active' : 'Inactive'}
                            </button>
                            <button
                              onClick={() => setIsEditing(guideline.id)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteGuideline(guideline.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-700">{guideline.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface EditGuidelineFormProps {
  guideline: UserGuideline;
  onSave: (updates: Partial<UserGuideline>) => void;
  onCancel: () => void;
}

const EditGuidelineForm: React.FC<EditGuidelineFormProps> = ({ guideline, onSave, onCancel }) => {
  const [title, setTitle] = useState(guideline.title);
  const [content, setContent] = useState(guideline.content);
  const [category, setCategory] = useState(guideline.category);
  const [isActive, setIsActive] = useState(guideline.isActive);

  const handleSave = () => {
    onSave({ title, content, category, isActive });
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as UserGuideline['category'])}
        className="w-full p-2 border border-gray-300 rounded-md"
      >
        <option value="general">General</option>
        <option value="scoping">Scoping</option>
        <option value="design">Design</option>
        <option value="drawing">Drawing</option>
        <option value="estimation">Estimation</option>
      </select>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md"
        rows={3}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mr-2"
          />
          Active
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
