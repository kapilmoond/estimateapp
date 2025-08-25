/**
 * Professional DXF Drawing Service
 * Replaces SVG system with ezdxf-based professional CAD drawings
 * Supports both local development and Google Cloud Functions deployment
 */

import { TechnicalDrawing, DXFDrawingData, DXFElement } from '../types';
import { CloudConfig } from './cloudConfig';
import { DXFPDFService } from './pdfService';

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
    // 🔍 DEBUGGING: Store debug information for user inspection
    const debugInfo = {
      prompt_sent: '',
      ai_response_raw: '',
      ai_response_cleaned: '',
      parsed_data: null as any,
      backend_logs: '',
      timestamp: new Date().toISOString()
    };
    const controller = new AbortController();
    const timeout = CloudConfig.getTimeout();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // First try the new AI-powered endpoint
      const endpointUrl = CloudConfig.getEndpointUrl('/generate-dxf-endpoint');
      
      // 🔍 DEBUGGING: Log the request payload
      const requestPayload = {
        title,
        description,
        user_requirements: aiGeneratedContent
      };
      
      console.log('🔍 DEBUG: Request payload to backend:', requestPayload);
      debugInfo.prompt_sent = JSON.stringify(requestPayload, null, 2);
      
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 🔍 DEBUGGING: Capture error response
        const errorText = await response.text();
        debugInfo.backend_logs = `ERROR ${response.status}: ${errorText}`;
        console.log('🔍 DEBUG: Backend error response:', debugInfo.backend_logs);
        
        // Store debug info in localStorage for user inspection
        localStorage.setItem('dxf_debug_last_error', JSON.stringify(debugInfo));
        
        throw new Error(`DXF generation failed: ${response.status} ${response.statusText}. ${errorText}`);
      }

      // 🔍 DEBUGGING: For successful responses, check if we can get debug info from headers
      const debugHeader = response.headers.get('X-Debug-Summary');
      const debugDetails = response.headers.get('X-Debug-Details');
      
      if (debugHeader) {
        try {
          const backendDebug = JSON.parse(debugHeader);
          debugInfo.backend_logs = backendDebug;
          console.log('🔍 DEBUG: Backend summary captured:', backendDebug);
        } catch (e) {
          console.warn('Could not parse debug header:', e);
        }
      }
      
      if (debugDetails) {
        try {
          const detailedDebug = JSON.parse(debugDetails);
          debugInfo.ai_response_raw = detailedDebug.ai_response_raw || '';
          debugInfo.ai_response_cleaned = detailedDebug.ai_response_cleaned || '';
          debugInfo.parsed_data = detailedDebug.parsed_data || null;
          console.log('🔍 DEBUG: Detailed debug info captured:', detailedDebug);
        } catch (e) {
          console.warn('Could not parse debug details header:', e);
        }
      }

      // For the new endpoint, we get the DXF file directly
      const blob = await response.blob();
      const base64Content = await this.blobToBase64(blob);

      // 🔍 DEBUGGING: Try to fetch detailed debug info from backend
      try {
        const debugEndpoint = CloudConfig.getEndpointUrl('/get-debug-info');
        const debugResponse = await fetch(debugEndpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (debugResponse.ok) {
          const debugResult = await debugResponse.json();
          if (debugResult.success && debugResult.debug_data) {
            debugInfo.ai_response_raw = debugResult.debug_data.ai_response_raw || '';
            debugInfo.ai_response_cleaned = debugResult.debug_data.ai_response_cleaned || '';
            debugInfo.parsed_data = debugResult.debug_data.parsed_data || null;
            debugInfo.backend_logs = debugResult.debug_data.backend_logs || '';
            console.log('🔍 DEBUG: Detailed debug info fetched from endpoint:', debugResult.debug_data);
          }
        }
      } catch (debugError) {
        console.warn('Could not fetch debug info from endpoint:', debugError);
      }
      
      // 🔍 DEBUGGING: Store debug info for user inspection
      localStorage.setItem('dxf_debug_last_success', JSON.stringify(debugInfo));

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
        drawingType: 'dxf',
        // 🔍 Add debug information to drawing object
        debugInfo: debugInfo
      } as any;

      console.log('✅ AI-powered DXF generated successfully');
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
      // Create enhanced regeneration prompt with ezdxf knowledge
      const regenerationPrompt = `You are a professional construction engineer and technical draftsman with expertise in Python ezdxf library. You need to modify an existing technical drawing based on user instructions.

**ORIGINAL DRAWING:**
Title: ${originalDrawing.title}
Description: ${originalDrawing.description}

**USER MODIFICATION INSTRUCTIONS (MUST FOLLOW):**
${userInstructions}

**EZDXF PROFESSIONAL STANDARDS (CRITICAL FOR CODE GENERATION):**

🏗️ **MANDATORY SETUP (Always Include):**

import ezdxf
from ezdxf import units

# Professional document setup
doc = ezdxf.new("R2010", setup=True)
doc.units = units.MM
msp = doc.modelspace()

# Create standard construction layers
layers = {
    "0-STRUCTURAL-FOUNDATION": {"color": 1, "lineweight": 50},
    "0-STRUCTURAL-COLUMNS": {"color": 2, "lineweight": 35},
    "0-STRUCTURAL-BEAMS": {"color": 3, "lineweight": 35},
    "1-REINFORCEMENT-MAIN": {"color": 1, "lineweight": 25},
    "2-DIMENSIONS-LINEAR": {"color": 256, "lineweight": 18},
    "3-TEXT-ANNOTATIONS": {"color": 256, "lineweight": 18},
    "4-GRID-LINES": {"color": 8, "lineweight": 13}
}

for name, props in layers.items():
    layer = doc.layers.add(name)
    layer.color = props["color"]
    layer.lineweight = props["lineweight"]

# Text styles
doc.styles.add("TITLE").dxf.height = 5.0
doc.styles.add("STANDARD").dxf.height = 2.5
doc.styles.add("NOTES").dxf.height = 1.8

# Dimension style
dimstyle = doc.dimstyles.add("STRUCTURAL")
dimstyle.dxf.dimtxt = 2.5; dimstyle.dxf.dimasz = 2.5

📐 **STRUCTURAL ELEMENTS (Professional Standards):**

# Column function
def column(center, width, height):
    x, y = center; hw, hh = width/2, height/2
    points = [(x-hw,y-hh), (x+hw,y-hh), (x+hw,y+hh), (x-hw,y+hh), (x-hw,y-hh)]
    return msp.add_lwpolyline(points, dxfattribs={"layer": "0-STRUCTURAL-COLUMNS", "closed": True})

# Beam function
def beam(start, end, width):
    import math
    dx, dy = end[0]-start[0], end[1]-start[1]
    angle = math.atan2(dy, dx)
    px, py = -math.sin(angle)*width/2, math.cos(angle)*width/2
    points = [(start[0]+px,start[1]+py), (end[0]+px,end[1]+py), (end[0]-px,end[1]-py), (start[0]-px,start[1]-py)]
    return msp.add_lwpolyline(points, dxfattribs={"layer": "0-STRUCTURAL-BEAMS", "closed": True})

🔧 **REINFORCEMENT (Professional Details):**

# Main reinforcement bars
for i in range(num_bars):
    offset = (i - num_bars/2) * 50  # 50mm spacing
    msp.add_line((start[0], start[1]+offset), (end[0], end[1]+offset), 
                dxfattribs={"layer": "1-REINFORCEMENT-MAIN"})

📏 **DIMENSIONS & TEXT (Professional Standards):**

# Linear dimension
dim = msp.add_linear_dim(
    base=(start[0], start[1] + 5000),  # 5000mm offset above
    p1=start, p2=end, dimstyle="STRUCTURAL",
    dxfattribs={"layer": "2-DIMENSIONS-LINEAR"})
dim.render()

⚙️ **CRITICAL REQUIREMENTS:**
• All dimensions in millimeters (mm)
• Text heights: Title=5mm, Standard=2.5mm, Notes=1.8mm
• All entities MUST be assigned to proper layers (not layer "0")
• MANDATORY: Include complete dimension chains for ALL major elements
• MANDATORY: Include hatching patterns for ALL concrete structural elements
• MANDATORY: Include text annotations for ALL structural elements
• Professional layer naming (0-STRUCTURAL-*, 1-REINFORCEMENT-*, etc.)
• Always end with: doc.saveas("drawing.dxf")

**INSTRUCTIONS:**
1. **PRIORITIZE the user's modification instructions above all else**
2. Maintain the overall structure and professional standards of the original drawing
3. Apply the requested modifications while keeping the drawing complete and professional
4. **MANDATORY: Ensure the modified drawing includes:**
   - ALL dimensions for major elements (minimum 3-5 dimension entities)
   - Hatching patterns for concrete areas using ANSI31 or similar
   - Text labels for all major structural elements
   - Proper layer organization and professional standards
5. Generate a comprehensive modified technical drawing specification with complete Python ezdxf code
6. **Output a detailed technical drawing specification** with complete, professional Python ezdxf code that incorporates the user's requested changes.

⚠️ **CRITICAL: The modified drawing specification MUST explicitly mention:**
   - "Maintain/add linear dimensions for [specify elements]"
   - "Include/update hatching patterns for concrete areas"
   - "Update text annotations for modified elements"

Focus on implementing exactly what the user requested for modifications while maintaining professional CAD standards.`;

      // Generate modified drawing description using LLM with enhanced prompt
      const LLMService = (await import('../services/llmService')).LLMService;
      const modifiedDescription = await LLMService.generateContent(regenerationPrompt);

      const newTitle = originalDrawing.title.replace(' (Modified)', '') + ' (Modified)';

      // Generate the new DXF drawing
      const regeneratedDrawing = await this.generateDXFFromDescription(
        newTitle,
        modifiedDescription,
        userInstructions
      );

      console.log('✅ Drawing regenerated successfully with ezdxf knowledge');
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

  /**
   * Convert DXF drawing to PDF and download
   */
  static async downloadDXFAsPDF(drawing: TechnicalDrawing): Promise<void> {
    try {
      console.log('🔄 Converting DXF to PDF for download...');
      await DXFPDFService.convertDXFToPDF(drawing);
      console.log('✅ DXF to PDF conversion completed');
    } catch (error) {
      console.error('❌ DXF to PDF conversion failed:', error);
      throw new Error(`Failed to convert DXF to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
