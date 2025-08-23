import { TechnicalDrawing } from '../types';

export class DrawingService {
  private static readonly STORAGE_KEY = 'hsr-technical-drawings';

  static saveDrawings(drawings: TechnicalDrawing[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drawings));
    } catch (error) {
      console.error('Failed to save drawings:', error);
    }
  }

  static loadDrawings(): TechnicalDrawing[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const drawings = JSON.parse(stored);
      return drawings.map((d: any) => ({
        ...d,
        createdAt: new Date(d.createdAt)
      }));
    } catch (error) {
      console.error('Failed to load drawings:', error);
      return [];
    }
  }

  static updateDrawing(drawingId: string, updates: Partial<TechnicalDrawing>): TechnicalDrawing | null {
    const drawings = this.loadDrawings();
    const index = drawings.findIndex(d => d.id === drawingId);
    
    if (index === -1) return null;
    
    drawings[index] = { ...drawings[index], ...updates };
    this.saveDrawings(drawings);
    
    return drawings[index];
  }

  static deleteDrawing(drawingId: string): boolean {
    const drawings = this.loadDrawings();
    const filtered = drawings.filter(d => d.id !== drawingId);
    
    if (filtered.length === drawings.length) return false;
    
    this.saveDrawings(filtered);
    return true;
  }

  static getDrawing(drawingId: string): TechnicalDrawing | null {
    const drawings = this.loadDrawings();
    return drawings.find(d => d.id === drawingId) || null;
  }

  static getAllDrawings(): TechnicalDrawing[] {
    return this.loadDrawings();
  }

  static printDrawing(drawing: TechnicalDrawing): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${drawing.title} - Technical Drawing</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .drawing-container { text-align: center; }
        .drawing-info { max-width: 100%; border: 1px solid #ccc; padding: 20px; margin: 20px 0; }
        @media print {
            body { margin: 0; padding: 10px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="drawing-container">
        <h2>${drawing.title}</h2>
        <p>Component: ${drawing.componentName} | Scale: ${drawing.scale}</p>
        <div class="drawing-info">
            <h3>🏗️ Professional DXF Drawing</h3>
            <p><strong>File:</strong> ${drawing.dxfFilename}</p>
            <p><strong>Description:</strong> ${drawing.description}</p>
            <p><strong>Dimensions:</strong> ${drawing.dimensions.width} × ${drawing.dimensions.height}</p>
            <p><strong>Created:</strong> ${drawing.createdAt.toLocaleDateString()}</p>
            <hr>
            <p><em>This is a professional DXF technical drawing. Download the DXF file to view in AutoCAD, Revit, or other CAD software.</em></p>
        </div>
        <div class="no-print" style="margin-top: 20px;">
            <button onclick="window.print()">Print Drawing Info</button>
            <button onclick="window.close()">Close</button>
        </div>
    </div>
</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
