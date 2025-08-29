import React, { useState } from 'react';
import { ComponentDesign } from '../types';
import { DesignService } from '../services/designService';

interface DesignDisplayProps {
  designs: ComponentDesign[];
  onDesignUpdate: () => void;
  onContextUpdate?: () => void;
  onEditDesign?: (design: ComponentDesign, editInstruction: string) => Promise<void>;
  onGenerateHTML?: (design: ComponentDesign, htmlInstruction: string) => Promise<void>;
}

export const DesignDisplay: React.FC<DesignDisplayProps> = ({
  designs,
  onDesignUpdate,
  onEditDesign,
  onGenerateHTML
}) => {
  const [expandedDesigns, setExpandedDesigns] = useState<Set<string>>(new Set());
  const [editingDesign, setEditingDesign] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [htmlInstruction, setHtmlInstruction] = useState('');
  const [generatingHTML, setGeneratingHTML] = useState<string | null>(null);

  const handleClearDesigns = () => {
    if (confirm('Are you sure you want to clear all designs? This action cannot be undone.')) {
      DesignService.clearAllDesigns();
      onDesignUpdate();
    }
  };

  const toggleExpanded = (designId: string) => {
    const newExpanded = new Set(expandedDesigns);
    if (newExpanded.has(designId)) {
      newExpanded.delete(designId);
    } else {
      newExpanded.add(designId);
    }
    setExpandedDesigns(newExpanded);
  };

  const handleEditSubmit = async (design: ComponentDesign) => {
    if (!editInstruction.trim() || !onEditDesign) return;

    try {
      await onEditDesign(design, editInstruction);
      setEditingDesign(null);
      setEditInstruction('');
    } catch (error) {
      console.error('Edit error:', error);
    }
  };

  const handleHTMLGeneration = async (design: ComponentDesign) => {
    if (!onGenerateHTML) return;

    try {
      setGeneratingHTML(design.id);
      await onGenerateHTML(design, htmlInstruction);
      setHtmlInstruction('');
    } catch (error) {
      console.error('HTML generation error:', error);
    } finally {
      setGeneratingHTML(null);
    }
  };

  const formatDesignContent = (content: string): string => {
    // Remove ** and make content bold, also handle single *
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  };

  const handleContextToggle = (design: ComponentDesign) => {
    const updatedDesign = { ...design, includeInContext: !design.includeInContext };
    DesignService.updateDesign(updatedDesign);
    onDesignUpdate();
  };

  const handleDownloadDesign = (design: ComponentDesign) => {
    // Format content exactly as shown in UI (with bold formatting converted to plain text)
    const cleanContent = design.designContent
      .replace(/<strong>(.*?)<\/strong>/g, '$1')  // Remove HTML bold tags
      .replace(/\*\*(.*?)\*\*/g, '$1')           // Remove ** formatting
      .replace(/\*(.*?)\*/g, '$1');              // Remove * formatting

    const content = `${design.componentName} - Design Document
Generated on: ${new Date(design.createdAt).toLocaleString()}

${cleanContent}

Materials:
${design.specifications.materials.map(m => `• ${m}`).join('\n')}

Dimensions:
${Object.entries(design.specifications.dimensions).map(([k, v]) => `${k}: ${v}`).join('\n')}

Calculations:
${design.specifications.calculations}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${design.componentName.replace(/[^a-z0-9]/gi, '_')}_design.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Component Designs</h3>
        {designs.length > 0 && (
          <button
            onClick={handleClearDesigns}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
      {designs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🎨</div>
          <h4 className="text-lg font-medium mb-2">No Component Designs</h4>
          <p className="text-sm">Switch to Design mode to create component designs</p>
        </div>
      ) : (
        <div className="space-y-4">
          {designs.map((design) => {
            const isExpanded = expandedDesigns.has(design.id);
            const isEditing = editingDesign === design.id;
            const isGeneratingHTMLForThis = generatingHTML === design.id;

            return (
              <div key={design.id} className="border rounded-lg bg-white shadow-sm">
                {/* Header */}
                <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpanded(design.id)}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        {isExpanded ? '📖' : '📋'}
                      </button>
                      <h4 className="text-lg font-semibold text-gray-900">{design.componentName}</h4>
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                        {new Date(design.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Context Toggle */}
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={design.includeInContext !== false}
                          onChange={() => handleContextToggle(design)}
                          className="rounded"
                        />
                        <span className="text-gray-600">Include in Context</span>
                      </label>

                      {/* Action Buttons */}
                      <button
                        onClick={() => setEditingDesign(isEditing ? null : design.id)}
                        className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                        title="Edit/Improve design"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => handleDownloadDesign(design)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        title="Download design as text file"
                      >
                        📄 Download
                      </button>

                      <button
                        onClick={() => toggleExpanded(design.id)}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit Interface */}
                {isEditing && (
                  <div className="p-4 bg-yellow-50 border-b">
                    <h5 className="font-medium text-gray-700 mb-2">Edit/Improve Design:</h5>
                    <textarea
                      value={editInstruction}
                      onChange={(e) => setEditInstruction(e.target.value)}
                      placeholder="Enter your improvement instructions (e.g., 'Add more details about foundation depth', 'Include seismic considerations', etc.)"
                      className="w-full p-3 border rounded-lg resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEditSubmit(design)}
                        disabled={!editInstruction.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm"
                      >
                        🔄 Apply Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditingDesign(null);
                          setEditInstruction('');
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="p-4">
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <h5 className="font-medium text-gray-700 mb-3">Design Content:</h5>
                      <div className="prose prose-sm max-w-none">
                        <div
                          className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatDesignContent(design.designContent) }}
                        />
                      </div>
                    </div>

                    {/* HTML Generation Interface */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                      <h5 className="font-medium text-gray-700 mb-2">Generate HTML Output:</h5>
                      <textarea
                        value={htmlInstruction}
                        onChange={(e) => setHtmlInstruction(e.target.value)}
                        placeholder="Optional: Enter specific HTML formatting instructions (e.g., 'Include a professional header', 'Add company logo placeholder', 'Format as technical specification sheet')"
                        className="w-full p-3 border rounded-lg resize-none mb-2"
                        rows={2}
                      />
                      <button
                        onClick={() => handleHTMLGeneration(design)}
                        disabled={isGeneratingHTMLForThis}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
                      >
                        {isGeneratingHTMLForThis ? '🔄 Generating...' : '🌐 Generate HTML'}
                      </button>
                    </div>

                    {/* Specifications */}
                    {design.specifications && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-3 border">
                          <h6 className="font-medium text-gray-700 mb-2">Materials:</h6>
                          <ul className="text-sm text-gray-600">
                            {design.specifications.materials.map((material, idx) => (
                              <li key={idx}>• {material}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-white rounded-lg p-3 border">
                          <h6 className="font-medium text-gray-700 mb-2">Dimensions:</h6>
                          <div className="text-sm text-gray-600">
                            {Object.entries(design.specifications.dimensions).map(([key, value]) => (
                              <div key={key}>{key}: {value}</div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 border">
                          <h6 className="font-medium text-gray-700 mb-2">Calculations:</h6>
                          <p className="text-sm text-gray-600">{design.specifications.calculations}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
