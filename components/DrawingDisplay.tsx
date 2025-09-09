import React, { useState } from 'react';
import { TechnicalDrawing } from '../types';
import { DXFService, DXFStorageService } from '../services/dxfService';

interface DrawingDisplayProps {
  drawings: TechnicalDrawing[];
  onDrawingUpdate: () => void;
  onContextUpdate?: () => void;
}

export const DrawingDisplay: React.FC<DrawingDisplayProps> = ({ 
  drawings, 
  onDrawingUpdate,
  onContextUpdate 
}) => {
  const [selectedDrawing, setSelectedDrawing] = useState<TechnicalDrawing | null>(null);
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string>('');

  const handleDownloadDXF = (drawing: TechnicalDrawing) => {
    try {
      DXFService.downloadDXF(drawing);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download DXF file. Please try again.');
    }
  };

  const handleDeleteDrawing = async (drawingId: string) => {
    if (!confirm('Are you sure you want to delete this drawing?')) return;

    try {
      // Use unified deletion from EnhancedDrawingService
      const { EnhancedDrawingService } = await import('../services/drawingService');
      const success = await EnhancedDrawingService.deleteDrawing(drawingId);

      if (success) {
        onDrawingUpdate();
        if (selectedDrawing?.id === drawingId) {
          setSelectedDrawing(null);
        }
        if (onContextUpdate) {
          onContextUpdate();
        }
        console.log('Drawing deleted successfully from all storage systems');
      } else {
        alert('Failed to delete drawing.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete drawing. Please try again.');
    }
  };

  const handleToggleContext = (drawing: TechnicalDrawing) => {
    try {
      const updated = DXFStorageService.updateDrawing(drawing.id, {
        includeInContext: !drawing.includeInContext
      });
      
      if (updated) {
        onDrawingUpdate();
        if (onContextUpdate) {
          onContextUpdate();
        }
      }
    } catch (error) {
      console.error('Context toggle error:', error);
      alert('Failed to update drawing context setting.');
    }
  };

  const handleTestBackend = async () => {
    setIsTestingBackend(true);
    setBackendStatus('Testing backend connectivity...');
    
    try {
      const result = await DXFService.testBackendConnectivity();
      setBackendStatus(result.message);
      
      if (result.available) {
        // Generate a test drawing
        setBackendStatus('Backend available! Generating test drawing...');
        const testDrawing = await DXFService.generateTestDXF();
        DXFStorageService.saveDrawing(testDrawing);
        onDrawingUpdate();
        setBackendStatus('✅ Test drawing generated successfully!');
      }
    } catch (error) {
      setBackendStatus(`❌ Backend test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingBackend(false);
    }
  };

  const formatFileSize = (base64Content: string): string => {
    const sizeInBytes = (base64Content.length * 3) / 4;
    if (sizeInBytes < 1024) return `${sizeInBytes.toFixed(0)} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDrawingTypeIcon = (type: string) => {
    switch (type) {
      case 'plan':
        return '📐';
      case 'elevation':
        return '🏗️';
      case 'section':
        return '✂️';
      case 'detail':
        return '🔍';
      default:
        return '📋';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Technical Drawings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Professional CAD drawings with dimensions and annotations
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleTestBackend}
            disabled={isTestingBackend}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isTestingBackend ? 'Testing...' : 'Test Backend'}
          </button>
          
          <div className="text-sm text-gray-500 flex items-center">
            {drawings.length} drawing{drawings.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Backend Status */}
      {backendStatus && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          backendStatus.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
          backendStatus.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {backendStatus}
        </div>
      )}

      {drawings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📐</div>
          <h4 className="text-lg font-medium mb-2">No Technical Drawings</h4>
          <p className="text-sm">
            Switch to Drawing mode and request technical drawings like:
            <br />
            "Draw a foundation plan for 2-story building"
            <br />
            "Create beam elevation with dimensions"
          </p>
        </div>
      ) : (
        <>
          {/* Drawing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {drawings.map((drawing) => (
              <div
                key={drawing.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedDrawing?.id === drawing.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => setSelectedDrawing(drawing)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">
                      {getDrawingTypeIcon(drawing.metadata.drawingType)}
                    </span>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{drawing.title}</h4>
                      <p className="text-xs text-gray-500">
                        {drawing.metadata.drawingType} • {drawing.metadata.scale}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleContext(drawing);
                    }}
                    className={`text-xs px-2 py-1 rounded ${
                      drawing.includeInContext !== false
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {drawing.includeInContext !== false ? 'In Context' : 'Excluded'}
                  </button>
                </div>

                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {drawing.description}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{drawing.createdAt.toLocaleDateString()}</span>
                  <span>{formatFileSize(drawing.dxfContent)}</span>
                </div>

                {/* Drawing Features */}
                <div className="flex gap-1 mb-3">
                  {drawing.metadata.hasDimensions && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      📏 Dimensions
                    </span>
                  )}
                  {drawing.metadata.hasAnnotations && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      📝 Annotations
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadDXF(drawing);
                    }}
                    className="flex-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    📥 Download DXF
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDrawing(drawing.id);
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Drawing Details */}
          {selectedDrawing && (
            <div className="border-t pt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Drawing Details: {selectedDrawing.title}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Description</h5>
                  <p className="text-sm text-gray-600 mb-4">{selectedDrawing.description}</p>
                  
                  <h5 className="font-medium text-gray-700 mb-2">User Requirements</h5>
                  <p className="text-sm text-gray-600 mb-4">{selectedDrawing.userRequirements}</p>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Technical Specifications</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{selectedDrawing.metadata.drawingType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scale:</span>
                      <span className="font-medium">{selectedDrawing.metadata.scale}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dimensions:</span>
                      <span className="font-medium">
                        {selectedDrawing.metadata.dimensions.width} × {selectedDrawing.metadata.dimensions.height} {selectedDrawing.metadata.dimensions.units}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Layers:</span>
                      <span className="font-medium">{selectedDrawing.metadata.layers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Size:</span>
                      <span className="font-medium">{formatFileSize(selectedDrawing.dxfContent)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-700 mb-2">Layers</h5>
                    <div className="flex flex-wrap gap-1">
                      {selectedDrawing.metadata.layers.map((layer, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {layer}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
