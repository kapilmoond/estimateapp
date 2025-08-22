import React, { useState, useEffect } from 'react';
import { CADDrawingService } from '../services/cadDrawingService';
import { CADDrawingCanvas } from './CADDrawingCanvas';
import { CADDrawingData, CADLayer } from '../types';

interface CADDrawingManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDrawingUpdate: () => void;
  initialTitle?: string;
  initialDescription?: string;
}

export const CADDrawingManager: React.FC<CADDrawingManagerProps> = ({
  isOpen,
  onClose,
  onDrawingUpdate,
  initialTitle = '',
  initialDescription = ''
}) => {
  const [currentDrawing, setCurrentDrawing] = useState<CADDrawingData | null>(null);
  const [allDrawings, setAllDrawings] = useState<CADDrawingData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newDrawingTitle, setNewDrawingTitle] = useState(initialTitle);
  const [newDrawingDescription, setNewDrawingDescription] = useState(initialDescription);
  const [activeTab, setActiveTab] = useState<'canvas' | 'layers' | 'properties'>('canvas');

  useEffect(() => {
    if (isOpen) {
      loadAllDrawings();
      if (initialTitle && initialDescription) {
        setIsCreating(true);
      }
    }
  }, [isOpen, initialTitle, initialDescription]);

  const loadAllDrawings = () => {
    const drawings = CADDrawingService.loadAllDrawings();
    setAllDrawings(drawings);
  };

  const handleCreateNewDrawing = () => {
    if (!newDrawingTitle.trim()) {
      alert('Please enter a drawing title');
      return;
    }

    const drawing = CADDrawingService.createNewDrawing(newDrawingTitle, newDrawingDescription);
    CADDrawingService.saveDrawing(drawing);
    setCurrentDrawing(drawing);
    setIsCreating(false);
    setNewDrawingTitle('');
    setNewDrawingDescription('');
    loadAllDrawings();
    onDrawingUpdate();
  };

  const handleOpenDrawing = (drawing: CADDrawingData) => {
    setCurrentDrawing(drawing);
  };

  const handleDrawingUpdate = (updatedDrawing: CADDrawingData) => {
    CADDrawingService.saveDrawing(updatedDrawing);
    setCurrentDrawing(updatedDrawing);
    loadAllDrawings();
    onDrawingUpdate();
  };

  const handleDeleteDrawing = (drawingId: string) => {
    if (confirm('Are you sure you want to delete this drawing?')) {
      CADDrawingService.deleteDrawing(drawingId);
      if (currentDrawing?.id === drawingId) {
        setCurrentDrawing(null);
      }
      loadAllDrawings();
      onDrawingUpdate();
    }
  };

  const handleLayerToggle = (layerId: string, property: 'visible' | 'locked') => {
    if (!currentDrawing) return;

    const updatedLayers = currentDrawing.layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, [property]: !layer[property] }
        : layer
    );

    const updatedDrawing = {
      ...currentDrawing,
      layers: updatedLayers,
      modifiedAt: new Date()
    };

    handleDrawingUpdate(updatedDrawing);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Professional CAD Drawing System
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex h-[calc(95vh-80px)]">
          {/* Sidebar */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
            {/* Drawing List */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Drawings</h3>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  + New
                </button>
              </div>

              {isCreating && (
                <div className="mb-4 p-3 bg-white border border-gray-200 rounded">
                  <h4 className="font-medium mb-2">Create New Drawing</h4>
                  <input
                    type="text"
                    placeholder="Drawing title"
                    value={newDrawingTitle}
                    onChange={(e) => setNewDrawingTitle(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded mb-2 text-sm"
                  />
                  <textarea
                    placeholder="Description"
                    value={newDrawingDescription}
                    onChange={(e) => setNewDrawingDescription(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded mb-2 text-sm"
                    rows={2}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCreateNewDrawing}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allDrawings.map(drawing => (
                  <div
                    key={drawing.id}
                    className={`p-2 border rounded cursor-pointer transition-colors ${
                      currentDrawing?.id === drawing.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => handleOpenDrawing(drawing)}
                  >
                    <h4 className="font-medium text-sm">{drawing.title}</h4>
                    <p className="text-xs text-gray-600 truncate">{drawing.description}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {drawing.modifiedAt.toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDrawing(drawing.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            {currentDrawing && (
              <div className="border-b border-gray-200">
                <nav className="flex">
                  {[
                    { id: 'canvas', label: 'Canvas', icon: '🖼️' },
                    { id: 'layers', label: 'Layers', icon: '📚' },
                    { id: 'properties', label: 'Properties', icon: '⚙️' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 py-2 px-3 text-sm font-medium ${
                        activeTab === tab.id
                          ? 'border-b-2 border-blue-500 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            )}

            {/* Tab Content */}
            {currentDrawing && (
              <div className="flex-1 p-4 overflow-y-auto">
                {activeTab === 'layers' && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800 mb-3">Layer Management</h4>
                    {currentDrawing.layers.map(layer => (
                      <div
                        key={layer.id}
                        className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 border border-gray-300"
                            style={{ backgroundColor: layer.color }}
                          />
                          <span className="text-sm font-medium">{layer.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleLayerToggle(layer.id, 'visible')}
                            className={`p-1 text-xs rounded ${
                              layer.visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}
                            title="Toggle Visibility"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handleLayerToggle(layer.id, 'locked')}
                            className={`p-1 text-xs rounded ${
                              layer.locked ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                            }`}
                            title="Toggle Lock"
                          >
                            🔒
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'properties' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Drawing Properties</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={currentDrawing.title}
                          onChange={(e) => {
                            const updated = { ...currentDrawing, title: e.target.value };
                            handleDrawingUpdate(updated);
                          }}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Scale</label>
                        <select
                          value={currentDrawing.scale}
                          onChange={(e) => {
                            const updated = { ...currentDrawing, scale: e.target.value };
                            handleDrawingUpdate(updated);
                          }}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="1:1">1:1</option>
                          <option value="1:10">1:10</option>
                          <option value="1:20">1:20</option>
                          <option value="1:50">1:50</option>
                          <option value="1:100">1:100</option>
                          <option value="1:200">1:200</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Units</label>
                        <select
                          value={currentDrawing.units}
                          onChange={(e) => {
                            const updated = { ...currentDrawing, units: e.target.value as any };
                            handleDrawingUpdate(updated);
                          }}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="mm">Millimeters</option>
                          <option value="cm">Centimeters</option>
                          <option value="m">Meters</option>
                          <option value="in">Inches</option>
                          <option value="ft">Feet</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
                        <select
                          value={currentDrawing.paperSize}
                          onChange={(e) => {
                            const updated = { ...currentDrawing, paperSize: e.target.value as any };
                            handleDrawingUpdate(updated);
                          }}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="A4">A4</option>
                          <option value="A3">A3</option>
                          <option value="A2">A2</option>
                          <option value="A1">A1</option>
                          <option value="A0">A0</option>
                          <option value="Letter">Letter</option>
                          <option value="Legal">Legal</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col">
            {currentDrawing ? (
              <CADDrawingCanvas
                drawing={currentDrawing}
                onDrawingUpdate={handleDrawingUpdate}
                width={800}
                height={600}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="text-6xl mb-4">📐</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Professional CAD Drawing System
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Create technical drawings with professional CAD tools
                  </p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create New Drawing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
