import React, { useRef, useEffect, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { CADDrawingService } from '../services/cadDrawingService';
import { CADDrawingData, CADTool, CADLayer, CADDrawingSettings, CADExportOptions } from '../types';

interface CADDrawingCanvasProps {
  drawing: CADDrawingData;
  onDrawingUpdate: (drawing: CADDrawingData) => void;
  width?: number;
  height?: number;
}

export const CADDrawingCanvas: React.FC<CADDrawingCanvasProps> = ({
  drawing,
  onDrawingUpdate,
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [activeLayer, setActiveLayer] = useState<string>(drawing.layers[0]?.id || 'layer-0');
  const [settings, setSettings] = useState<CADDrawingSettings>(CADDrawingService.getSettings());
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      fabricCanvasRef.current = CADDrawingService.initializeCanvas(canvasRef.current, width, height);
      setupCanvasEvents();
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [width, height]);

  // Setup canvas events for drawing tools
  const setupCanvasEvents = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
  }, [activeTool, activeLayer, settings]);

  const handleMouseDown = (e: fabric.IEvent) => {
    if (!e.pointer) return;
    
    const point = settings.snapToGrid 
      ? CADDrawingService.snapToGrid(e.pointer, settings.gridSize)
      : e.pointer;

    setStartPoint(point);
    setIsDrawing(true);

    switch (activeTool) {
      case 'line':
      case 'rectangle':
      case 'circle':
        // Start drawing
        break;
      case 'text':
        handleAddText(point);
        break;
    }
  };

  const handleMouseMove = (e: fabric.IEvent) => {
    if (!isDrawing || !startPoint || !e.pointer) return;

    const point = settings.snapToGrid 
      ? CADDrawingService.snapToGrid(e.pointer, settings.gridSize)
      : e.pointer;

    // Show preview for current tool
    // This would be implemented with temporary objects
  };

  const handleMouseUp = (e: fabric.IEvent) => {
    if (!isDrawing || !startPoint || !e.pointer || !fabricCanvasRef.current) return;

    const point = settings.snapToGrid 
      ? CADDrawingService.snapToGrid(e.pointer, settings.gridSize)
      : e.pointer;

    switch (activeTool) {
      case 'line':
        CADDrawingService.addLine(fabricCanvasRef.current, startPoint, point, activeLayer);
        break;
      case 'rectangle':
        const width = Math.abs(point.x - startPoint.x);
        const height = Math.abs(point.y - startPoint.y);
        const left = Math.min(startPoint.x, point.x);
        const top = Math.min(startPoint.y, point.y);
        CADDrawingService.addRectangle(fabricCanvasRef.current, left, top, width, height, activeLayer);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
        CADDrawingService.addCircle(fabricCanvasRef.current, startPoint.x, startPoint.y, radius, activeLayer);
        break;
      case 'dimension':
        CADDrawingService.addDimension(fabricCanvasRef.current, startPoint, point);
        break;
    }

    setIsDrawing(false);
    setStartPoint(null);
    updateDrawingData();
  };

  const handleAddText = (point: { x: number; y: number }) => {
    const text = prompt('Enter text:');
    if (text && fabricCanvasRef.current) {
      CADDrawingService.addText(fabricCanvasRef.current, text, point.x, point.y, activeLayer);
      updateDrawingData();
    }
  };

  const updateDrawingData = () => {
    // Update drawing data with current canvas state
    const updatedDrawing = {
      ...drawing,
      modifiedAt: new Date(),
      version: drawing.version + 1
    };
    onDrawingUpdate(updatedDrawing);
  };

  const handleToolChange = (toolId: string) => {
    setActiveTool(toolId);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.isDrawingMode = false;
      fabricCanvasRef.current.selection = toolId === 'select';
    }
  };

  const handleLayerChange = (layerId: string) => {
    setActiveLayer(layerId);
  };

  const handleZoomToFit = () => {
    if (fabricCanvasRef.current) {
      CADDrawingService.zoomToFit(fabricCanvasRef.current);
    }
  };

  const handleResetView = () => {
    if (fabricCanvasRef.current) {
      CADDrawingService.resetView(fabricCanvasRef.current);
    }
  };

  const handleExport = async (format: 'pdf' | 'svg' | 'dxf') => {
    if (!fabricCanvasRef.current) return;

    try {
      const options: CADExportOptions = {
        format,
        scale: 1,
        paperSize: drawing.paperSize,
        orientation: 'landscape',
        quality: 'high'
      };

      switch (format) {
        case 'pdf':
          await CADDrawingService.exportToPDF(fabricCanvasRef.current, drawing, options);
          break;
        case 'svg':
          CADDrawingService.exportToSVG(fabricCanvasRef.current, drawing);
          break;
        case 'dxf':
          CADDrawingService.exportToDXF(drawing);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const tools = CADDrawingService.getCADTools();

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-2">
        <div className="flex items-center space-x-2 mb-2">
          {/* Drawing Tools */}
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2">
            {tools.filter(tool => tool.category === 'draw' || tool.id === 'select').map(tool => (
              <button
                key={tool.id}
                onClick={() => handleToolChange(tool.id)}
                className={`p-2 rounded text-sm font-medium transition-colors ${
                  activeTool === tool.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={`${tool.name} ${tool.shortcut ? `(${tool.shortcut})` : ''}`}
              >
                {tool.icon} {tool.name}
              </button>
            ))}
          </div>

          {/* Modify Tools */}
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2">
            {tools.filter(tool => tool.category === 'modify').map(tool => (
              <button
                key={tool.id}
                onClick={() => handleToolChange(tool.id)}
                className={`p-2 rounded text-sm font-medium transition-colors ${
                  activeTool === tool.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={`${tool.name} ${tool.shortcut ? `(${tool.shortcut})` : ''}`}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Annotation Tools */}
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2">
            {tools.filter(tool => tool.category === 'annotate').map(tool => (
              <button
                key={tool.id}
                onClick={() => handleToolChange(tool.id)}
                className={`p-2 rounded text-sm font-medium transition-colors ${
                  activeTool === tool.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={`${tool.name} ${tool.shortcut ? `(${tool.shortcut})` : ''}`}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2">
            <button
              onClick={handleZoomToFit}
              className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              title="Zoom to Fit"
            >
              🔍 Fit
            </button>
            <button
              onClick={handleResetView}
              className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              title="Reset View"
            >
              🏠 Reset
            </button>
          </div>

          {/* Export Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleExport('pdf')}
              className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
              title="Export to PDF"
            >
              📄 PDF
            </button>
            <button
              onClick={() => handleExport('svg')}
              className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
              title="Export to SVG"
            >
              🖼️ SVG
            </button>
            <button
              onClick={() => handleExport('dxf')}
              className="p-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm"
              title="Export to DXF"
            >
              📐 DXF
            </button>
          </div>
        </div>

        {/* Layer and Settings */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <label className="font-medium text-gray-700">Layer:</label>
            <select
              value={activeLayer}
              onChange={(e) => handleLayerChange(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1"
            >
              {drawing.layers.map(layer => (
                <option key={layer.id} value={layer.id}>
                  {layer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={settings.snapToGrid}
                onChange={(e) => setSettings(prev => ({ ...prev, snapToGrid: e.target.checked }))}
                className="rounded"
              />
              <span>Snap to Grid</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={settings.orthoMode}
                onChange={(e) => setSettings(prev => ({ ...prev, orthoMode: e.target.checked }))}
                className="rounded"
              />
              <span>Ortho Mode</span>
            </label>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="border border-gray-300 bg-white"
          style={{ cursor: tools.find(t => t.id === activeTool)?.cursor || 'default' }}
        />
      </div>

      {/* Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <div>
            Active Tool: <span className="font-medium">{tools.find(t => t.id === activeTool)?.name}</span>
            {activeTool !== 'select' && <span className="ml-2 text-gray-500">Click and drag to draw</span>}
          </div>
          <div>
            Scale: {drawing.scale} | Units: {drawing.units} | Grid: {settings.gridSize}px
          </div>
        </div>
      </div>
    </div>
  );
};
