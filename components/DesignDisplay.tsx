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
          {designs.map((design) => (
            <div key={design.id} className="border rounded-lg p-4">
              <h4 className="font-semibold">{design.componentName}</h4>
              <p className="text-sm text-gray-600 mt-2">{design.designContent.substring(0, 200)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
