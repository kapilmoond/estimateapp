import { fabric } from 'fabric';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  CADDrawingData, 
  CADLayer, 
  CADEntity, 
  CADDimension, 
  CADAnnotation,
  CADViewport,
  CADTool,
  CADDrawingSettings,
  CADExportOptions,
  CADImportResult,
  TechnicalDrawing
} from '../types';

export class CADDrawingService {
  private static readonly STORAGE_KEY = 'hsr-cad-drawings';
  private static readonly SETTINGS_KEY = 'hsr-cad-settings';

  // Default CAD settings
  private static defaultSettings: CADDrawingSettings = {
    snapToGrid: true,
    gridSize: 10,
    snapTolerance: 5,
    orthoMode: false,
    polarTracking: false,
    objectSnap: true,
    snapModes: [
      { type: 'endpoint', enabled: true, icon: '⬜' },
      { type: 'midpoint', enabled: true, icon: '◊' },
      { type: 'center', enabled: true, icon: '○' },
      { type: 'intersection', enabled: true, icon: '✕' }
    ]
  };

  // Default layers
  private static defaultLayers: CADLayer[] = [
    {
      id: 'layer-0',
      name: 'Construction',
      color: '#000000',
      lineType: 'solid',
      lineWeight: 2,
      visible: true,
      locked: false,
      printable: true
    },
    {
      id: 'layer-1',
      name: 'Dimensions',
      color: '#0066CC',
      lineType: 'solid',
      lineWeight: 1,
      visible: true,
      locked: false,
      printable: true
    },
    {
      id: 'layer-2',
      name: 'Text',
      color: '#006600',
      lineType: 'solid',
      lineWeight: 1,
      visible: true,
      locked: false,
      printable: true
    },
    {
      id: 'layer-3',
      name: 'Hidden Lines',
      color: '#999999',
      lineType: 'dashed',
      lineWeight: 1,
      visible: true,
      locked: false,
      printable: true
    }
  ];

  // CAD Tools
  static getCADTools(): CADTool[] {
    return [
      { id: 'select', name: 'Select', icon: '↖', category: 'modify', cursor: 'default' },
      { id: 'line', name: 'Line', icon: '📏', category: 'draw', cursor: 'crosshair', shortcut: 'L' },
      { id: 'rectangle', name: 'Rectangle', icon: '▭', category: 'draw', cursor: 'crosshair', shortcut: 'R' },
      { id: 'circle', name: 'Circle', icon: '○', category: 'draw', cursor: 'crosshair', shortcut: 'C' },
      { id: 'arc', name: 'Arc', icon: '◐', category: 'draw', cursor: 'crosshair', shortcut: 'A' },
      { id: 'polyline', name: 'Polyline', icon: '📐', category: 'draw', cursor: 'crosshair', shortcut: 'P' },
      { id: 'text', name: 'Text', icon: 'T', category: 'annotate', cursor: 'text', shortcut: 'T' },
      { id: 'dimension', name: 'Dimension', icon: '↔', category: 'annotate', cursor: 'crosshair', shortcut: 'D' },
      { id: 'move', name: 'Move', icon: '✋', category: 'modify', cursor: 'move', shortcut: 'M' },
      { id: 'copy', name: 'Copy', icon: '📋', category: 'modify', cursor: 'copy', shortcut: 'Ctrl+C' },
      { id: 'rotate', name: 'Rotate', icon: '🔄', category: 'modify', cursor: 'grab', shortcut: 'RO' },
      { id: 'scale', name: 'Scale', icon: '⚖', category: 'modify', cursor: 'nw-resize', shortcut: 'SC' }
    ];
  }

  // Create new CAD drawing
  static createNewDrawing(title: string, description: string): CADDrawingData {
    const now = new Date();
    return {
      id: this.generateId(),
      title,
      description,
      layers: [...this.defaultLayers],
      entities: [],
      dimensions: [],
      annotations: [],
      viewport: {
        center: { x: 0, y: 0 },
        zoom: 1,
        rotation: 0,
        bounds: { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 }
      },
      units: 'mm',
      scale: '1:100',
      paperSize: 'A4',
      createdAt: now,
      modifiedAt: now,
      version: 1
    };
  }

  // Initialize Fabric.js canvas
  static initializeCanvas(canvasElement: HTMLCanvasElement, width: number = 800, height: number = 600): fabric.Canvas {
    const canvas = new fabric.Canvas(canvasElement, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true
    });

    // Add grid
    this.addGridToCanvas(canvas, 20);

    // Set up canvas events
    this.setupCanvasEvents(canvas);

