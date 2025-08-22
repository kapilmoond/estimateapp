import { TechnicalDrawing } from '../types';
import { LLMService } from './llmService';

// Professional CAD Drawing Standards
interface CADStandards {
  coordinateSystem: 'CAD' | 'SVG'; // CAD: Y-up, SVG: Y-down
  dimensionStandards: {
    extensionLineOverhang: number; // Extension beyond dimension line
    dimensionLineGap: number; // Gap between object and extension line
    textHeight: number; // Standard text height
    arrowSize: number; // Dimension arrow size
    textPlacement: 'above' | 'center' | 'below'; // Text position relative to dimension line
  };
  lineTypes: {
    object: { weight: number; style: 'solid' };
    dimension: { weight: number; style: 'solid' };
    extension: { weight: number; style: 'solid' };
    centerline: { weight: number; style: 'dashed' };
    hidden: { weight: number; style: 'dashed' };
  };
  textStandards: {
    font: string;
    size: number;
    orientation: 'horizontal' | 'aligned'; // Text orientation for dimensions
  };
}

const PROFESSIONAL_CAD_STANDARDS: CADStandards = {
  coordinateSystem: 'CAD', // Y-axis up (standard CAD)
  dimensionStandards: {
    extensionLineOverhang: 2, // mm beyond dimension line
    dimensionLineGap: 1, // mm gap from object
    textHeight: 3, // mm standard text height
    arrowSize: 2, // mm arrow size
    textPlacement: 'above' // Text above dimension line (ISO standard)
  },
  lineTypes: {
    object: { weight: 0.7, style: 'solid' },
    dimension: { weight: 0.35, style: 'solid' },
    extension: { weight: 0.35, style: 'solid' },
    centerline: { weight: 0.35, style: 'dashed' },
    hidden: { weight: 0.35, style: 'dashed' }
  },
  textStandards: {
    font: 'Arial',
    size: 3, // mm
    orientation: 'horizontal' // Keep text horizontal for readability
  }
};

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

  static async generateTechnicalDrawing(
    title: string,
    description: string,
    componentName: string,
    userInput: string,
    guidelines: string,
    designContext?: string,
    referenceText?: string
  ): Promise<TechnicalDrawing> {
    const basePrompt = `You are a professional structural engineer and CAD draftsman with expertise in construction drawings. Create a detailed technical drawing specification for a construction component.

${guidelines}

**PROJECT DETAILS:**
- Drawing Title: ${title}
- Component: ${componentName}
- Description: ${description}
- User Requirements: ${userInput}

${designContext ? `**DESIGN CONTEXT:**\n${designContext}\n` : ''}

**PROFESSIONAL CAD DRAWING REQUIREMENTS (ISO 128 / ANSI Y14.5 Standards):**

1. **SVG COORDINATE SYSTEM (CORRECTED FOR PROFESSIONAL OUTPUT):**
   - Use SVG coordinate system: Origin (0,0) at top-left
   - X-axis: Left to Right (positive right)
   - Y-axis: Top to Bottom (positive down) - SVG STANDARD
   - Place main component in UPPER area (Y: 50-300) so it appears at TOP
   - Title block at BOTTOM of drawing (Y: 520-580) - professional standard
   - CRITICAL: Component should be drawn in UPPER portion, NOT lower portion

2. **LINE STANDARDS (PROFESSIONAL VISIBILITY):**
   - Object lines (main structure): stroke-width="3" stroke="black" (bold and clear)
   - Dimension lines: stroke-width="2" stroke="blue" (clearly visible)
   - Extension lines: stroke-width="2" stroke="blue" (clearly visible)
   - Center lines: stroke-width="2" stroke="gray" stroke-dasharray="10,5"
   - Hidden lines: stroke-width="2" stroke="gray" stroke-dasharray="5,3"

3. **DIMENSIONING STANDARDS (READABLE AND PROFESSIONAL):**
   - Extension lines: Start 10mm from object, extend 15mm beyond dimension line
   - Dimension text: font-size="16" font-family="Arial" font-weight="bold"
   - Arrows: Use proper SVG markers, 12mm triangular arrows
   - Text orientation: Keep horizontal for readability
   - Dimension format: "XXX mm" with units clearly shown
   - Dimension lines should be 30-40mm from object for clarity

4. **PROFESSIONAL SVG STRUCTURE REQUIREMENTS:**
   Generate a complete SVG drawing with proper CAD standards:

   REQUIRED STRUCTURE ELEMENTS:
   - SVG element with viewBox="0 0 800 600" and proper xmlns
   - Defs section with arrow markers for dimensioning
   - Object-lines group for main structural elements
   - Dimensions group with extension lines, dimension lines, arrows, and text
   - Title-block group positioned at BOTTOM of drawing (Y: 520-580)

   CRITICAL POSITIONING REQUIREMENTS:
   - Main component in UPPER area (X: 200-600, Y: 50-300) - NOT in lower area
   - Component should appear in TOP half of drawing, NOT bottom half
   - Title block at BOTTOM (Y: 520-580) with proper professional layout

   PROFESSIONAL VISUAL REQUIREMENTS:
   - Arrow markers: markerWidth="15" markerHeight="10" with blue triangular polygons
   - Object lines: stroke-width="3" stroke="black" (bold and visible)
   - Dimension lines: stroke-width="2" stroke="blue" with marker-start and marker-end
   - Extension lines: stroke-width="2" stroke="blue" (clearly visible)
   - Dimension text: font-family="Arial" font-size="16" font-weight="bold" fill="blue"
   - Title text: font-family="Arial" font-size="18" font-weight="bold"
   - All text must be large enough to read clearly

5. **CRITICAL REQUIREMENTS:**
   - Generate complete, valid SVG code following the EXACT structure above
   - Use SVG coordinate system (Y-axis DOWN from top) - NOT CAD coordinates
   - CRITICAL: Main component in UPPER area (X: 200-600, Y: 50-300) - component at TOP
   - Title block at BOTTOM of drawing (Y: 520-580) - title at BOTTOM
   - Professional dimensioning with arrows and readable text
   - Bold, clearly visible lines and text
   - Use specified line weights: objects (3px), dimensions (2px)
   - Include realistic construction measurements in millimeters
   - All text must be large (16px+) and horizontal for readability

**OUTPUT REQUIREMENTS:**
Generate a complete, professional SVG drawing with:
- Valid, well-formed SVG code using SVG coordinate system (Y-axis down)
- Main component positioned in UPPER portion of drawing (Y: 50-300)
- Title block positioned at BOTTOM of drawing (Y: 520-580)
- Professional dimensioning with clear, bold arrows and text
- Bold line weights: objects (3px), dimensions (2px), extension lines (2px)
- Large, readable text: dimensions (16px), titles (18px)
- Construction-ready quality with realistic measurements

CRITICAL: Component must be in TOP area, NOT bottom area of the drawing.

Provide ONLY the complete SVG code. No markdown, explanations, or additional text.`;

    const fullPrompt = this.createPromptWithReference(basePrompt, referenceText);

    try {
      const svgResponse = await LLMService.generateContent(fullPrompt);

      // Extract and enhance SVG content from response
      const svgContent = this.extractAndValidateSVG(svgResponse);

      const drawing: TechnicalDrawing = {
        id: this.generateId(),
        title,
        description: `Professional technical drawing for ${componentName} - SVG format optimized for construction use`,
        svgContent,
        dimensions: { width: 800, height: 600 },
        scale: '1:50',
        componentName,
        createdAt: new Date()
      };

      // Save to storage
      const drawings = this.loadDrawings();
      drawings.push(drawing);
      this.saveDrawings(drawings);

      return drawing;
    } catch (error) {
      console.error('Error generating technical drawing:', error);
      throw new Error('Failed to generate technical drawing. Please try again.');
    }
  }

  static extractAndValidateSVG(response: string): string {
    // Extract SVG content from LLM response
    let svgContent = response.trim();

    // Remove any markdown code blocks
    svgContent = svgContent.replace(/```svg\n?/g, '').replace(/```\n?/g, '');

    // Find SVG content
    const svgMatch = svgContent.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      svgContent = svgMatch[0];
    }

    // Validate basic SVG structure
    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
      // Generate fallback professional SVG
      svgContent = this.generateFallbackSVG();
    }

    // Ensure proper CAD standards are applied
    svgContent = this.enhanceSVGWithCADStandards(svgContent);

    return svgContent;
  }

  static enhanceSVGWithCADStandards(svgContent: string): string {
    // Ensure proper viewBox
    if (!svgContent.includes('viewBox')) {
      svgContent = svgContent.replace('<svg', '<svg viewBox="0 0 800 600"');
    }

    // Ensure proper namespace
    if (!svgContent.includes('xmlns')) {
      svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Add professional arrow markers if not present
    if (!svgContent.includes('<defs>') && svgContent.includes('marker-')) {
      const defsSection = `
        <defs>
          <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
            <polygon points="0 0, 12 6, 0 12" fill="blue"/>
          </marker>
        </defs>`;
      svgContent = svgContent.replace('>', '>' + defsSection);
    }

    // Enhance line weights for professional appearance
    svgContent = svgContent.replace(/stroke-width="0\.7"/g, 'stroke-width="3"');
    svgContent = svgContent.replace(/stroke-width="0\.35"/g, 'stroke-width="2"');
    svgContent = svgContent.replace(/stroke-width="1"/g, 'stroke-width="2"');

    // Enhance text sizes for readability
    svgContent = svgContent.replace(/font-size="3"/g, 'font-size="16"');
    svgContent = svgContent.replace(/font-size="4"/g, 'font-size="18"');
    svgContent = svgContent.replace(/font-size="12"/g, 'font-size="16"');
    svgContent = svgContent.replace(/font-size="14"/g, 'font-size="16"');

    // Add font-weight to make text bold
    svgContent = svgContent.replace(/font-size="16"/g, 'font-size="16" font-weight="bold"');
    svgContent = svgContent.replace(/font-size="18"/g, 'font-size="18" font-weight="bold"');

    // Ensure title block is at bottom
    if (svgContent.includes('title-block')) {
      // Move title block to bottom if it's positioned too high
      svgContent = svgContent.replace(/y="[0-4][0-9][0-9]"/g, (match) => {
        const y = parseInt(match.match(/\d+/)[0]);
        if (y < 500) {
          return match.replace(/\d+/, '520');
        }
        return match;
      });
    }

    return svgContent;
  }

  static generateFallbackSVG(): string {
    const currentDate = new Date().toLocaleDateString();
    return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow" markerWidth="15" markerHeight="10" refX="12" refY="5" orient="auto">
          <polygon points="0 0, 15 5, 0 10" fill="blue"/>
        </marker>
      </defs>

      <!-- Main structural component (positioned in UPPER area) -->
      <g id="object-lines">
        <rect x="300" y="100" width="200" height="100"
              fill="none" stroke="black" stroke-width="3"/>
        <!-- Additional structural details -->
        <line x1="320" y1="100" x2="320" y2="200" stroke="black" stroke-width="2"/>
        <line x1="480" y1="100" x2="480" y2="200" stroke="black" stroke-width="2"/>
        <circle cx="350" cy="150" r="6" fill="none" stroke="black" stroke-width="2"/>
        <circle cx="450" cy="150" r="6" fill="none" stroke="black" stroke-width="2"/>
      </g>

      <!-- Professional dimensioning -->
      <g id="dimensions">
        <!-- Horizontal dimension (width) -->
        <line x1="300" y1="80" x2="300" y2="70" stroke="blue" stroke-width="2"/>
        <line x1="500" y1="80" x2="500" y2="70" stroke="blue" stroke-width="2"/>
        <line x1="300" y1="75" x2="500" y2="75" stroke="blue" stroke-width="2"
              marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="400" y="65" font-family="Arial" font-size="16" text-anchor="middle" fill="blue" font-weight="bold">200 mm</text>

        <!-- Vertical dimension (height) -->
        <line x1="280" y1="100" x2="270" y2="100" stroke="blue" stroke-width="2"/>
        <line x1="280" y1="200" x2="270" y2="200" stroke="blue" stroke-width="2"/>
        <line x1="275" y1="100" x2="275" y2="200" stroke="blue" stroke-width="2"
              marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="265" y="150" font-family="Arial" font-size="16" text-anchor="middle" fill="blue" font-weight="bold"
              transform="rotate(-90, 265, 150)">100 mm</text>

        <!-- Detail dimensions -->
        <line x1="320" y1="220" x2="320" y2="230" stroke="blue" stroke-width="2"/>
        <line x1="480" y1="220" x2="480" y2="230" stroke="blue" stroke-width="2"/>
        <line x1="320" y1="225" x2="480" y2="225" stroke="blue" stroke-width="2"
              marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="400" y="245" font-family="Arial" font-size="16" text-anchor="middle" fill="blue" font-weight="bold">160 mm</text>
      </g>

      <!-- Professional title block at bottom -->
      <g id="title-block">
        <rect x="50" y="520" width="700" height="60" fill="none" stroke="black" stroke-width="2"/>
        <line x1="50" y1="545" x2="750" y2="545" stroke="black" stroke-width="1"/>
        <line x1="400" y1="520" x2="400" y2="580" stroke="black" stroke-width="1"/>

        <text x="60" y="540" font-family="Arial" font-size="18" font-weight="bold">CONSTRUCTION COMPONENT</text>
        <text x="60" y="560" font-family="Arial" font-size="14">Material: Concrete M25</text>
        <text x="60" y="575" font-family="Arial" font-size="14">Scale: 1:50</text>

        <text x="410" y="540" font-family="Arial" font-size="14" font-weight="bold">Drawing No: CC-001</text>
        <text x="410" y="560" font-family="Arial" font-size="14">Date: ${currentDate}</text>
        <text x="410" y="575" font-family="Arial" font-size="14">Rev: A</text>
      </g>

      <!-- Grid lines for professional appearance -->
      <g id="grid" opacity="0.1">
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="gray" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </g>
    </svg>`;
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

  static downloadDrawingAsSVG(drawing: TechnicalDrawing): void {
    const blob = new Blob([drawing.svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${drawing.title.replace(/\s+/g, '_')}_Drawing.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        svg { max-width: 100%; height: auto; border: 1px solid #ccc; }
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
        ${drawing.svgContent}
        <div class="no-print" style="margin-top: 20px;">
            <button onclick="window.print()">Print Drawing</button>
            <button onclick="window.close()">Close</button>
        </div>
    </div>
</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }

  private static createPromptWithReference(basePrompt: string, referenceText?: string): string {
    if (referenceText && referenceText.trim()) {
      return `You have been provided with reference documents. Use this information to inform your drawing specifications.

REFERENCE DOCUMENTS:
---
${referenceText}
---

${basePrompt}`;
    }
    return basePrompt;
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
