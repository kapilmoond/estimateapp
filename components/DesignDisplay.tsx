import React from 'react';
import { ComponentDesign } from '../types';
import { DesignService } from '../services/designService';

interface DesignDisplayProps {
  designs: ComponentDesign[];
  onDesignUpdate: () => void;
  onContextUpdate?: () => void;
}

export const DesignDisplay: React.FC<DesignDisplayProps> = ({ designs, onDesignUpdate }) => {
  const handleClearDesigns = () => {
    if (confirm('Are you sure you want to clear all designs? This action cannot be undone.')) {
      DesignService.clearAllDesigns();
      onDesignUpdate();
    }
  };

  const handleDownloadDesign = (design: ComponentDesign) => {
    const content = `${design.componentName} - Design Document
Generated on: ${new Date(design.createdAt).toLocaleString()}

${design.designContent}

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
        <div className="space-y-6">
          {designs.map((design) => (
            <div key={design.id} className="border rounded-lg p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">{design.componentName}</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadDesign(design)}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Download design as text file"
                  >
                    📄 Download
                  </button>
                  <span className="text-xs text-gray-500">
                    {new Date(design.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border">
                <h5 className="font-medium text-gray-700 mb-3">Design Content:</h5>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                    {design.designContent}
                  </pre>
                </div>
              </div>

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
          ))}
        </div>
      )}
    </div>
  );
};
