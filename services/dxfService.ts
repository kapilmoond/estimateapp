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
    // Always try fallback first to avoid network errors
    console.log('🏗️ Generating DXF drawing...');

    try {
      // Quick backend check with very short timeout
      const backendAvailable = await this.quickBackendCheck();

      if (backendAvailable) {
        console.log('✅ Python backend available - generating professional DXF');
        try {
          return await this.generateDXFWithBackend(title, description, aiGeneratedContent);
        } catch (backendError) {
          console.warn('❌ Backend generation failed, falling back to demo mode:', backendError);
          return this.generateMockDXF(title, description, aiGeneratedContent);
        }
      } else {
        console.log('⚠️ Python backend not available - using demo DXF generation');
        return this.generateMockDXF(title, description, aiGeneratedContent);
      }
    } catch (error) {
      console.warn('🔄 Error during generation, using demo mode:', error);
      return this.generateMockDXF(title, description, aiGeneratedContent);
    }
  }

  /**
   * Generate DXF using Python backend
   */
  private static async generateDXFWithBackend(
    title: string,
    description: string,
    aiGeneratedContent: string
  ): Promise<TechnicalDrawing> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for generation

    try {
      const response = await fetch(`${this.PYTHON_BACKEND_URL}/parse-ai-drawing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: aiGeneratedContent
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

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
        dimensions: { width: 800, height: 600 },
        scale: '1:100',
        componentName: this.extractComponentName(title),
        createdAt: new Date(),
        includeInContext: true,
        dxfData: this.createDXFData(title, description, aiGeneratedContent),
        drawingType: 'dxf'
      };

      return drawing;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Generate mock DXF for demo when backend is not available
   */
  private static generateMockDXF(
    title: string,
    description: string,
    aiGeneratedContent: string
  ): TechnicalDrawing {
    console.log('📋 Generating demo DXF file...');

    // Create a mock base64 DXF content (minimal DXF structure)
    const mockDXFContent = this.createMockDXFContent(title, description);

    const drawing: TechnicalDrawing = {
      id: this.generateId(),
      title: `${title} (DEMO)`,
      description: `🎯 DEMO MODE DRAWING\n\n📋 Original Request: ${description}\n\n⚠️ This is a basic demo DXF file for testing purposes.\n\n🏗️ FOR PROFESSIONAL CAD FILES:\n• Start the Python backend server (python-backend/setup.py)\n• Get real ezdxf-generated professional drawings\n• Compatible with AutoCAD, Revit, and all CAD software\n• Construction industry standards and quality\n\n📁 This demo file is still a valid DXF that you can open in CAD software to test the workflow.`,
      dxfContent: mockDXFContent,
      dxfFilename: `${title.replace(/\s+/g, '_')}_DEMO.dxf`,
      dimensions: { width: 800, height: 600 },
      scale: '1:100',
      componentName: this.extractComponentName(title),
      createdAt: new Date(),
      includeInContext: true,
      dxfData: this.createDXFData(title, description, aiGeneratedContent),
      drawingType: 'dxf'
    };

    console.log('✅ Demo DXF generated successfully');
    return drawing;
  }

  /**
   * Regenerate DXF drawing with user instructions
   */
  static async regenerateDXFWithInstructions(
    originalDrawing: TechnicalDrawing,
    userInstructions: string
  ): Promise<TechnicalDrawing> {
    console.log('🔄 Regenerating drawing with user instructions...');

    try {
      const enhancedDescription = `${originalDrawing.description}\n\nUSER MODIFICATIONS:\n${userInstructions}`;
      const newTitle = originalDrawing.title.replace(' (DEMO)', '') + ' (Modified)';

      const regeneratedDrawing = await this.generateDXFFromDescription(
        newTitle,
        enhancedDescription,
        enhancedDescription
      );

      console.log('✅ Drawing regenerated successfully');
      return regeneratedDrawing;
    } catch (error) {
      console.error('❌ DXF regeneration error:', error);
      // Still return a demo version with the modifications noted
      console.log('🔄 Falling back to demo regeneration...');

      const enhancedDescription = `${originalDrawing.description}\n\nUSER MODIFICATIONS:\n${userInstructions}`;
      return this.generateMockDXF(
        originalDrawing.title.replace(' (DEMO)', '') + ' (Modified)',
        enhancedDescription,
        enhancedDescription
      );
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
   * Quick backend check with very short timeout for generation
   */
  private static async quickBackendCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout

      const response = await fetch(`${this.PYTHON_BACKEND_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // Don't log error here to avoid console spam
      return false;
    }
  }

  /**
   * Check if Python backend is available (for UI status)
   */
  static async checkBackendHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`${this.PYTHON_BACKEND_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Python backend not available:', error);
      return false;
    }
  }

  /**
   * Create mock DXF content for demo purposes
   */
  private static createMockDXFContent(title: string, description: string): string {
    // Create a minimal but valid DXF file structure
    const dxfContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1021
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
LTYPE
70
1
0
LTYPE
2
CONTINUOUS
70
64
3
Solid line
72
65
73
0
40
0.0
0
ENDTAB
0
TABLE
2
LAYER
70
1
0
LAYER
2
0
70
64
62
7
6
CONTINUOUS
0
LAYER
2
STRUCTURAL
70
64
62
1
6
CONTINUOUS
0
LAYER
2
DIMENSIONS
70
64
62
2
6
CONTINUOUS
0
LAYER
2
TEXT
70
64
62
3
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
0
TEXT
8
TEXT
10
50.0
20
50.0
30
0.0
40
5.0
1
${title}
0
TEXT
8
TEXT
10
50.0
20
40.0
30
0.0
40
3.0
1
DEMO MODE - Start Python backend for real DXF
0
LINE
8
STRUCTURAL
10
100.0
20
100.0
30
0.0
11
200.0
21
100.0
31
0.0
0
LINE
8
STRUCTURAL
10
200.0
20
100.0
30
0.0
11
200.0
21
150.0
31
0.0
0
LINE
8
STRUCTURAL
10
200.0
20
150.0
30
0.0
11
100.0
21
150.0
31
0.0
0
LINE
8
STRUCTURAL
10
100.0
20
150.0
30
0.0
11
100.0
21
100.0
31
0.0
0
ENDSEC
0
EOF`;

    // Convert to base64
    return btoa(dxfContent);
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
        <rect width="800" height="600" fill="#fff3cd" stroke="#ffeaa7" stroke-width="2"/>
        <text x="400" y="200" text-anchor="middle" font-family="Arial" font-size="24" fill="#856404">
          🏗️ Professional DXF Drawing
        </text>
        <text x="400" y="240" text-anchor="middle" font-family="Arial" font-size="18" fill="#856404">
          ${title}
        </text>
        <text x="400" y="280" text-anchor="middle" font-family="Arial" font-size="14" fill="#856404">
          ⚠️ DEMO MODE - Python Backend Not Running
        </text>
        <text x="400" y="320" text-anchor="middle" font-family="Arial" font-size="12" fill="#856404">
          To generate real professional DXF files:
        </text>
        <text x="400" y="340" text-anchor="middle" font-family="Arial" font-size="12" fill="#856404">
          1. Navigate to python-backend folder
        </text>
        <text x="400" y="360" text-anchor="middle" font-family="Arial" font-size="12" fill="#856404">
          2. Run: python setup.py
        </text>
        <text x="400" y="380" text-anchor="middle" font-family="Arial" font-size="12" fill="#856404">
          3. Keep server running on localhost:5000
        </text>
        <rect x="300" y="420" width="200" height="40" fill="#ffc107" rx="5"/>
        <text x="400" y="445" text-anchor="middle" font-family="Arial" font-size="14" fill="#212529">
          Download Demo DXF
        </text>
        <text x="400" y="480" text-anchor="middle" font-family="Arial" font-size="10" fill="#856404">
          See python-backend/README.md for setup instructions
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
