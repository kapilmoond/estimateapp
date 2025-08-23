import React, { useState } from 'react';
import { TechnicalDrawing } from '../types';
import { DXFService, DXFStorageService } from '../services/dxfService';
import { DrawingService } from '../services/drawingService';

interface DrawingDisplayProps {
  drawings: TechnicalDrawing[];
  onDrawingUpdate: () => void;
  onRegenerateDrawing?: (drawingId: string, instructions: string) => void;
}

export const DrawingDisplay: React.FC<DrawingDisplayProps> = ({ drawings, onDrawingUpdate, onRegenerateDrawing }) => {
  const [selectedDrawing, setSelectedDrawing] = useState<TechnicalDrawing | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationInstructions, setRegenerationInstructions] = useState('');
  const [dxfPreview, setDxfPreview] = useState<string>('');

  // Load DXF preview when drawing is selected
  React.useEffect(() => {
    if (selectedDrawing) {
      loadDXFPreview();
    }
  }, [selectedDrawing]);

  // Auto-select first drawing
  React.useEffect(() => {
    if (drawings.length > 0 && !selectedDrawing) {
      setSelectedDrawing(drawings[0]);
    }
  }, [drawings, selectedDrawing]);

  const loadDXFPreview = async () => {
    if (!selectedDrawing) return;

    try {
      const preview = await DXFService.getDXFPreview(selectedDrawing);
      setDxfPreview(preview);
    } catch (error) {
      console.error('Failed to load DXF preview:', error);
      // Use placeholder if preview fails
      setDxfPreview(createPlaceholderSVG(selectedDrawing.title));
    }
  };

  const createPlaceholderSVG = (title: string): string => {
    return `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
        <text x="400" y="280" text-anchor="middle" font-family="Arial" font-size="24" fill="#6c757d">
          🏗️ Professional DXF Drawing
        </text>
        <text x="400" y="320" text-anchor="middle" font-family="Arial" font-size="18" fill="#6c757d">
          ${title}
        </text>
        <text x="400" y="360" text-anchor="middle" font-family="Arial" font-size="14" fill="#6c757d">
          Download DXF file to view in CAD software
        </text>
        <rect x="350" y="380" width="100" height="40" fill="#007bff" rx="5"/>
        <text x="400" y="405" text-anchor="middle" font-family="Arial" font-size="14" fill="white">
          Download DXF
        </text>
      </svg>
    `;
  };

  const handleDeleteDrawing = (drawingId: string) => {
    if (window.confirm('Are you sure you want to delete this drawing?')) {
      DXFStorageService.deleteDrawing(drawingId);
      onDrawingUpdate();
      if (selectedDrawing?.id === drawingId) {
        setSelectedDrawing(null);
      }
    }
  };

  const handleDownloadDXF = async (drawing: TechnicalDrawing) => {
    try {
      await DXFService.downloadDXF(drawing);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download DXF file. Please try again.');
    }
  };



  const handlePrintDrawing = (drawing: TechnicalDrawing) => {
    DrawingService.printDrawing(drawing);
  };

  const handleRegenerateWithInstructions = async () => {
    if (!selectedDrawing || !regenerationInstructions.trim()) {
      alert('Please provide instructions for regenerating the drawing.');
      return;
    }

    if (onRegenerateDrawing) {
      try {
        setIsRegenerating(true);
        await onRegenerateDrawing(selectedDrawing.id, regenerationInstructions);
        setRegenerationInstructions('');
        setIsRegenerating(false);
      } catch (error) {
        console.error('Regeneration failed:', error);
        alert('Failed to regenerate drawing. Please try again.');
        setIsRegenerating(false);
      }
    }
  };

  const handleCancelRegeneration = () => {
    setIsRegenerating(false);
    setRegenerationInstructions('');
  };

  if (drawings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 21h10a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a4 4 0 004 4z" />
        </svg>
        <p>No drawings created yet. Use the Drawing mode to create technical drawings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-700">Technical Drawings</h3>
      
      {/* Drawing List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <h4 className="font-semibold text-gray-900 mb-2">{drawing.title}</h4>
            <p className="text-sm text-gray-600 mb-2">Component: {drawing.componentName}</p>
            <p className="text-sm text-gray-600 mb-3">
              Scale: {drawing.scale} | Created: {drawing.createdAt.toLocaleDateString()}
            </p>
            
            {/* Drawing Preview */}
            <div className="mb-3 bg-gray-100 rounded p-2">
              <div
                className="w-full h-32 bg-white rounded border overflow-hidden flex items-center justify-center"
                style={{ minHeight: '128px' }}
              >
                <div
                  className="max-w-full max-h-full"
                  dangerouslySetInnerHTML={{ __html: selectedDrawing?.id === drawing.id ? dxfPreview : createPlaceholderSVG(drawing.title) }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-1">

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintDrawing(drawing);
                }}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Print
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDrawing(drawing.id);
                }}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Drawing Details */}
      {selectedDrawing && (
        <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-semibold text-gray-900">
              {selectedDrawing.title}
            </h4>
            <button
              onClick={() => setSelectedDrawing(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawing Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-3 rounded border">
              <p className="text-sm font-medium text-gray-500">Component</p>
              <p className="text-gray-900">{selectedDrawing.componentName}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm font-medium text-gray-500">Scale</p>
              <p className="text-gray-900">{selectedDrawing.scale}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm font-medium text-gray-500">Dimensions</p>
              <p className="text-gray-900">
                {selectedDrawing.dimensions.width} × {selectedDrawing.dimensions.height}
              </p>
            </div>
          </div>

          {/* Drawing Description */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
            <h5 className="font-semibold text-gray-700 mb-2">Drawing Specifications</h5>
            <div className="max-h-48 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {selectedDrawing.description}
              </pre>
            </div>
          </div>

          {/* Professional CAD Drawing Viewer */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-semibold text-gray-700">
                {selectedDrawing.drawingType === 'cad' ? '🏗️ Professional CAD Drawing' : '📐 Technical Drawing'}
              </h5>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                >
                  {isFullscreen ? '📱 Normal View' : '🖥️ Fullscreen'}
                </button>
              </div>
            </div>

            <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white p-8' : 'bg-gray-50 p-4 rounded'}`}>
              {isFullscreen && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{selectedDrawing.title}</h3>
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    ✕ Close Fullscreen
                  </button>
                </div>
              )}
              <div
                className={`w-full bg-white border rounded p-4 flex items-center justify-center overflow-auto ${
                  isFullscreen ? 'h-full' : 'min-h-[500px] max-h-[700px]'
                }`}
              >
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    minWidth: '800px',
                    minHeight: '600px'
                  }}
                  dangerouslySetInnerHTML={{ __html: dxfPreview || createPlaceholderSVG(selectedDrawing.title) }}
                />
              </div>
              {!isFullscreen && (
                <div className="mt-2 text-center">
                  <p className="text-sm text-gray-600">
                    💡 Click "🖥️ Fullscreen" for better viewing experience
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Professional DXF Export Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <button
              onClick={() => handleDownloadDXF(selectedDrawing)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download DXF
            </button>

            <button
              onClick={() => handlePrintDrawing(selectedDrawing)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>

            <button
              onClick={() => setIsRegenerating(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          </div>

          {/* Regeneration Interface */}
          {isRegenerating && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-3">🔄 Regenerate Drawing with Instructions</h4>
              <p className="text-sm text-orange-700 mb-3">
                Provide specific instructions for how you want the drawing modified:
              </p>
              <textarea
                value={regenerationInstructions}
                onChange={(e) => setRegenerationInstructions(e.target.value)}
                className="w-full h-24 p-3 border border-orange-300 rounded-lg resize-none"
                placeholder="Example: Make the beam 8 meters long instead of 6 meters, add more reinforcement details, change the foundation depth to 1.5 meters..."
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleRegenerateWithInstructions}
                  disabled={!regenerationInstructions.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  ✅ Regenerate Drawing
                </button>
                <button
                  onClick={handleCancelRegeneration}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
