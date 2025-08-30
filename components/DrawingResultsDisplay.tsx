import React, { useState } from 'react';
import { DrawingResult } from '../services/ezdxfDrawingService';
import { SimpleDxfViewer } from './DxfViewer';
import { EzdxfDrawingService } from '../services/ezdxfDrawingService';

interface DrawingResultsDisplayProps {
  result: DrawingResult;
  onRegenerateRequest: (instructions: string) => void;
}

export const DrawingResultsDisplay: React.FC<DrawingResultsDisplayProps> = ({
  result,
  onRegenerateRequest
}) => {
  const [showCode, setShowCode] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);

  const handleDownloadDXF = () => {
    try {
      EzdxfDrawingService.downloadDXF(result.dxfContent, result.title);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download DXF file. Please try again.');
    }
  };

  const handleDownloadPNG = () => {
    if (!result.imagePng) {
      alert('PNG image not available');
      return;
    }
    try {
      EzdxfDrawingService.downloadPNG(result.imagePng, result.title);
    } catch (error) {
      console.error('PNG download error:', error);
      alert('Failed to download PNG image. Please try again.');
    }
  };

  const handleDownloadPDF = () => {
    if (!result.imagePdf) {
      alert('PDF image not available');
      return;
    }
    try {
      EzdxfDrawingService.downloadPDF(result.imagePdf, result.title);
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Failed to download PDF image. Please try again.');
    }
  };

  const handlePrintImage = () => {
    if (!result.imagePng) {
      alert('PNG image not available for printing');
      return;
    }
    try {
      EzdxfDrawingService.printPNG(result.imagePng);
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print image. Please try again.');
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([result.pythonCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.title.replace(/\s+/g, '_')}_ezdxf_code.py`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = () => {
    if (!regenerateInstructions.trim()) {
      alert('Please provide instructions for regeneration');
      return;
    }
    onRegenerateRequest(regenerateInstructions);
    setRegenerateInstructions('');
    setShowRegenerateForm(false);
  };

  const formatFileSize = (base64Content: string): string => {
    const bytes = (base64Content.length * 3) / 4;
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          ✅ Drawing Generated Successfully
        </h3>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleString()}
        </div>
      </div>

      {/* Drawing Information */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-medium text-green-900 mb-2">{result.title}</h4>
        <p className="text-sm text-green-800 mb-3">{result.description}</p>

        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-green-600 font-medium">DXF Size:</span>
            <div className="text-green-800">{formatFileSize(result.dxfContent)}</div>
          </div>
          <div>
            <span className="text-green-600 font-medium">Format:</span>
            <div className="text-green-800">DXF R2010</div>
          </div>
          <div>
            <span className="text-green-600 font-medium">Code Lines:</span>
            <div className="text-green-800">{result.pythonCode.split('\n').length}</div>
          </div>
        </div>
      </div>

      {/* DXF Viewer */}
      <div className="mb-6">
        <SimpleDxfViewer
          dxfContent={result.dxfContent}
          title={result.title}
        />
      </div>

      {/* Image Generation Error */}
      {!result.imageSuccess && result.imageError && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">⚠️ Image Generation Notice</h4>
          <p className="text-sm text-yellow-800">
            DXF file generated successfully, but image preview failed: {result.imageError}
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            You can still download and use the DXF file in CAD software.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={handleDownloadDXF}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          📥 Download DXF File
        </button>

        <button
          onClick={() => setShowRegenerateForm(!showRegenerateForm)}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center gap-2"
        >
          🔄 Modify Drawing
        </button>
      </div>

      {/* Regenerate Form */}
      {showRegenerateForm && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="font-medium text-orange-900 mb-3">Modify Drawing</h4>
          <textarea
            value={regenerateInstructions}
            onChange={(e) => setRegenerateInstructions(e.target.value)}
            placeholder="Describe the changes you want to make to the drawing (e.g., 'Add more dimensions', 'Change the scale', 'Add a title block', 'Include centerlines')..."
            className="w-full p-3 border rounded-lg resize-none"
            rows={3}
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleRegenerate}
              disabled={!regenerateInstructions.trim()}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors text-sm"
            >
              🔄 Regenerate Drawing
            </button>
            <button
              onClick={() => setShowRegenerateForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Python Code Display */}
      {showCode && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Generated ezdxf Python Code:</h4>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {result.pythonCode}
            </pre>
          </div>
        </div>
      )}

      {/* Execution Log */}
      {showLog && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Execution Log:</h4>
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
              {result.executionLog}
            </pre>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How to use your files:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-blue-800 mb-1">📐 DXF File (CAD Software):</h5>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• <strong>AutoCAD:</strong> File → Open → Select DXF</div>
              <div>• <strong>FreeCAD:</strong> File → Import → Choose DXF</div>
              <div>• <strong>LibreCAD:</strong> File → Open → Select drawing</div>
              <div>• <strong>Online:</strong> AutoCAD Web or OnShape</div>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-blue-800 mb-1">🖼️ Image Files (Printing):</h5>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• <strong>PNG:</strong> High-quality image for viewing/printing</div>
              <div>• <strong>PDF:</strong> Vector format for professional printing</div>
              <div>• <strong>Print:</strong> Use "Print Image" for direct printing</div>
              <div>• <strong>Scale:</strong> Images auto-scaled to fit page</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Technical Details:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
          <div>
            <span className="font-medium">DXF Version:</span>
            <div>AutoCAD R2010</div>
          </div>
          <div>
            <span className="font-medium">Units:</span>
            <div>Millimeters</div>
          </div>
          <div>
            <span className="font-medium">Layers:</span>
            <div>Professional CAD</div>
          </div>
          <div>
            <span className="font-medium">Compatibility:</span>
            <div>All major CAD software</div>
          </div>
        </div>
      </div>
    </div>
  );
};
