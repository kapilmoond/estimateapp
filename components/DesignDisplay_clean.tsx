import React, { useState } from 'react';
import { ComponentDesign } from '../types';
import { DesignService } from '../services/designService';

interface DesignDisplayProps {
  designs: ComponentDesign[];
  onDesignUpdate: () => void;
}

export const DesignDisplay: React.FC<DesignDisplayProps> = ({ designs, onDesignUpdate }) => {
  const [selectedDesign, setSelectedDesign] = useState<ComponentDesign | null>(null);
  const [isGeneratingHTML, setIsGeneratingHTML] = useState(false);

  const handleGenerateHTML = async (design: ComponentDesign) => {
    setIsGeneratingHTML(true);
    try {
      await DesignService.generateHTMLDesign(design);
      onDesignUpdate();
      alert('HTML design generated successfully!');
    } catch (error) {
      console.error('Error generating HTML:', error);
      alert('Failed to generate HTML design. Please try again.');
    } finally {
      setIsGeneratingHTML(false);
    }
  };

  const handleDownloadHTML = (design: ComponentDesign) => {
    try {
      DesignService.downloadHTMLDesign(design);
    } catch (error) {
      console.error('Error downloading HTML:', error);
      alert('Failed to download HTML design. Please generate HTML first.');
    }
  };

  const handleDeleteDesign = (designId: string) => {
    if (window.confirm('Are you sure you want to delete this design?')) {
      DesignService.deleteDesign(designId);
      onDesignUpdate();
      if (selectedDesign?.id === designId) {
        setSelectedDesign(null);
      }
    }
  };

  if (designs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No designs created yet. Use the Design mode to create component designs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-700">Component Designs</h3>
      
      {/* Design List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {designs.map((design) => (
          <div
            key={design.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedDesign?.id === design.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => setSelectedDesign(design)}
          >
            <h4 className="font-semibold text-gray-900 mb-2">{design.componentName}</h4>
            <p className="text-sm text-gray-600 mb-3">
              Created: {design.createdAt.toLocaleDateString()}
            </p>
            
            {/* Materials Summary */}
            {design.specifications.materials.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Materials:</p>
                <div className="flex flex-wrap gap-1">
                  {design.specifications.materials.slice(0, 3).map((material, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {material}
                    </span>
                  ))}
                  {design.specifications.materials.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{design.specifications.materials.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateHTML(design);
                }}
                disabled={isGeneratingHTML}
                className="flex-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isGeneratingHTML ? 'Generating...' : 'Generate HTML'}
              </button>
              
              {design.htmlContent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadHTML(design);
                  }}
                  className="flex-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Download HTML
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDesign(design.id);
                }}
                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Design Details */}
      {selectedDesign && (
        <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-semibold text-gray-900">
              {selectedDesign.componentName} - Design Details
            </h4>
            <button
              onClick={() => setSelectedDesign(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Design Content */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <h5 className="font-semibold text-gray-700 mb-2">Design Content</h5>
            <div className="max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {selectedDesign.designContent}
              </pre>
            </div>
          </div>

          {/* Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Materials */}
            {selectedDesign.specifications.materials.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-semibold text-gray-700 mb-2">Materials</h5>
                <ul className="space-y-1">
                  {selectedDesign.specifications.materials.map((material, index) => (
                    <li key={index} className="text-sm text-gray-600 capitalize">
                      {material}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dimensions */}
            {Object.keys(selectedDesign.specifications.dimensions).length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-semibold text-gray-700 mb-2">Key Dimensions</h5>
                <ul className="space-y-1">
                  {Object.entries(selectedDesign.specifications.dimensions).map(([key, value]) => (
                    <li key={key} className="text-sm text-gray-600">
                      <span className="font-medium">{key}:</span> {value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => {
                if (selectedDesign) {
                  handleGenerateHTML(selectedDesign);
                }
              }}
              disabled={isGeneratingHTML}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isGeneratingHTML ? 'Generating HTML...' : 'Generate HTML Design'}
            </button>
            
            {selectedDesign.htmlContent && (
              <button
                onClick={() => {
                  if (selectedDesign) {
                    handleDownloadHTML(selectedDesign);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Download HTML
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};