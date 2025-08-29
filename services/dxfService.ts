/**
 * DXF Service - Professional CAD Drawing Generation
 * Connects to Google Cloud Functions backend for generating DXF files with proper dimensions
 */

import { TechnicalDrawing } from '../types';
import { CloudConfig } from './cloudConfig';

export interface DXFGenerationRequest {
  title: string;
  description: string;
  userRequirements: string;
}

export interface DXFGenerationResponse {
  success: boolean;
  dxfContent?: string; // Base64 encoded DXF content
  filename?: string;
  metadata?: {
    drawingType: string;
    scale: string;
    dimensions: {
      width: number;
      height: number;
      units: string;
    };
    layers: string[];
    hasAnnotations: boolean;
    hasDimensions: boolean;
  };
  error?: string;
}

export class DXFService {
  private static readonly ENDPOINTS = {
    GENERATE: '/generate-dxf-endpoint',
    HEALTH: '/health',
    TEST: '/test-hardcoded-dxf'
  };

  /**
   * Generate DXF drawing from description using Google Cloud Functions
   */
  static async generateDXFFromDescription(
    title: string,
    description: string,
    userRequirements: string
  ): Promise<TechnicalDrawing> {
    const config = CloudConfig.getBackendConfig();
    
    if (!config.url) {
      throw new Error('Backend configuration is required. Please configure your Google Cloud Functions URL.');
    }

    const payload: DXFGenerationRequest = {
      title,
      description,
      userRequirements
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(CloudConfig.getEndpointUrl(this.ENDPOINTS.GENERATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DXF generation failed: ${response.status} - ${errorText}`);
      }

      // Check if response is DXF content (binary) or JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // JSON response with metadata
        const result: DXFGenerationResponse = await response.json();
        
        if (!result.success || !result.dxfContent) {
          throw new Error(result.error || 'Failed to generate DXF content');
        }

        return this.createTechnicalDrawing(title, description, userRequirements, result);
      } else {
        // Direct DXF binary content
        const dxfBuffer = await response.arrayBuffer();
        const dxfContent = this.arrayBufferToBase64(dxfBuffer);
        
        return this.createTechnicalDrawing(title, description, userRequirements, {
          success: true,
          dxfContent,
          filename: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.dxf`
        });
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - the drawing generation is taking too long. Please try again.');
        }
        throw error;
      }
      throw new Error('Unknown error occurred during DXF generation');
    }
  }

  /**
   * Test backend connectivity
   */
  static async testBackendConnectivity(): Promise<{
    available: boolean;
    message: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const result = await CloudConfig.testConnectivity();
      return {
        available: result.available,
        message: result.available ? 
          `Backend available (${result.type}) - ${result.responseTime}ms` : 
          result.error || 'Backend not available',
        responseTime: result.responseTime
      };
    } catch (error) {
      return {
        available: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate test DXF using hardcoded backend endpoint
   */
  static async generateTestDXF(): Promise<TechnicalDrawing> {
    const config = CloudConfig.getBackendConfig();
    
    try {
      const response = await fetch(CloudConfig.getEndpointUrl(this.ENDPOINTS.TEST), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Test DXF generation failed: ${response.status}`);
      }

      const dxfBuffer = await response.arrayBuffer();
      const dxfContent = this.arrayBufferToBase64(dxfBuffer);
      
      return this.createTechnicalDrawing(
        'Test Drawing',
        'Hardcoded test drawing from backend',
        'Test generation',
        {
          success: true,
          dxfContent,
          filename: 'test_drawing.dxf'
        }
      );

    } catch (error) {
      throw new Error(`Test DXF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create TechnicalDrawing object from DXF generation response
   */
  private static createTechnicalDrawing(
    title: string,
    description: string,
    userRequirements: string,
    response: DXFGenerationResponse
  ): TechnicalDrawing {
    const now = new Date();
    
    return {
      id: this.generateId(),
      title,
      description,
      dxfContent: response.dxfContent!,
      dxfFilename: response.filename || `${title.replace(/[^a-zA-Z0-9]/g, '_')}.dxf`,
      createdAt: now,
      updatedAt: now,
      metadata: response.metadata || {
        drawingType: 'general',
        scale: '1:100',
        dimensions: {
          width: 1000,
          height: 800,
          units: 'mm'
        },
        layers: ['0-STRUCTURAL', '1-DIMENSIONS', '2-TEXT'],
        hasAnnotations: true,
        hasDimensions: true
      },
      userRequirements,
      includeInContext: true
    };
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to text (for DXF content inspection)
   */
  static base64ToText(base64: string): string {
    try {
      return atob(base64);
    } catch (error) {
      throw new Error('Invalid base64 DXF content');
    }
  }

  /**
   * Download DXF file from TechnicalDrawing
   */
  static downloadDXF(drawing: TechnicalDrawing): void {
    try {
      const dxfText = this.base64ToText(drawing.dxfContent);
      const blob = new Blob([dxfText], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = drawing.dxfFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error('Failed to download DXF file: Invalid content');
    }
  }

  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

/**
 * DXF Storage Service - Local storage management for drawings
 */
export class DXFStorageService {
  private static readonly STORAGE_KEY = 'hsr-technical-drawings';

  /**
   * Save drawing to local storage
   */
  static saveDrawing(drawing: TechnicalDrawing): void {
    const drawings = this.loadDrawings();
    drawings.push(drawing);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drawings));
  }

  /**
   * Load all drawings from local storage
   */
  static loadDrawings(): TechnicalDrawing[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const drawings = JSON.parse(stored);
      return drawings.map((d: any) => ({
        ...d,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading drawings:', error);
      return [];
    }
  }

  /**
   * Delete drawing by ID
   */
  static deleteDrawing(drawingId: string): boolean {
    const drawings = this.loadDrawings();
    const filtered = drawings.filter(d => d.id !== drawingId);
    
    if (filtered.length === drawings.length) return false;
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  /**
   * Update drawing
   */
  static updateDrawing(drawingId: string, updates: Partial<TechnicalDrawing>): TechnicalDrawing | null {
    const drawings = this.loadDrawings();
    const index = drawings.findIndex(d => d.id === drawingId);
    
    if (index === -1) return null;
    
    drawings[index] = { ...drawings[index], ...updates, updatedAt: new Date() };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drawings));
    
    return drawings[index];
  }

  /**
   * Get drawing by ID
   */
  static getDrawing(drawingId: string): TechnicalDrawing | null {
    const drawings = this.loadDrawings();
    return drawings.find(d => d.id === drawingId) || null;
  }

  /**
   * Clear all drawings
   */
  static clearAllDrawings(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
