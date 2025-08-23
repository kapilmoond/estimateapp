/**
 * Professional DXF Drawing Service
 * Replaces SVG system with ezdxf-based professional CAD drawings
 * Supports both local development and Google Cloud Functions deployment
 */

import { TechnicalDrawing, DXFDrawingData, DXFElement } from '../types';
import { CloudConfig } from './cloudConfig';

export class DXFService {
  private static backendConfig = CloudConfig.getBackendConfig();
  
  /**
   * Generate professional DXF drawing from AI description
   */
  static async generateDXFFromDescription(
    title: string,
    description: string,
    aiGeneratedContent: string
  ): Promise<TechnicalDrawing> {
    console.log('🏗️ Generating professional DXF drawing...');

    try {
      // Always try backend first for real DXF generation
      const backendAvailable = await this.quickBackendCheck();

      if (!backendAvailable) {
        throw new Error(
          'Python backend is not available. Please ensure your Google Cloud Functions URL is configured correctly in Backend Configuration.'
        );
      }

      console.log('✅ Python backend available - generating professional DXF');
      return await this.generateDXFWithBackend(title, description, aiGeneratedContent);

    } catch (error) {
      // If backend fails, provide specific error message
      if (error instanceof Error && error.message.includes('backend is not available')) {
        throw error; // Re-throw backend availability error
      }
      
      console.error('❌ DXF generation failed:', error);
      throw new Error(
        `Failed to generate DXF drawing: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your backend configuration and try again.`
      );
    }
  }

  /**
   * Generate DXF using Python backend with AI-powered geometry parsing
   */
  private static async generateDXFWithBackend(
    title: string,
    description: string,
    aiGeneratedContent: string
  ): Promise<TechnicalDrawing> {
    const controller = new AbortController();
    const timeout = CloudConfig.getTimeout();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // First try the new AI-powered endpoint
      const endpointUrl = CloudConfig.getEndpointUrl('/generate-dxf-endpoint');
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          user_requirements: aiGeneratedContent
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // If AI endpoint fails, try the fallback endpoint
        console.warn('AI endpoint failed, trying fallback...');
        return await this.generateDXFWithFallback(title, description, aiGeneratedContent);
      }

      // For the new endpoint, we get the DXF file directly
      const blob = await response.blob();
      const base64Content = await this.blobToBase64(blob);

      // Create TechnicalDrawing object
      const drawing: TechnicalDrawing = {
        id: this.generateId(),
        title,
        description,
        dxfContent: base64Content,
        dxfFilename: `${title.replace(/\s+/g, '_')}.dxf`,
        dimensions: { width: 800, height: 600 },
        scale: '1:100',
        componentName: this.extractComponentName(title),
        createdAt: new Date(),
        includeInContext: true,
        dxfData: this.createDXFData(title, description, aiGeneratedContent),
        drawingType: 'dxf'
      };

      console.log('✅ AI-powered DXF generated successfully');
      return drawing;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Fallback DXF generation using the original endpoint
   */
  private static async generateDXFWithFallback(
    title: string,
    description: string,
    aiGeneratedContent: string
  ): Promise<TechnicalDrawing> {
    const controller = new AbortController();
    const timeout = CloudConfig.getTimeout();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const endpointUrl = CloudConfig.getEndpointUrl('/parse-ai-drawing');
      const response = await fetch(endpointUrl, {
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
   * Quick backend check with very short timeout for generation
   */
  private static async quickBackendCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Increased to 3 seconds for more reliable check

      const endpointUrl = CloudConfig.getEndpointUrl('/health');
      const response = await fetch(endpointUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Python backend is available (for UI status)
   */
  static async checkBackendHealth(): Promise<boolean> {
    try {
      const connectivity = await CloudConfig.testConnectivity();
      return connectivity.available;
    } catch (error) {
      console.warn('Backend connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Get backend status information
   */
  static async getBackendStatus(): Promise<{
    available: boolean;
    type: string;
    url: string;
    responseTime: number;
    error?: string;
  }> {
    return await CloudConfig.testConnectivity();
  }

  /**
   * Test hardcoded DXF generation to isolate ezdxf issues
   */
  static async testHardcodedDXF(): Promise<TechnicalDrawing> {
    console.log('🧪 Testing hardcoded DXF generation...');

    try {
      const endpointUrl = CloudConfig.getEndpointUrl('/test-hardcoded-dxf');
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Hardcoded test failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const base64Content = await this.blobToBase64(blob);

      const drawing: TechnicalDrawing = {
        id: this.generateId(),
        title: 'Hardcoded Test Drawing',
        description: '🧪 This is a hardcoded test to verify ezdxf library functionality.\n\nContains:\n• Simple line from (0,0) to (50,25)\n• Circle at center (25,12.5) with radius 10\n\nIf this downloads successfully, the ezdxf library is working correctly.',
        dxfContent: base64Content,
        dxfFilename: 'hardcoded_test.dxf',
        dimensions: { width: 800, height: 600 },
        scale: '1:1',
        componentName: 'test',
        createdAt: new Date(),
        includeInContext: false,
        dxfData: this.createDXFData('Test', 'Hardcoded test drawing', 'Test content'),
        drawingType: 'dxf'
      };

      console.log('✅ Hardcoded DXF test completed successfully');
      return drawing;
    } catch (error) {
      console.error('❌ Hardcoded DXF test failed:', error);
      throw error;
    }
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
      const newTitle = originalDrawing.title.replace(' (Modified)', '') + ' (Modified)';

      const regeneratedDrawing = await this.generateDXFFromDescription(
        newTitle,
        enhancedDescription,
        enhancedDescription
      );

      console.log('✅ Drawing regenerated successfully');
      return regeneratedDrawing;
    } catch (error) {
      console.error('❌ DXF regeneration error:', error);
      throw new Error(
        `Failed to regenerate DXF drawing: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your backend configuration and try again.`
      );
    }
  }

  /**
   * Generate DXF preview for display
   */
  static async getDXFPreview(drawing: TechnicalDrawing): Promise<string> {
    try {
      // For DXF files, we return a textual description as preview
      const preview = `
🏗️ DXF Technical Drawing Preview

Title: ${drawing.title}
Component: ${drawing.componentName}
Scale: ${drawing.scale}
File: ${drawing.dxfFilename}
Dimensions: ${drawing.dimensions.width} × ${drawing.dimensions.height}

Description:
${drawing.description}

Created: ${drawing.createdAt.toLocaleDateString()}

📋 To view the full technical drawing, download the DXF file and open it in AutoCAD, Revit, or any compatible CAD software.
      `;
      
      return preview;
    } catch (error) {
      console.error('Failed to generate DXF preview:', error);
      return 'Preview unavailable - Download DXF file to view in CAD software';
    }
  }

  /**
   * Download DXF file to user's device
   */
  static async downloadDXF(drawing: TechnicalDrawing): Promise<void> {
    try {
      if (!drawing.dxfContent) {
        throw new Error('No DXF content available for download');
      }

      // Convert base64 to blob
      const blob = this.base64ToBlob(drawing.dxfContent, 'application/dxf');
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = drawing.dxfFilename || `${drawing.title.replace(/\s+/g, '_')}.dxf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      console.log(`✅ DXF file downloaded: ${link.download}`);
    } catch (error) {
      console.error('❌ DXF download failed:', error);
      throw new Error(`Failed to download DXF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 content
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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