    return canvas;
  }

  // Add grid to canvas
  private static addGridToCanvas(canvas: fabric.Canvas, gridSize: number): void {
    const width = canvas.getWidth();
    const height = canvas.getHeight();

    // Create grid lines
    const gridLines: fabric.Line[] = [];

    // Vertical lines
    for (let i = 0; i <= width; i += gridSize) {
      const line = new fabric.Line([i, 0, i, height], {
        stroke: '#e0e0e0',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true
      });
      gridLines.push(line);
    }

    // Horizontal lines
    for (let i = 0; i <= height; i += gridSize) {
      const line = new fabric.Line([0, i, width, i], {
        stroke: '#e0e0e0',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true
      });
      gridLines.push(line);
    }

    // Add grid lines to canvas
    gridLines.forEach(line => canvas.add(line));
    canvas.sendToBack(...gridLines);
  }

  // Setup canvas events
  private static setupCanvasEvents(canvas: fabric.Canvas): void {
    // Object selection events
    canvas.on('selection:created', (e) => {
      console.log('Object selected:', e.selected);
    });

    canvas.on('selection:cleared', () => {
      console.log('Selection cleared');
    });

    // Object modification events
    canvas.on('object:modified', (e) => {
      console.log('Object modified:', e.target);
    });

    // Mouse events for drawing
    canvas.on('mouse:down', (e) => {
      // Handle drawing tool mouse down
    });

    canvas.on('mouse:move', (e) => {
      // Handle drawing tool mouse move
    });

    canvas.on('mouse:up', (e) => {
      // Handle drawing tool mouse up
    });
  }

  // Add line to canvas
  static addLine(canvas: fabric.Canvas, startPoint: { x: number; y: number }, endPoint: { x: number; y: number }, layerId: string): fabric.Line {
    const layer = this.getLayerById(layerId);
    const line = new fabric.Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
      stroke: layer?.color || '#000000',
      strokeWidth: layer?.lineWeight || 2,
      strokeDashArray: this.getStrokeDashArray(layer?.lineType || 'solid'),
      selectable: true,
      evented: true
    });

    canvas.add(line);
    return line;
  }

  // Add rectangle to canvas
  static addRectangle(canvas: fabric.Canvas, left: number, top: number, width: number, height: number, layerId: string): fabric.Rect {
    const layer = this.getLayerById(layerId);
    const rect = new fabric.Rect({
      left,
      top,
      width,
      height,
      fill: 'transparent',
      stroke: layer?.color || '#000000',
      strokeWidth: layer?.lineWeight || 2,
      strokeDashArray: this.getStrokeDashArray(layer?.lineType || 'solid'),
      selectable: true,
      evented: true
    });

    canvas.add(rect);
    return rect;
  }

  // Add circle to canvas
  static addCircle(canvas: fabric.Canvas, centerX: number, centerY: number, radius: number, layerId: string): fabric.Circle {
    const layer = this.getLayerById(layerId);
    const circle = new fabric.Circle({
      left: centerX - radius,
      top: centerY - radius,
      radius,
      fill: 'transparent',
      stroke: layer?.color || '#000000',
      strokeWidth: layer?.lineWeight || 2,
      strokeDashArray: this.getStrokeDashArray(layer?.lineType || 'solid'),
      selectable: true,
      evented: true
    });

    canvas.add(circle);
    return circle;
  }

  // Add text to canvas
  static addText(canvas: fabric.Canvas, text: string, left: number, top: number, layerId: string): fabric.Text {
    const layer = this.getLayerById(layerId);
    const textObj = new fabric.Text(text, {
      left,
      top,
      fontFamily: 'Arial',
      fontSize: 16,
      fill: layer?.color || '#000000',
      selectable: true,
      evented: true
    });

    canvas.add(textObj);
    return textObj;
  }

  // Add dimension
  static addDimension(canvas: fabric.Canvas, startPoint: { x: number; y: number }, endPoint: { x: number; y: number }): fabric.Group {
    const distance = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
    
    // Dimension line
    const dimLine = new fabric.Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
      stroke: '#0066CC',
      strokeWidth: 1,
      selectable: false
    });

    // Extension lines
    const extOffset = 10;
    const extLength = 20;
    const perpAngle = angle + Math.PI / 2;
    
    const ext1Start = {
      x: startPoint.x + Math.cos(perpAngle) * extOffset,
      y: startPoint.y + Math.sin(perpAngle) * extOffset
    };
    const ext1End = {
      x: ext1Start.x + Math.cos(perpAngle) * extLength,
      y: ext1Start.y + Math.sin(perpAngle) * extLength
    };

    const extLine1 = new fabric.Line([ext1Start.x, ext1Start.y, ext1End.x, ext1End.y], {
      stroke: '#0066CC',
      strokeWidth: 1,
      selectable: false
    });

    const ext2Start = {
      x: endPoint.x + Math.cos(perpAngle) * extOffset,
      y: endPoint.y + Math.sin(perpAngle) * extOffset
    };
    const ext2End = {
      x: ext2Start.x + Math.cos(perpAngle) * extLength,
      y: ext2Start.y + Math.sin(perpAngle) * extLength
    };

    const extLine2 = new fabric.Line([ext2Start.x, ext2Start.y, ext2End.x, ext2End.y], {
      stroke: '#0066CC',
      strokeWidth: 1,
      selectable: false
    });

    // Dimension text
    const midPoint = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2 + Math.cos(perpAngle) * (extOffset + extLength / 2)
    };

    const dimText = new fabric.Text(`${Math.round(distance)}mm`, {
      left: midPoint.x,
      top: midPoint.y,
      fontSize: 12,
      fill: '#0066CC',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: false
    });

    // Group all dimension elements
    const dimensionGroup = new fabric.Group([dimLine, extLine1, extLine2, dimText], {
      selectable: true,
      evented: true
    });

    canvas.add(dimensionGroup);
    return dimensionGroup;
  }

  // Helper methods
  private static getLayerById(layerId: string): CADLayer | undefined {
    return this.defaultLayers.find(layer => layer.id === layerId);
  }

  private static getStrokeDashArray(lineType: string): number[] | undefined {
    switch (lineType) {
      case 'dashed': return [10, 5];
      case 'dotted': return [2, 3];
      case 'dashdot': return [10, 5, 2, 5];
      default: return undefined;
    }
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Save and load methods
  static saveDrawing(drawing: CADDrawingData): void {
    try {
      const drawings = this.loadAllDrawings();
      const existingIndex = drawings.findIndex(d => d.id === drawing.id);
      
      if (existingIndex >= 0) {
        drawings[existingIndex] = { ...drawing, modifiedAt: new Date(), version: drawing.version + 1 };
      } else {
        drawings.push(drawing);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drawings));
    } catch (error) {
      console.error('Failed to save CAD drawing:', error);
    }
  }

  static loadAllDrawings(): CADDrawingData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const drawings = JSON.parse(stored);
      return drawings.map((d: any) => ({
        ...d,
        createdAt: new Date(d.createdAt),
        modifiedAt: new Date(d.modifiedAt)
      }));
    } catch (error) {
      console.error('Failed to load CAD drawings:', error);
      return [];
    }
  }

  static getDrawing(id: string): CADDrawingData | null {
    const drawings = this.loadAllDrawings();
    return drawings.find(d => d.id === id) || null;
  }

  static deleteDrawing(id: string): void {
    try {
      const drawings = this.loadAllDrawings();
      const filteredDrawings = drawings.filter(d => d.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredDrawings));
    } catch (error) {
      console.error('Failed to delete CAD drawing:', error);
    }
  }

  // Settings management
  static getSettings(): CADDrawingSettings {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      return stored ? { ...this.defaultSettings, ...JSON.parse(stored) } : this.defaultSettings;
    } catch (error) {
      console.error('Failed to load CAD settings:', error);
      return this.defaultSettings;
    }
  }

  static saveSettings(settings: Partial<CADDrawingSettings>): void {
    try {
      const currentSettings = this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save CAD settings:', error);
    }
  }

  // Export functionality
  static async exportToPDF(canvas: fabric.Canvas, drawing: CADDrawingData, options: CADExportOptions): Promise<void> {
    try {
      const canvasElement = canvas.getElement();
      const canvasImage = await html2canvas(canvasElement, {
        backgroundColor: '#ffffff',
        scale: options.quality === 'high' ? 2 : options.quality === 'medium' ? 1.5 : 1
      });

      const pdf = new jsPDF({
        orientation: options.orientation || 'landscape',
        unit: 'mm',
        format: options.paperSize || 'a4'
      });

      const imgData = canvasImage.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Calculate image dimensions to fit page
      const imgWidth = canvasImage.width;
      const imgHeight = canvasImage.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

      // Add title block
      pdf.setFontSize(12);
      pdf.text(drawing.title, 10, pdfHeight - 20);
      pdf.setFontSize(8);
      pdf.text(`Scale: ${drawing.scale} | Units: ${drawing.units}`, 10, pdfHeight - 15);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 10, pdfHeight - 10);

      pdf.save(`${drawing.title.replace(/\s+/g, '_')}_CAD_Drawing.pdf`);
    } catch (error) {
      console.error('Failed to export to PDF:', error);
      throw new Error('Failed to export drawing to PDF');
    }
  }

  static exportToSVG(canvas: fabric.Canvas, drawing: CADDrawingData): void {
    try {
      const svgString = canvas.toSVG({
        suppressPreamble: false,
        width: canvas.getWidth(),
        height: canvas.getHeight(),
        viewBox: {
          x: 0,
          y: 0,
          width: canvas.getWidth(),
          height: canvas.getHeight()
        }
      });

      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${drawing.title.replace(/\s+/g, '_')}_CAD_Drawing.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export to SVG:', error);
      throw new Error('Failed to export drawing to SVG');
    }
  }

  static exportToDXF(drawing: CADDrawingData): void {
    try {
      // Basic DXF structure - this would need a proper DXF library for full implementation
      const dxfContent = this.generateBasicDXF(drawing);

      const blob = new Blob([dxfContent], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${drawing.title.replace(/\s+/g, '_')}_CAD_Drawing.dxf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export to DXF:', error);
      throw new Error('Failed to export drawing to DXF');
    }
  }

  private static generateBasicDXF(drawing: CADDrawingData): string {
    // Basic DXF header - this is a simplified version
    let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
9
$DWGCODEPAGE
3
ANSI_1252
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
5
2
330
0
100
AcDbSymbolTable
70
${drawing.layers.length}
`;

    // Add layers
    drawing.layers.forEach(layer => {
      dxf += `0
LAYER
5
${layer.id}
330
2
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
2
${layer.name}
70
0
62
${this.colorToACADColor(layer.color)}
6
CONTINUOUS
`;
    });

    dxf += `0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;

    // Add entities (simplified)
    drawing.entities.forEach(entity => {
      switch (entity.type) {
        case 'line':
          if (entity.geometry.coordinates.length >= 2) {
            const start = entity.geometry.coordinates[0];
            const end = entity.geometry.coordinates[1];
            dxf += `0
LINE
5
${entity.id}
330
1F
100
AcDbEntity
8
${this.getLayerName(entity.layerId, drawing.layers)}
100
AcDbLine
10
${start[0]}
20
${start[1]}
30
0.0
11
${end[0]}
21
${end[1]}
31
0.0
`;
          }
          break;
        case 'circle':
          if (entity.geometry.center && entity.geometry.radius) {
            dxf += `0
CIRCLE
5
${entity.id}
330
1F
100
AcDbEntity
8
${this.getLayerName(entity.layerId, drawing.layers)}
100
AcDbCircle
10
${entity.geometry.center.x}
20
${entity.geometry.center.y}
30
0.0
40
${entity.geometry.radius}
`;
          }
          break;
      }
    });

    dxf += `0
ENDSEC
0
EOF`;

    return dxf;
  }

  private static colorToACADColor(hexColor: string): number {
    // Convert hex color to AutoCAD color index (simplified)
    const colorMap: { [key: string]: number } = {
      '#FF0000': 1, // Red
      '#FFFF00': 2, // Yellow
      '#00FF00': 3, // Green
      '#00FFFF': 4, // Cyan
      '#0000FF': 5, // Blue
      '#FF00FF': 6, // Magenta
      '#000000': 7, // Black/White
    };
    return colorMap[hexColor.toUpperCase()] || 7;
  }

  private static getLayerName(layerId: string, layers: CADLayer[]): string {
    const layer = layers.find(l => l.id === layerId);
    return layer ? layer.name : 'Default';
  }

  // Canvas utilities
  static zoomToFit(canvas: fabric.Canvas): void {
    const objects = canvas.getObjects().filter(obj => obj.selectable);
    if (objects.length === 0) return;

    const group = new fabric.Group(objects, { canvas });
    const boundingRect = group.getBoundingRect();
    group.destroy();

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    const scaleX = canvasWidth / boundingRect.width;
    const scaleY = canvasHeight / boundingRect.height;
    const scale = Math.min(scaleX, scaleY) * 0.8; // 80% of available space

    canvas.setZoom(scale);
    canvas.absolutePan({
      x: (canvasWidth - boundingRect.width * scale) / 2 - boundingRect.left * scale,
      y: (canvasHeight - boundingRect.height * scale) / 2 - boundingRect.top * scale
    });
  }

  static resetView(canvas: fabric.Canvas): void {
    canvas.setZoom(1);
    canvas.absolutePan({ x: 0, y: 0 });
  }

  static snapToGrid(point: { x: number; y: number }, gridSize: number): { x: number; y: number } {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }
}
