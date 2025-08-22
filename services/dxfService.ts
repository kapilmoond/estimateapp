/**
 * Professional DXF Drawing Service
 * Replaces SVG system with ezdxf-based professional CAD drawings
 */

import { TechnicalDrawing, DXFDrawingData, DXFElement } from '../types';

export class DXFService {
  private static readonly PYTHON_BACKEND_URL = 'http://localhost:5000';
  
  /**
   * Generate professional DXF drawing from AI description
   */
  static async generateDXFFromDescription(
    title: string,
    description: string,
    aiGeneratedContent: string
  ): Promise<TechnicalDrawing> {
    try {
      // Call Python backend to generate DXF
      const response = await fetch(`${this.PYTHON_BACKEND_URL}/parse-ai-drawing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: aiGeneratedContent
        })
      });

      if (!response.ok) {
        throw new Error(`DXF generation failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'DXF generation failed');
      }

      // Create TechnicalDrawing object
      const drawing: TechnicalDrawing = {
        id: this.generateId(),
        title,
        description,
        dxfContent: result.dxf_content, // Base64 encoded DXF
        dxfFilename: result.filename,
        dimensions: { width: 800, height: 600 }, // Standard drawing size
        scale: '1:100',
        componentName: this.extractComponentName(title),
        createdAt: new Date(),
        includeInContext: true,
        dxfData: this.createDXFData(title, description, aiGeneratedContent),
        drawingType: 'dxf'
      };

      return drawing;
    } catch (error) {
      console.error('DXF generation error:', error);
      throw new Error(`Failed to generate DXF drawing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Regenerate DXF drawing with user instructions
   */
  static async regenerateDXFWithInstructions(
    originalDrawing: TechnicalDrawing,
    userInstructions: string
  ): Promise<TechnicalDrawing> {
    try {
      const enhancedDescription = `${originalDrawing.description}\n\nUSER MODIFICATIONS:\n${userInstructions}`;
      
      return await this.generateDXFFromDescription(
        originalDrawing.title,
        enhancedDescription,
        enhancedDescription
      );
    } catch (error) {
      console.error('DXF regeneration error:', error);
      throw new Error(`Failed to regenerate DXF drawing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download DXF file
   */
  static async downloadDXF(drawing: TechnicalDrawing): Promise<void> {
    try {
      // Decode base64 DXF content
      const dxfBlob = this.base64ToBlob(drawing.dxfContent, 'application/dxf');
      
      // Create download link
      const url = URL.createObjectURL(dxfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = drawing.dxfFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('DXF download error:', error);
      throw new Error('Failed to download DXF file');
    }
  }

  /**
   * Convert DXF to PDF for viewing
   */
  static async convertDXFToPDF(drawing: TechnicalDrawing): Promise<string> {
    try {
      const response = await fetch(`${this.PYTHON_BACKEND_URL}/convert-to-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dxf_content: drawing.dxfContent,
          filename: drawing.dxfFilename
        })
      });

      if (!response.ok) {
        throw new Error('PDF conversion failed');
      }

      const result = await response.json();
      return result.pdf_content; // Base64 encoded PDF
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw new Error('Failed to convert DXF to PDF');
    }
  }

  /**
   * Get DXF preview as SVG for web display
   */
  static async getDXFPreview(drawing: TechnicalDrawing): Promise<string> {
    try {
      const response = await fetch(`${this.PYTHON_BACKEND_URL}/dxf-to-svg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dxf_content: drawing.dxfContent
        })
      });

      if (!response.ok) {
        throw new Error('DXF preview generation failed');
      }

      const result = await response.json();
      return result.svg_content; // SVG for web preview only
    } catch (error) {
      console.error('DXF preview error:', error);
      // Return a placeholder SVG if preview fails
      return this.createPlaceholderSVG(drawing.title);
    }
  }

  /**
   * Check if Python backend is available
   */
  static async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.PYTHON_BACKEND_URL}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.warn('Python backend not available:', error);
      return false;
    }
  }

  // Private helper methods

  private static generateId(): string {
    return `dxf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static extractComponentName(title: string): string {
    // Extract component name from title
    const words = title.toLowerCase().split(' ');
    const componentWords = words.filter(word => 
      ['beam', 'column', 'foundation', 'wall', 'slab', 'footing'].includes(word)
    );
    return componentWords.length > 0 ? componentWords[0] : 'component';
  }

  private static createDXFData(title: string, description: string, content: string): DXFDrawingData {
    return {
      id: this.generateId(),
      title,
      description,
      elements: this.parseElementsFromContent(content),
      layers: ['STRUCTURAL', 'DIMENSIONS', 'TEXT', 'REINFORCEMENT'],
      units: 'mm',
      scale: '1:100',
      paperSize: 'A3',
      createdAt: new Date(),
      modifiedAt: new Date()
    };
  }

  private static parseElementsFromContent(content: string): DXFElement[] {
    // Simple parsing - in production, this would be more sophisticated
    const elements: DXFElement[] = [];
    const contentLower = content.toLowerCase();

    if (contentLower.includes('beam')) {
      elements.push({
        id: this.generateId(),
        type: 'concrete_beam',
        layer: 'STRUCTURAL',
        specifications: {
          material: 'concrete',
          grade: 'C30/37',
          reinforcement: '4-T20 + 2-T16'
        },
        coordinates: { x: 0, y: 0, z: 0 },
        dimensions: { length: 6000, width: 300, height: 600 }
      });
    }

    if (contentLower.includes('column')) {
      elements.push({
        id: this.generateId(),
        type: 'steel_column',
        layer: 'STRUCTURAL',
        specifications: {
          material: 'steel',
          section: 'UC 305x305x97'
        },
        coordinates: { x: 0, y: 0, z: 0 },
        dimensions: { width: 305, height: 3000 }
      });
    }

    return elements;
  }

  private static base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  private static createPlaceholderSVG(title: string): string {
    return `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
        <text x="400" y="280" text-anchor="middle" font-family="Arial" font-size="24" fill="#6c757d">
          Professional DXF Drawing
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
  }
}

// Storage service for DXF drawings
export class DXFStorageService {
  private static readonly STORAGE_KEY = 'hsr_dxf_drawings';

  static saveDrawing(drawing: TechnicalDrawing): void {
    try {
      const drawings = this.getAllDrawings();
      const existingIndex = drawings.findIndex(d => d.id === drawing.id);
      
      if (existingIndex >= 0) {
        drawings[existingIndex] = drawing;
      } else {
        drawings.unshift(drawing);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drawings));
    } catch (error) {
      console.error('Failed to save DXF drawing:', error);
    }
  }

  static getAllDrawings(): TechnicalDrawing[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const drawings = JSON.parse(stored);
      return drawings.map((d: any) => ({
        ...d,
        createdAt: new Date(d.createdAt)
      }));
    } catch (error) {
      console.error('Failed to load DXF drawings:', error);
      return [];
    }
  }

  static deleteDrawing(drawingId: string): void {
    try {
      const drawings = this.getAllDrawings();
      const filtered = drawings.filter(d => d.id !== drawingId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete DXF drawing:', error);
    }
  }

  static clearAllDrawings(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear DXF drawings:', error);
    }
  }
}
