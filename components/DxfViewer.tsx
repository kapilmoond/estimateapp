import React, { useState, useEffect } from 'react';

interface DxfViewerProps {
  dxfContent?: string;
  title?: string;
  onClose?: () => void;
}

export const DxfViewer: React.FC<DxfViewerProps> = ({
  dxfContent,
  title = "DXF Drawing",
  onClose
}) => {
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (dxfContent) {
      uploadAndGetViewerUrl(dxfContent);
    }
  }, [dxfContent]);

  const uploadAndGetViewerUrl = async (content: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Create a blob from the DXF content
      const blob = new Blob([content], { type: 'application/dxf' });
      
      // For now, we'll use a placeholder URL structure
      // In a real implementation, you would upload to a server and get a public URL
      const tempUrl = URL.createObjectURL(blob);
      
      // ShareCAD viewer URL format
      const shareCADUrl = `//sharecad.org/cadframe/load?url=${encodeURIComponent(tempUrl)}`;
      setViewerUrl(shareCADUrl);
      
    } catch (err) {
      console.error('Error preparing DXF for viewing:', err);
      setError('Failed to prepare DXF file for viewing');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDxf = () => {
    if (!dxfContent) return;

    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openInNewTab = () => {
    if (viewerUrl) {
      window.open(`https:${viewerUrl}`, '_blank');
    }
  };

  if (!dxfContent) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📐</div>
          <div className="text-lg font-medium">No Drawing Available</div>
          <div className="text-sm">Generate a drawing to view it here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            📐 {title}
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={downloadDxf}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Download DXF file"
            >
              📥 Download DXF
            </button>
            {viewerUrl && (
              <button
                onClick={openInNewTab}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                title="Open in new tab"
              >
                🔗 Open in New Tab
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                title="Close viewer"
              >
                <span className="text-xl">×</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Viewer Content */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <div className="text-sm text-gray-600">Loading DXF viewer...</div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <div className="font-medium">Viewer Error</div>
            </div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <div className="space-y-2">
              <button
                onClick={downloadDxf}
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                📥 Download DXF File Instead
              </button>
              <div className="text-xs text-gray-500">
                You can open the DXF file in AutoCAD, FreeCAD, or other CAD software
              </div>
            </div>
          </div>
        )}

        {!error && !isLoading && (
          <div className="bg-gray-100">
            {viewerUrl ? (
              <iframe
                src={`https:${viewerUrl}`}
                className="w-full h-96 border-0"
                scrolling="no"
                title="DXF Viewer"
                onError={() => setError('Failed to load DXF viewer')}
              />
            ) : (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-4">📐</div>
                  <div className="text-lg font-medium">DXF Preview</div>
                  <div className="text-sm mb-4">Professional CAD drawing generated</div>
                  <button
                    onClick={downloadDxf}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    📥 Download DXF File
                  </button>
                  <div className="text-xs text-gray-500 mt-2">
                    Open in AutoCAD, FreeCAD, or other CAD software
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>
            Professional DXF drawing with dimensions and annotations
          </div>
          <div>
            Compatible with AutoCAD, FreeCAD, LibreCAD
          </div>
        </div>
      </div>
    </div>
  );
};

// Alternative simple DXF viewer for inline display
export const SimpleDxfViewer: React.FC<{ dxfContent?: string; title?: string }> = ({
  dxfContent,
  title = "Drawing"
}) => {
  const downloadDxf = () => {
    if (!dxfContent) return;

    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!dxfContent) {
    return (
      <div className="text-center text-gray-500 py-8">
        <div className="text-2xl mb-2">📐</div>
        <div className="text-sm">No drawing available</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-3">📐</div>
        <div className="font-medium text-gray-900 mb-2">{title}</div>
        <div className="text-sm text-gray-600 mb-4">
          Professional DXF drawing ready for CAD software
        </div>
        <button
          onClick={downloadDxf}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          📥 Download DXF
        </button>
        <div className="text-xs text-gray-500 mt-2">
          Compatible with AutoCAD, FreeCAD, LibreCAD
        </div>
      </div>
    </div>
  );
};
