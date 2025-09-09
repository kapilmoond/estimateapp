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
  const [hostedUrl, setHostedUrl] = useState<string>('');
  const [dxfAnalysis, setDxfAnalysis] = useState<any>(null);

  useEffect(() => {
    if (isVisible && result.dxfContent) {
      generateViewerUrl();
    }
  }, [isVisible, result.dxfContent]);

  const generateViewerUrl = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('DXF Preview: Starting preview generation...');
      console.log('DXF Content length:', result.dxfContent.length);
      console.log('DXF Content preview:', result.dxfContent.substring(0, 100));

      // Check if file is suitable for hosting
      const suitability = DXFHostingService.isFileSuitableForHosting(result.dxfContent);
      console.log('File suitability:', suitability);

      if (!suitability.suitable) {
        setError(suitability.reason || 'File too large for preview');
        setUseAlternativeViewer(true);
        return;
      }

      // Analyze DXF content first
      console.log('Analyzing DXF content...');
      const analysis = DXFHostingService.analyzeDXFContent(result.dxfContent);
      console.log('DXF Analysis:', analysis);
      setDxfAnalysis(analysis);

      if (!analysis.isValid) {
        setError('Invalid DXF file format detected');
        setUseAlternativeViewer(true);
        return;
      }

      // Try to upload to temporary hosting service
      console.log('Attempting to upload DXF file...');
      const hostingResult = await DXFHostingService.uploadDXFFile(result.dxfContent, result.title);
      console.log('Hosting result:', hostingResult);

      if (hostingResult.success && hostingResult.url) {
        setHostedUrl(hostingResult.url);

        // Try multiple viewer approaches
        console.log(`DXF hosted on ${hostingResult.provider}: ${hostingResult.url}`);

        // First try: Direct ShareCAD with HTTPS
        const shareCADUrl = `https://sharecad.org/cadframe/load?url=${encodeURIComponent(hostingResult.url)}`;
        console.log('ShareCAD URL:', shareCADUrl);
        setViewerUrl(shareCADUrl);

        // Test the hosted URL directly
        console.log('Testing hosted URL accessibility...');
        try {
          const testResponse = await fetch(hostingResult.url, { method: 'HEAD' });
          console.log('Hosted file test response:', testResponse.status, testResponse.statusText);

          if (!testResponse.ok) {
            console.log('Hosted file not accessible, using alternative viewer');
            setUseAlternativeViewer(true);
          }
        } catch (testErr) {
          console.log('Hosted file test failed, using alternative viewer:', testErr);
          setUseAlternativeViewer(true);
        }
      } else {
        console.error('Hosting failed:', hostingResult.error);
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
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">📐</div>
                    <div className="text-xl font-medium mb-2">Professional CAD Drawing</div>
                    <div className="text-sm mb-4 text-gray-600">
                      <strong>{result.title}</strong><br/>
                      {result.description}
                    </div>
                  </div>

                  {/* DXF Analysis */}
                  {dxfAnalysis && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-3">📊 DXF Analysis</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-blue-600 font-medium">Format:</span>
                          <div className="text-blue-800">{dxfAnalysis.format}</div>
                        </div>
                        <div>
                          <span className="text-blue-600 font-medium">Complexity:</span>
                          <div className="text-blue-800 capitalize">{dxfAnalysis.estimatedComplexity}</div>
                        </div>
                        <div>
                          <span className="text-blue-600 font-medium">Entities:</span>
                          <div className="text-blue-800">{dxfAnalysis.entities.join(', ') || 'None detected'}</div>
                        </div>
                        <div>
                          <span className="text-blue-600 font-medium">Features:</span>
                          <div className="text-blue-800">
                            {dxfAnalysis.hasText && '📝 Text '}
                            {dxfAnalysis.hasDimensions && '📏 Dimensions '}
                            {dxfAnalysis.layers.length > 0 && `🗂️ ${dxfAnalysis.layers.length} Layers`}
                          </div>
                        </div>
                      </div>
                      {dxfAnalysis.layers.length > 0 && (
                        <div className="mt-3">
                          <span className="text-blue-600 font-medium text-xs">Layers:</span>
                          <div className="text-blue-800 text-xs">{dxfAnalysis.layers.join(', ')}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Viewing Options */}
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900 mb-3">👁️ Viewing Options</h4>
                    <div className="space-y-3">
                      <button
                        onClick={onDownload}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        📥 Download DXF File
                      </button>

                      {hostedUrl && (
                        <div className="space-y-2">
                          <a
                            href={`https://sharecad.org/cadframe/load?url=${encodeURIComponent(hostedUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
                          >
                            🌐 Open in ShareCAD Viewer
                          </a>
                          <a
                            href={hostedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-center text-sm"
                          >
                            📄 View Raw DXF File
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CAD Software Recommendations */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">🛠️ Recommended CAD Software</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-2 bg-white rounded border">
                        <div className="font-medium text-gray-700">AutoCAD</div>
                        <div className="text-gray-600">Professional industry standard</div>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <div className="font-medium text-gray-700">FreeCAD</div>
                        <div className="text-gray-600">Free, open-source CAD</div>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <div className="font-medium text-gray-700">LibreCAD</div>
                        <div className="text-gray-600">Free 2D CAD application</div>
                      </div>
                      <div className="p-2 bg-white rounded border">
                        <div className="font-medium text-gray-700">AutoCAD Web</div>
                        <div className="text-gray-600">Browser-based CAD</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : viewerUrl ? (
              <div className="h-full relative">
                <iframe
                  src={viewerUrl}
                  className="w-full h-full border-0"
                  scrolling="no"
                  title="DXF Viewer"
                  onLoad={() => {
                    console.log('ShareCAD iframe loaded successfully');
                    // Set a timeout to check if the viewer actually loaded content
                    setTimeout(() => {
                      const iframe = document.querySelector('iframe[title="DXF Viewer"]') as HTMLIFrameElement;
                      if (iframe) {
                        try {
                          // If we can't access the iframe content or it seems empty, show alternative
                          console.log('Checking iframe content...');
                        } catch (e) {
                          console.log('Iframe access restricted, this is normal for cross-origin content');
                        }
                      }
                    }, 3000);
                  }}
                  onError={() => {
                    console.log('ShareCAD iframe failed to load');
                    setError('Failed to load DXF viewer');
                    setUseAlternativeViewer(true);
                  }}
                />

                {/* Overlay with alternative options */}
                <div className="absolute top-2 right-2 space-y-2">
                  <button
                    onClick={() => setUseAlternativeViewer(true)}
                    className="px-3 py-1 bg-white bg-opacity-90 text-gray-700 rounded text-xs hover:bg-opacity-100 transition-opacity shadow"
                  >
                    📋 Show Details
                  </button>
                  {hostedUrl && (
                    <a
                      href={hostedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-1 bg-blue-600 bg-opacity-90 text-white rounded text-xs hover:bg-opacity-100 transition-opacity shadow text-center"
                    >
                      📄 Raw File
                    </a>
                  )}
                </div>
              </div>
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
                {useAlternativeViewer ? 'Try Web Viewer' : 'Show Details'}
              </button>

              {/* Test ShareCAD with known working file */}
              <button
                onClick={() => {
                  const testUrl = 'https://sharecad.org/cadframe/load?url=https://www.cadsofttools.com/dwgviewer/hostel_block.dwg';
                  window.open(testUrl, '_blank');
                }}
                className="px-3 py-1 text-xs bg-blue-200 text-blue-700 rounded hover:bg-blue-300 transition-colors"
              >
                🧪 Test Viewer
              </button>

              {hostedUrl && (
                <a
                  href={hostedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-xs bg-green-200 text-green-700 rounded hover:bg-green-300 transition-colors"
                >
                  🔗 Direct Link
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
