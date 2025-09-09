import React, { useState, useEffect } from 'react';
import { DrawingResult } from '../services/ezdxfDrawingService';
import { DXFHostingService } from '../services/dxfHostingService';

interface DXFPreviewPanelProps {
  result: DrawingResult;
  isVisible: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export const DXFPreviewPanel: React.FC<DXFPreviewPanelProps> = ({
  result,
  isVisible,
  onClose,
  onDownload
}) => {
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [useAlternativeViewer, setUseAlternativeViewer] = useState(false);

  useEffect(() => {
    if (isVisible && result.dxfContent) {
      generateViewerUrl();
    }
  }, [isVisible, result.dxfContent]);

  const generateViewerUrl = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Check if file is suitable for hosting
      const suitability = DXFHostingService.isFileSuitableForHosting(result.dxfContent);

      if (!suitability.suitable) {
        setError(suitability.reason || 'File too large for preview');
        setUseAlternativeViewer(true);
        return;
      }

      // Try to upload to temporary hosting service
      const hostingResult = await DXFHostingService.uploadDXFFile(result.dxfContent, result.title);

      if (hostingResult.success && hostingResult.url) {
        // Use ShareCAD viewer with the hosted URL
        const shareCADUrl = DXFHostingService.generateShareCADUrl(hostingResult.url);
        setViewerUrl(shareCADUrl);
        console.log(`DXF hosted on ${hostingResult.provider}: ${hostingResult.url}`);
      } else {
        setError(hostingResult.error || 'Failed to host file for preview');
        setUseAlternativeViewer(true);
      }
    } catch (err) {
      console.error('Failed to generate viewer URL:', err);
      setError('Failed to load DXF preview. You can still download the file.');
      setUseAlternativeViewer(true);
    } finally {
      setIsLoading(false);
    }
  };



  const formatFileSize = (content: string): string => {
    const suitability = DXFHostingService.isFileSuitableForHosting(content);
    return suitability.sizeFormatted;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📐 DXF Preview</h2>
            <p className="text-sm text-gray-600">{result.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              📥 Download DXF
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Drawing Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">File Size:</span>
                <div className="text-blue-800">{formatFileSize(result.dxfContent)}</div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Format:</span>
                <div className="text-blue-800">DXF R2018</div>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Status:</span>
                <div className="text-blue-800">Ready for CAD software</div>
              </div>
            </div>
          </div>

          {/* Viewer Area */}
          <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ height: '500px' }}>
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading DXF preview...</p>
                </div>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <div className="text-4xl mb-4">⚠️</div>
                  <div className="text-lg font-medium mb-2">Preview Unavailable</div>
                  <div className="text-sm mb-4">{error}</div>
                  <button
                    onClick={onDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    📥 Download DXF File
                  </button>
                  <div className="text-xs text-gray-500 mt-2">
                    Open in AutoCAD, FreeCAD, or other CAD software
                  </div>
                </div>
              </div>
            ) : useAlternativeViewer ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <div className="text-6xl mb-4">📐</div>
                  <div className="text-xl font-medium mb-2">Professional CAD Drawing</div>
                  <div className="text-sm mb-4 max-w-md">
                    <strong>{result.title}</strong><br/>
                    {result.description}
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={onDownload}
                      className="block mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      📥 Download DXF File
                    </button>
                    <div className="text-xs text-gray-500">
                      Compatible with AutoCAD, FreeCAD, LibreCAD, and other CAD software
                    </div>
                  </div>
                  
                  {/* Technical Details */}
                  <div className="mt-6 p-3 bg-white rounded border text-left max-w-md mx-auto">
                    <div className="text-sm font-medium text-gray-700 mb-2">Technical Details:</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>• Professional DXF R2018 format</div>
                      <div>• Complete with dimensions and annotations</div>
                      <div>• Proper layer organization</div>
                      <div>• CAD software compatible</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : viewerUrl ? (
              <iframe
                src={`https:${viewerUrl}`}
                className="w-full h-full border-0"
                scrolling="no"
                title="DXF Viewer"
                onError={() => {
                  setError('Failed to load DXF viewer');
                  setUseAlternativeViewer(true);
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-4">📐</div>
                  <div className="text-lg font-medium">Preparing Preview...</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Download the DXF file to open in your preferred CAD software for full editing capabilities.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setUseAlternativeViewer(!useAlternativeViewer)}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                {useAlternativeViewer ? 'Try Web Viewer' : 'Simple View'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
