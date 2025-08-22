import React, { useState } from 'react';
import { TechnicalDrawing } from '../types';
import { DrawingService } from '../services/drawingService';

interface DrawingDisplayProps {
  drawings: TechnicalDrawing[];
  onDrawingUpdate: () => void;
}

export const DrawingDisplay: React.FC<DrawingDisplayProps> = ({ drawings, onDrawingUpdate }) => {
  const [selectedDrawing, setSelectedDrawing] = useState<TechnicalDrawing | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSVG, setEditedSVG] = useState('');

  const handleDeleteDrawing = (drawingId: string) => {
    if (window.confirm('Are you sure you want to delete this drawing?')) {
      DrawingService.deleteDrawing(drawingId);
      onDrawingUpdate();
      if (selectedDrawing?.id === drawingId) {
        setSelectedDrawing(null);
      }
    }
  };

  const handleDownloadSVG = (drawing: TechnicalDrawing) => {
    DrawingService.downloadDrawingAsSVG(drawing);
  };



  const handlePrintDrawing = (drawing: TechnicalDrawing) => {
    DrawingService.printDrawing(drawing);
  };

  const handleEditSVG = (drawing: TechnicalDrawing) => {
    setEditedSVG(drawing.svgContent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (selectedDrawing) {
      DrawingService.updateDrawing(selectedDrawing.id, { svgContent: editedSVG });
      onDrawingUpdate();
      setIsEditing(false);
      // Update the selected drawing with new content
      setSelectedDrawing({ ...selectedDrawing, svgContent: editedSVG });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedSVG('');
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
                  dangerouslySetInnerHTML={{ __html: drawing.svgContent }}
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

          {/* Professional Drawing Viewer */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-semibold text-gray-700">Professional CAD Drawing</h5>
              <div className="flex gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => handleEditSVG(selectedDrawing)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit Drawing
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <textarea
                  value={editedSVG}
                  onChange={(e) => setEditedSVG(e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 rounded font-mono text-sm"
                  placeholder="Edit SVG content here..."
                />
                <div className="bg-gray-100 p-4 rounded">
                  <p className="text-sm font-medium text-gray-700 mb-2">Live Preview:</p>
                  <div
                    className="w-full bg-white border rounded p-4 min-h-[300px] flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: editedSVG }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 p-4 rounded">
                <div
                  className="w-full bg-white border rounded p-4 min-h-[400px] flex items-center justify-center overflow-auto"
                  style={{ maxHeight: '600px' }}
                >
                  <div
                    className="max-w-full max-h-full"
                    dangerouslySetInnerHTML={{ __html: selectedDrawing.svgContent }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Professional SVG Export Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <button
              onClick={() => handleDownloadSVG(selectedDrawing)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              SVG
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
              onClick={() => {
                navigator.clipboard.writeText(selectedDrawing.svgContent);
                alert('SVG code copied to clipboard!');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy SVG Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
