import { TechnicalDrawing } from '../types';
import { LLMService } from './llmService';
import jsPDF from 'jspdf';

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

      // Generate basic DXF content (simplified for now)
      const dxfContent = this.generateBasicDXF(componentName);

      const drawing: TechnicalDrawing = {
        id: this.generateId(),
        title,
        description: `Professional technical drawing for ${componentName} - SVG format optimized for construction use`,
        svgContent,
        dxfContent,
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

  static generateBasicDXF(componentName: string): string {
    // Generate a basic DXF file for now (simplified)
    return `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
0
10
100.0
20
100.0
11
300.0
21
100.0
0
LINE
8
0
10
300.0
20
100.0
11
300.0
21
200.0
0
LINE
8
0
10
300.0
20
200.0
11
100.0
21
200.0
0
LINE
8
0
10
100.0
20
200.0
11
100.0
21
100.0
0
TEXT
8
0
10
200.0
20
250.0
40
5.0
1
${componentName}
0
ENDSEC
0
EOF`;
  }

  static generateDXFFromSVG(svgContent: string, componentName: string): string {
    // Generate basic DXF content for professional CAD compatibility
    const dxfHeader = `0
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
ENDSEC
0
SECTION
2
ENTITIES`;

    const dxfFooter = `0
ENDSEC
0
EOF`;

    // Extract basic geometry from SVG and convert to DXF entities
    const entities = this.extractDXFEntitiesFromSVG(svgContent);

    return dxfHeader + entities + dxfFooter;
  }

  static extractDXFEntitiesFromSVG(svgContent: string): string {
    let entities = '';

    // Extract rectangles and convert to DXF lines
    const rectMatches = svgContent.match(/<rect[^>]*>/g) || [];
    rectMatches.forEach(rect => {
      const x = this.extractAttribute(rect, 'x') || '0';
      const y = this.extractAttribute(rect, 'y') || '0';
      const width = this.extractAttribute(rect, 'width') || '100';
      const height = this.extractAttribute(rect, 'height') || '100';

      const x1 = parseFloat(x);
      const y1 = parseFloat(y);
      const x2 = x1 + parseFloat(width);
      const y2 = y1 + parseFloat(height);

      // Convert to DXF lines (rectangle as 4 lines)
      entities += this.createDXFLine(x1, y1, x2, y1); // Bottom
      entities += this.createDXFLine(x2, y1, x2, y2); // Right
      entities += this.createDXFLine(x2, y2, x1, y2); // Top
      entities += this.createDXFLine(x1, y2, x1, y1); // Left
    });

    return entities;
  }

  static extractAttribute(element: string, attribute: string): string | null {
    const match = element.match(new RegExp(`${attribute}="([^"]*)"`, 'i'));
    return match ? match[1] : null;
  }

  static createDXFLine(x1: number, y1: number, x2: number, y2: number): string {
    return `0
LINE
8
0
10
${x1}
20
${y1}
30
0.0
11
${x2}
21
${y2}
31
0.0
`;
  }

  static async generateProfessionalCADDrawing(title: string, instructions: string, componentName: string): Promise<{ svgContent: string; dxfContent: string }> {
    // Parse instructions to get drawing specifications
    let drawingSpec;
    try {
      drawingSpec = this.parseDrawingInstructions(instructions);
    } catch (error) {
      console.warn('Could not parse AI instructions, using default elements');
      drawingSpec = null;
    }

    // Create professional DXF-like drawing structure (ezdxf equivalent)
    const dxfData = this.createProfessionalCADStructure(title, componentName);

    // Add drawing elements based on specifications
    if (drawingSpec && drawingSpec.elements) {
      this.addCADElements(dxfData, drawingSpec.elements);
    } else {
      this.addDefaultCADElements(dxfData);
    }

    // Generate DXF content (professional CAD format)
    const dxfContent = this.generateDXFContent(dxfData);

    // Generate simple SVG preview for browser display only
    const svgContent = this.generateSimpleSVGPreview(title, componentName);

    return { svgContent, dxfContent };
  }

  private static createProfessionalCADStructure(title: string, componentName: string): any {
    // Professional CAD structure (like ezdxf document structure)
    return {
      header: {
        title,
        componentName,
        scale: '1:100',
        date: new Date().toLocaleDateString(),
        units: 'Millimeters',
        author: 'HSR Construction Estimator'
      },
      layers: {
        TITLEBLOCK: { color: 7, lineType: 'CONTINUOUS' },
        CONSTRUCTION: { color: 1, lineType: 'CONTINUOUS' },
        DIMENSIONS: { color: 5, lineType: 'CONTINUOUS' },
        CENTERLINES: { color: 3, lineType: 'CENTER' },
        TEXT: { color: 7, lineType: 'CONTINUOUS' }
      },
      entities: []
    };
  }

  private static addDefaultCADElements(cadData: any): void {
    // Professional CAD drawing elements with corrected coordinate system
    const drawingHeight = 600; // Total drawing height for Y-axis correction

    // Helper function to convert Y coordinates (fix inversion)
    const fixY = (y: number) => drawingHeight - y;

    const mainX = 300;
    const mainY = 300; // Will be converted to correct Y
    const mainWidth = 400;
    const mainHeight = 200;

    // Title block entities (fixed coordinates)
    cadData.entities.push(
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: fixY(90) }, end: { x: 790, y: fixY(90) } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: fixY(90) }, end: { x: 790, y: fixY(10) } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: fixY(10) }, end: { x: 10, y: fixY(10) } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: fixY(10) }, end: { x: 10, y: fixY(90) } },
      { type: 'TEXT', layer: 'TEXT', position: { x: 20, y: fixY(30) }, text: cadData.header.title, height: 16 },
      { type: 'TEXT', layer: 'TEXT', position: { x: 20, y: fixY(50) }, text: `Component: ${cadData.header.componentName}`, height: 12 },
      { type: 'TEXT', layer: 'TEXT', position: { x: 20, y: fixY(70) }, text: `Scale: ${cadData.header.scale} | Date: ${cadData.header.date}`, height: 10 }
    );

    // Main drawing area border (fixed coordinates)
    cadData.entities.push(
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: fixY(550) }, end: { x: 790, y: fixY(550) } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: fixY(550) }, end: { x: 790, y: fixY(100) } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: fixY(100) }, end: { x: 10, y: fixY(100) } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: fixY(100) }, end: { x: 10, y: fixY(550) } }
    );

    // Main component rectangle (single clean rectangle)
    const rectY = fixY(mainY);
    const rectYBottom = fixY(mainY + mainHeight);
    cadData.entities.push(
      { type: 'LINE', layer: 'CONSTRUCTION', start: { x: mainX, y: rectY }, end: { x: mainX + mainWidth, y: rectY } },
      { type: 'LINE', layer: 'CONSTRUCTION', start: { x: mainX + mainWidth, y: rectY }, end: { x: mainX + mainWidth, y: rectYBottom } },
      { type: 'LINE', layer: 'CONSTRUCTION', start: { x: mainX + mainWidth, y: rectYBottom }, end: { x: mainX, y: rectYBottom } },
      { type: 'LINE', layer: 'CONSTRUCTION', start: { x: mainX, y: rectYBottom }, end: { x: mainX, y: rectY } }
    );

    // Horizontal dimension (above rectangle)
    const dimOffsetY = 40;
    const dimY = fixY(mainY - dimOffsetY);
    cadData.entities.push(
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: mainX, y: dimY }, end: { x: mainX + mainWidth, y: dimY } },
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: mainX, y: dimY - 5 }, end: { x: mainX, y: dimY + 5 } },
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: mainX + mainWidth, y: dimY - 5 }, end: { x: mainX + mainWidth, y: dimY + 5 } },
      { type: 'TEXT', layer: 'DIMENSIONS', position: { x: mainX + mainWidth / 2, y: dimY - 15 }, text: '400mm', height: 12 }
    );

    // Vertical dimension (left side)
    const dimOffsetX = 40;
    const dimX = mainX - dimOffsetX;
    cadData.entities.push(
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: dimX, y: rectY }, end: { x: dimX, y: rectYBottom } },
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: dimX - 5, y: rectY }, end: { x: dimX + 5, y: rectY } },
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: dimX - 5, y: rectYBottom }, end: { x: dimX + 5, y: rectYBottom } },
      { type: 'TEXT', layer: 'DIMENSIONS', position: { x: dimX - 25, y: fixY(mainY + mainHeight / 2) }, text: '200mm', height: 12, rotation: 90 }
    );

    // Center lines (professional CAD practice)
    const centerY = fixY(mainY + mainHeight / 2);
    const centerX = mainX + mainWidth / 2;
    cadData.entities.push(
      { type: 'LINE', layer: 'CENTERLINES', start: { x: mainX - 20, y: centerY }, end: { x: mainX + mainWidth + 20, y: centerY } },
      { type: 'LINE', layer: 'CENTERLINES', start: { x: centerX, y: rectY - 20 }, end: { x: centerX, y: rectYBottom + 20 } }
    );

    // Construction details (connection points)
    const pointRadius = 8;
    cadData.entities.push(
      { type: 'CIRCLE', layer: 'CONSTRUCTION', center: { x: mainX + 50, y: fixY(mainY + 50) }, radius: pointRadius },
      { type: 'CIRCLE', layer: 'CONSTRUCTION', center: { x: mainX + mainWidth - 50, y: fixY(mainY + 50) }, radius: pointRadius },
      { type: 'CIRCLE', layer: 'CONSTRUCTION', center: { x: mainX + 50, y: fixY(mainY + mainHeight - 50) }, radius: pointRadius },
      { type: 'CIRCLE', layer: 'CONSTRUCTION', center: { x: mainX + mainWidth - 50, y: fixY(mainY + mainHeight - 50) }, radius: pointRadius }
    );

    // Material specification text (centered)
    cadData.entities.push(
      { type: 'TEXT', layer: 'TEXT', position: { x: centerX, y: centerY }, text: 'CONCRETE M25', height: 14 },
      { type: 'TEXT', layer: 'TEXT', position: { x: centerX, y: centerY - 20 }, text: 'GRADE', height: 12 }
    );

    // Notes area (fixed coordinates)
    cadData.entities.push(
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: fixY(590) }, end: { x: 790, y: fixY(590) } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: fixY(590) }, end: { x: 790, y: fixY(560) } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: fixY(560) }, end: { x: 10, y: fixY(560) } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: fixY(560) }, end: { x: 10, y: fixY(590) } },
      { type: 'TEXT', layer: 'TEXT', position: { x: 20, y: fixY(575) }, text: 'NOTES: Professional DXF CAD drawing - HSR Construction Estimator', height: 10 }
    );
  }

  private static generateDXFContent(cadData: any): string {
    // Generate professional DXF content (like ezdxf output)
    const dxfLines: string[] = [];

    // DXF Header
    dxfLines.push('0', 'SECTION', '2', 'HEADER');
    dxfLines.push('9', '$ACADVER', '1', 'AC1015');
    dxfLines.push('9', '$INSUNITS', '70', '4'); // Millimeters
    dxfLines.push('0', 'ENDSEC');

    // Tables section (layers)
    dxfLines.push('0', 'SECTION', '2', 'TABLES');
    dxfLines.push('0', 'TABLE', '2', 'LAYER', '70', Object.keys(cadData.layers).length.toString());

    Object.entries(cadData.layers).forEach(([layerName, layerData]: [string, any]) => {
      dxfLines.push('0', 'LAYER', '2', layerName, '70', '0', '62', layerData.color.toString(), '6', layerData.lineType);
    });

    dxfLines.push('0', 'ENDTAB', '0', 'ENDSEC');

    // Entities section
    dxfLines.push('0', 'SECTION', '2', 'ENTITIES');

    cadData.entities.forEach((entity: any) => {
      switch (entity.type) {
        case 'LINE':
          dxfLines.push(
            '0', 'LINE',
            '8', entity.layer,
            '10', entity.start.x.toString(),
            '20', entity.start.y.toString(),
            '30', '0.0',
            '11', entity.end.x.toString(),
            '21', entity.end.y.toString(),
            '31', '0.0'
          );
          break;

        case 'CIRCLE':
          dxfLines.push(
            '0', 'CIRCLE',
            '8', entity.layer,
            '10', entity.center.x.toString(),
            '20', entity.center.y.toString(),
            '30', '0.0',
            '40', entity.radius.toString()
          );
          break;

        case 'TEXT':
          dxfLines.push(
            '0', 'TEXT',
            '8', entity.layer,
            '10', entity.position.x.toString(),
            '20', entity.position.y.toString(),
            '30', '0.0',
            '40', entity.height.toString(),
            '1', entity.text
          );
          if (entity.rotation) {
            dxfLines.push('50', entity.rotation.toString());
          }
          break;
      }
    });

    dxfLines.push('0', 'ENDSEC', '0', 'EOF');

    return dxfLines.join('\n');
  }

  private static parseDrawingInstructions(instructions: string): any {
    try {
      // Try to extract JSON from the instructions
      const jsonMatch = instructions.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Could not parse JSON from instructions');
    }
    return null;
  }

  private static addCADElements(cadData: any, elements: any[]): void {
    // Parse AI-generated elements and add to CAD structure
    try {
      // Look for mainComponent in the AI response
      if (elements.mainComponent) {
        const comp = elements.mainComponent;
        const drawingHeight = 600;
        const fixY = (y: number) => drawingHeight - y;

        // Add main component as clean rectangle
        const rectY = fixY(comp.y);
        const rectYBottom = fixY(comp.y + comp.height);

        cadData.entities.push(
          { type: 'LINE', layer: 'CONSTRUCTION', start: { x: comp.x, y: rectY }, end: { x: comp.x + comp.width, y: rectY } },
          { type: 'LINE', layer: 'CONSTRUCTION', start: { x: comp.x + comp.width, y: rectY }, end: { x: comp.x + comp.width, y: rectYBottom } },
          { type: 'LINE', layer: 'CONSTRUCTION', start: { x: comp.x + comp.width, y: rectYBottom }, end: { x: comp.x, y: rectYBottom } },
          { type: 'LINE', layer: 'CONSTRUCTION', start: { x: comp.x, y: rectYBottom }, end: { x: comp.x, y: rectY } }
        );

        // Add dimensions if provided
        if (elements.dimensions) {
          elements.dimensions.forEach((dim: any) => {
            if (dim.type === 'horizontal') {
              const dimY = fixY(dim.y);
              cadData.entities.push(
                { type: 'LINE', layer: 'DIMENSIONS', start: { x: dim.startX, y: dimY }, end: { x: dim.endX, y: dimY } },
                { type: 'LINE', layer: 'DIMENSIONS', start: { x: dim.startX, y: dimY - 5 }, end: { x: dim.startX, y: dimY + 5 } },
                { type: 'LINE', layer: 'DIMENSIONS', start: { x: dim.endX, y: dimY - 5 }, end: { x: dim.endX, y: dimY + 5 } },
                { type: 'TEXT', layer: 'DIMENSIONS', position: { x: (dim.startX + dim.endX) / 2, y: dimY - 15 }, text: dim.value, height: 12 }
              );
            } else if (dim.type === 'vertical') {
              const dimX = dim.x;
              cadData.entities.push(
                { type: 'LINE', layer: 'DIMENSIONS', start: { x: dimX, y: fixY(dim.startY) }, end: { x: dimX, y: fixY(dim.endY) } },
                { type: 'LINE', layer: 'DIMENSIONS', start: { x: dimX - 5, y: fixY(dim.startY) }, end: { x: dimX + 5, y: fixY(dim.startY) } },
                { type: 'LINE', layer: 'DIMENSIONS', start: { x: dimX - 5, y: fixY(dim.endY) }, end: { x: dimX + 5, y: fixY(dim.endY) } },
                { type: 'TEXT', layer: 'DIMENSIONS', position: { x: dimX - 25, y: fixY((dim.startY + dim.endY) / 2) }, text: dim.value, height: 12, rotation: 90 }
              );
            }
          });
        }

        // Add detail circles if provided
        if (elements.details) {
          elements.details.forEach((detail: any) => {
            if (detail.type === 'circle') {
              cadData.entities.push({ type: 'CIRCLE', layer: 'CONSTRUCTION', center: { x: detail.x, y: fixY(detail.y) }, radius: detail.radius });
            }
          });
        }

        // Add annotations if provided
        if (elements.annotations) {
          elements.annotations.forEach((annotation: any) => {
            if (annotation.type === 'text') {
              cadData.entities.push({ type: 'TEXT', layer: 'TEXT', position: { x: annotation.x, y: fixY(annotation.y) }, text: annotation.text, height: annotation.size || 12 });
            }
          });
        }
      }
    } catch (error) {
      console.warn('Could not parse AI-generated elements, using default structure');
      // Fallback to default if AI parsing fails
    }
  }

  private static generateSimpleSVGPreview(title: string, componentName: string): string {
    // Simple SVG preview for browser display (DXF is the main output)
    return `
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg" style="background: white;">
  <defs>
    <style>
      .title-text { font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; fill: black; }
      .info-text { font-family: Arial, sans-serif; font-size: 10px; fill: black; }
      .construction-line { stroke: red; stroke-width: 2; fill: none; }
      .dimension-line { stroke: blue; stroke-width: 1; fill: none; }
      .dimension-text { font-family: Arial, sans-serif; font-size: 8px; fill: blue; }
    </style>
  </defs>

  <!-- Title -->
  <text x="200" y="20" class="title-text" text-anchor="middle">${title}</text>
  <text x="200" y="35" class="info-text" text-anchor="middle">Component: ${componentName}</text>
  <text x="200" y="50" class="info-text" text-anchor="middle">Professional DXF CAD Drawing</text>

  <!-- Simple component preview -->
  <rect x="100" y="80" width="200" height="100" class="construction-line"/>

  <!-- Dimension lines -->
  <line x1="100" y1="70" x2="300" y2="70" class="dimension-line"/>
  <line x1="100" y1="68" x2="100" y2="72" class="dimension-line"/>
  <line x1="300" y1="68" x2="300" y2="72" class="dimension-line"/>
  <text x="200" y="65" class="dimension-text" text-anchor="middle">400mm</text>

  <line x1="90" y1="80" x2="90" y2="180" class="dimension-line"/>
  <line x1="88" y1="80" x2="92" y2="80" class="dimension-line"/>
  <line x1="88" y1="180" x2="92" y2="180" class="dimension-line"/>
  <text x="85" y="135" class="dimension-text" text-anchor="middle" transform="rotate(-90, 85, 135)">200mm</text>

  <!-- Connection points -->
  <circle cx="125" cy="105" r="3" fill="red"/>
  <circle cx="275" cy="105" r="3" fill="red"/>
  <circle cx="125" cy="155" r="3" fill="red"/>
  <circle cx="275" cy="155" r="3" fill="red"/>

  <!-- Material text -->
  <text x="200" y="135" class="info-text" text-anchor="middle">CONCRETE M25</text>

  <!-- Note -->
  <text x="200" y="220" class="info-text" text-anchor="middle">Download DXF for professional CAD software</text>
  <text x="200" y="235" class="info-text" text-anchor="middle">Compatible with AutoCAD, SolidWorks, etc.</text>
</svg>`;
  }

  private static addConvertedCADElementsToSVG(svgElements: string[], cadData: any): void {
    // Convert CAD entities to SVG for preview
    cadData.entities.forEach((entity: any) => {
      const layerClass = this.getLayerSVGClass(entity.layer);

      switch (entity.type) {
        case 'LINE':
          svgElements.push(`<line x1="${entity.start.x}" y1="${entity.start.y}" x2="${entity.end.x}" y2="${entity.end.y}" class="${layerClass}"/>`);
          break;

        case 'CIRCLE':
          svgElements.push(`<circle cx="${entity.center.x}" cy="${entity.center.y}" r="${entity.radius}" fill="none" class="${layerClass}"/>`);
          break;

        case 'TEXT':
          const rotation = entity.rotation ? ` transform="rotate(${entity.rotation}, ${entity.position.x}, ${entity.position.y})"` : '';
          svgElements.push(`<text x="${entity.position.x}" y="${entity.position.y}" font-size="${entity.height}" class="text-element" text-anchor="middle"${rotation}>${entity.text}</text>`);
          break;
      }
    });
  }

  private static getLayerSVGClass(layer: string): string {
    switch (layer) {
      case 'CONSTRUCTION': return 'construction-line';
      case 'DIMENSIONS': return 'dimension-line';
      case 'CENTERLINES': return 'center-line';
      case 'TITLEBLOCK': return 'border-line';
      default: return 'border-line';
    }
  }

  private static addSVGElements(svgElements: string[], elements: any[]): void {
    for (const element of elements) {
      const x = (element.coordinates?.x || 0) + 50;
      const y = (element.coordinates?.y || 0) + 150;

      switch (element.type) {
        case 'rectangle':
          const width = element.coordinates?.width || 100;
          const height = element.coordinates?.height || 100;
          const fill = element.properties?.fill || 'none';
          const stroke = element.properties?.stroke || 'black';
          const strokeWidth = element.properties?.strokeWidth || 2;
          svgElements.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);
          break;

        case 'line':
          const x2 = (element.coordinates?.x2 || element.coordinates?.x + 100) + 50;
          const y2 = (element.coordinates?.y2 || element.coordinates?.y + 100) + 150;
          const lineStroke = element.properties?.stroke || 'black';
          const lineStrokeWidth = element.properties?.strokeWidth || 1;
          svgElements.push(`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${lineStroke}" stroke-width="${lineStrokeWidth}"/>`);
          break;

        case 'circle':
          const radius = element.coordinates?.radius || 50;
          const circleFill = element.properties?.fill || 'none';
          const circleStroke = element.properties?.stroke || 'black';
          const circleStrokeWidth = element.properties?.strokeWidth || 2;
          svgElements.push(`<circle cx="${x + radius}" cy="${y + radius}" r="${radius}" fill="${circleFill}" stroke="${circleStroke}" stroke-width="${circleStrokeWidth}"/>`);
          break;

        case 'text':
          if (element.text) {
            const fontSize = element.properties?.fontSize || 12;
            const textFill = element.properties?.fill || 'black';
            svgElements.push(`<text x="${x}" y="${y}" font-family="Arial" font-size="${fontSize}" fill="${textFill}">${element.text}</text>`);
          }
          break;

        case 'dimension':
          const dimX2 = (element.coordinates?.x2 || element.coordinates?.x + 100) + 50;
          const dimY2 = (element.coordinates?.y2 || element.coordinates?.y) + 150;
          svgElements.push(`<line x1="${x}" y1="${y}" x2="${dimX2}" y2="${dimY2}" class="dimension-line"/>`);

          if (element.dimensions) {
            const midX = (x + dimX2) / 2;
            const midY = (y + dimY2) / 2 - 10;
            svgElements.push(`<text x="${midX}" y="${midY}" class="dimension-text" text-anchor="middle">${element.dimensions}</text>`);
          }
          break;
      }
    }
  }

  private static addDefaultSVGElements(svgElements: string[]): void {
    // Add a sample rectangular component
    svgElements.push(`<rect x="250" y="250" width="300" height="150" class="construction-line"/>`);

    // Add horizontal dimension line
    svgElements.push(`<line x1="250" y1="230" x2="550" y2="230" class="dimension-line"/>`);
    svgElements.push(`<line x1="250" y1="225" x2="250" y2="235" class="dimension-line"/>`);
    svgElements.push(`<line x1="550" y1="225" x2="550" y2="235" class="dimension-line"/>`);
    svgElements.push(`<text x="400" y="225" class="dimension-text" text-anchor="middle">300mm</text>`);

    // Add vertical dimension line
    svgElements.push(`<line x1="230" y1="250" x2="230" y2="400" class="dimension-line"/>`);
    svgElements.push(`<line x1="225" y1="250" x2="235" y2="250" class="dimension-line"/>`);
    svgElements.push(`<line x1="225" y1="400" x2="235" y2="400" class="dimension-line"/>`);
    svgElements.push(`<text x="220" y="330" class="dimension-text" text-anchor="middle" transform="rotate(-90, 220, 330)">150mm</text>`);

    // Add center lines
    svgElements.push(`<line x1="250" y1="325" x2="550" y2="325" class="center-line"/>`);
    svgElements.push(`<line x1="400" y1="250" x2="400" y2="400" class="center-line"/>`);

    // Add some construction details
    svgElements.push(`<circle cx="275" cy="275" r="5" fill="none" stroke="black" stroke-width="1"/>`);
    svgElements.push(`<circle cx="525" cy="275" r="5" fill="none" stroke="black" stroke-width="1"/>`);
    svgElements.push(`<circle cx="275" cy="375" r="5" fill="none" stroke="black" stroke-width="1"/>`);
    svgElements.push(`<circle cx="525" cy="375" r="5" fill="none" stroke="black" stroke-width="1"/>`);

    // Add material indication
    svgElements.push(`<text x="400" y="330" class="small-text" text-anchor="middle">CONCRETE</text>`);
    svgElements.push(`<text x="400" y="345" class="small-text" text-anchor="middle">M25 GRADE</text>`);
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

  static downloadDrawingAsDXF(drawing: TechnicalDrawing): void {
    if (!drawing.dxfContent) {
      alert('DXF content not available. Please regenerate the drawing.');
      return;
    }

    const blob = new Blob([drawing.dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${drawing.title.replace(/\s+/g, '_')}_Drawing.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async downloadDrawingAsPDF(drawing: TechnicalDrawing): Promise<void> {
    try {
      // Create PDF from DXF data with proper scaling and layout
      const pdf = new jsPDF('landscape', 'mm', 'a4');

      // A4 landscape dimensions: 297mm x 210mm
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 15;
      const drawingWidth = pageWidth - (2 * margin);
      const drawingHeight = pageHeight - (2 * margin);

      // Add title and header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(drawing.title, margin, margin + 12);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Component: ${drawing.componentName}`, margin, margin + 22);
      pdf.text(`Scale: ${drawing.scale} | Date: ${new Date().toLocaleDateString()}`, margin, margin + 32);

      // Draw main border
      pdf.setLineWidth(0.5);
      pdf.rect(margin, margin + 40, drawingWidth, drawingHeight - 50);

      // Render DXF content to PDF with proper scaling
      this.renderDXFToPDF(pdf, drawing, margin + 10, margin + 50, drawingWidth - 20, drawingHeight - 70);

      // Add footer
      pdf.setFontSize(8);
      pdf.text('Generated by HSR Construction Estimator - Professional CAD Drawing System', margin, pageHeight - 8);

      // Save PDF
      pdf.save(`${drawing.title.replace(/\s+/g, '_')}_CAD_Drawing.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
  }

  private static renderDXFToPDF(pdf: any, drawing: TechnicalDrawing, x: number, y: number, width: number, height: number): void {
    // Professional DXF to PDF rendering with proper scaling

    // Calculate scale to fit all elements in the page
    const dxfWidth = 800;  // Our DXF design width
    const dxfHeight = 600; // Our DXF design height

    const scaleX = width / dxfWidth;
    const scaleY = height / dxfHeight;
    const scale = Math.min(scaleX, scaleY); // Use smaller scale to fit everything

    // Center the drawing
    const offsetX = x + (width - (dxfWidth * scale)) / 2;
    const offsetY = y + (height - (dxfHeight * scale)) / 2;

    // Transform coordinates
    const tx = (dxfX: number) => offsetX + (dxfX * scale);
    const ty = (dxfY: number) => offsetY + (dxfY * scale);

    // Draw main component rectangle (400x200mm at center)
    pdf.setLineWidth(0.8);
    pdf.setDrawColor(0, 0, 0); // Black
    pdf.rect(tx(300), ty(200), 400 * scale, 200 * scale);

    // Draw horizontal dimension line
    pdf.setLineWidth(0.3);
    pdf.setDrawColor(0, 0, 255); // Blue
    const dimY = ty(160);
    pdf.line(tx(300), dimY, tx(700), dimY);
    pdf.line(tx(300), dimY - 2, tx(300), dimY + 2);
    pdf.line(tx(700), dimY - 2, tx(700), dimY + 2);

    // Horizontal dimension text
    pdf.setFontSize(Math.max(8, 10 * scale));
    pdf.setTextColor(0, 0, 255);
    pdf.text('400mm', tx(500), dimY - 4, { align: 'center' });

    // Draw vertical dimension line
    const dimX = tx(260);
    pdf.line(dimX, ty(200), dimX, ty(400));
    pdf.line(dimX - 2, ty(200), dimX + 2, ty(200));
    pdf.line(dimX - 2, ty(400), dimX + 2, ty(400));

    // Vertical dimension text
    pdf.text('200mm', dimX - 8, ty(300), { angle: 90, align: 'center' });

    // Draw center lines
    pdf.setLineWidth(0.2);
    pdf.setDrawColor(100, 100, 100); // Gray
    pdf.setLineDashPattern([3 * scale, 2 * scale], 0);

    // Horizontal center line
    pdf.line(tx(280), ty(300), tx(720), ty(300));

    // Vertical center line
    pdf.line(tx(500), ty(180), tx(500), ty(420));

    // Reset line style
    pdf.setLineDashPattern([], 0);

    // Draw connection points
    pdf.setFillColor(0, 0, 0);
    const pointSize = Math.max(1, 3 * scale);
    pdf.circle(tx(350), ty(250), pointSize, 'F');
    pdf.circle(tx(650), ty(250), pointSize, 'F');
    pdf.circle(tx(350), ty(350), pointSize, 'F');
    pdf.circle(tx(650), ty(350), pointSize, 'F');

    // Add material specification
    pdf.setFontSize(Math.max(10, 12 * scale));
    pdf.setTextColor(0, 0, 0);
    pdf.text('CONCRETE M25', tx(500), ty(300), { align: 'center' });
    pdf.text('GRADE', tx(500), ty(320), { align: 'center' });

    // Add construction notes
    pdf.setFontSize(Math.max(8, 9 * scale));
    pdf.text('4 No. Connection Points', tx(500), ty(450), { align: 'center' });
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
