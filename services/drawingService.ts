import { TechnicalDrawing } from '../types';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';

const getAiClient = () => {
  const apiKey = localStorage.getItem('gemini-api-key');
  if (!apiKey) {
    throw new Error("API key is not configured. Please set it in the application.");
  }
  return new GoogleGenAI({ apiKey });
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
    const ai = getAiClient();

    const basePrompt = `You are a professional technical draftsman and engineer. Your task is to create detailed specifications for a professional CAD drawing.

${guidelines}

**DRAWING TITLE:** ${title}
**COMPONENT:** ${componentName}
**DESCRIPTION:** ${description}

**USER REQUIREMENTS:**
${userInput}

${designContext ? `**DESIGN CONTEXT:**\n${designContext}\n` : ''}

**INSTRUCTIONS:**
1. Create detailed specifications for a professional technical drawing including:
   - Main component outline with exact dimensions
   - Critical measurement points and dimension lines
   - Material specifications and symbols
   - Construction details and assembly notes
   - Scale information (1:50, 1:100, etc.)
   - Title block information

2. Provide specific drawing elements in this JSON format:
   {
     "elements": [
       {
         "type": "rectangle|line|circle|text|dimension",
         "coordinates": {"x": number, "y": number, "width": number, "height": number},
         "properties": {"stroke": "color", "strokeWidth": number, "fill": "color"},
         "text": "text content if applicable",
         "dimensions": "measurement if applicable"
       }
     ],
     "scale": "1:100",
     "dimensions": {"width": 800, "height": 600},
     "title": "${title}",
     "notes": ["construction notes"]
   }

3. Include drawing standards compliance (IS 696, IS 962)
4. Use standard line weights and text sizes
5. Include proper dimensioning and annotations

**OUTPUT FORMAT:**
Provide a detailed JSON specification that can be used to generate a professional CAD drawing programmatically.`;

    const fullPrompt = this.createPromptWithReference(basePrompt, referenceText);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: fullPrompt,
      });

      const drawingInstructions = response.text;

      // Generate professional CAD drawing using DXF (like ezdxf)
      const { svgContent, dxfContent } = await this.generateProfessionalCADDrawing(title, drawingInstructions, componentName);

      const drawing: TechnicalDrawing = {
        id: this.generateId(),
        title,
        description: drawingInstructions,
        svgContent,
        dxfContent,
        dimensions: { width: 800, height: 600 },
        scale: '1:100',
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

    // Also generate SVG for preview (converted from CAD data)
    const svgContent = this.convertCADToSVG(dxfData, title, componentName);

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
    // Professional CAD drawing elements (like ezdxf entities)
    const mainX = 250;
    const mainY = 250;
    const mainWidth = 300;
    const mainHeight = 150;

    // Title block entities
    cadData.entities.push(
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: 10 }, end: { x: 790, y: 10 } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: 10 }, end: { x: 790, y: 90 } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: 90 }, end: { x: 10, y: 90 } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: 90 }, end: { x: 10, y: 10 } },
      { type: 'TEXT', layer: 'TEXT', position: { x: 20, y: 70 }, text: cadData.header.title, height: 16 },
      { type: 'TEXT', layer: 'TEXT', position: { x: 20, y: 50 }, text: `Component: ${cadData.header.componentName}`, height: 12 },
      { type: 'TEXT', layer: 'TEXT', position: { x: 20, y: 30 }, text: `Scale: ${cadData.header.scale} | Date: ${cadData.header.date}`, height: 10 }
    );

    // Main drawing area border
    cadData.entities.push(
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: 100 }, end: { x: 790, y: 100 } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: 100 }, end: { x: 790, y: 550 } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: 550 }, end: { x: 10, y: 550 } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: 550 }, end: { x: 10, y: 100 } }
    );

    // Main component rectangle (professional CAD practice)
    cadData.entities.push(
      { type: 'LINE', layer: 'CONSTRUCTION', start: { x: mainX, y: mainY }, end: { x: mainX + mainWidth, y: mainY } },
      { type: 'LINE', layer: 'CONSTRUCTION', start: { x: mainX + mainWidth, y: mainY }, end: { x: mainX + mainWidth, y: mainY + mainHeight } },
      { type: 'LINE', layer: 'CONSTRUCTION', start: { x: mainX + mainWidth, y: mainY + mainHeight }, end: { x: mainX, y: mainY + mainHeight } },
      { type: 'LINE', layer: 'CONSTRUCTION', start: { x: mainX, y: mainY + mainHeight }, end: { x: mainX, y: mainY } }
    );

    // Dimension lines (professional dimensioning)
    const dimOffset = 30;
    cadData.entities.push(
      // Horizontal dimension
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: mainX, y: mainY - dimOffset }, end: { x: mainX + mainWidth, y: mainY - dimOffset } },
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: mainX, y: mainY - dimOffset - 5 }, end: { x: mainX, y: mainY - dimOffset + 5 } },
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: mainX + mainWidth, y: mainY - dimOffset - 5 }, end: { x: mainX + mainWidth, y: mainY - dimOffset + 5 } },
      { type: 'TEXT', layer: 'DIMENSIONS', position: { x: mainX + mainWidth / 2, y: mainY - dimOffset - 15 }, text: '300mm', height: 10 },

      // Vertical dimension
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: mainX - dimOffset, y: mainY }, end: { x: mainX - dimOffset, y: mainY + mainHeight } },
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: mainX - dimOffset - 5, y: mainY }, end: { x: mainX - dimOffset + 5, y: mainY } },
      { type: 'LINE', layer: 'DIMENSIONS', start: { x: mainX - dimOffset - 5, y: mainY + mainHeight }, end: { x: mainX - dimOffset + 5, y: mainY + mainHeight } },
      { type: 'TEXT', layer: 'DIMENSIONS', position: { x: mainX - dimOffset - 25, y: mainY + mainHeight / 2 }, text: '150mm', height: 10, rotation: 90 }
    );

    // Center lines (professional CAD practice)
    cadData.entities.push(
      { type: 'LINE', layer: 'CENTERLINES', start: { x: mainX, y: mainY + mainHeight / 2 }, end: { x: mainX + mainWidth, y: mainY + mainHeight / 2 } },
      { type: 'LINE', layer: 'CENTERLINES', start: { x: mainX + mainWidth / 2, y: mainY }, end: { x: mainX + mainWidth / 2, y: mainY + mainHeight } }
    );

    // Construction points (holes/fasteners)
    const pointRadius = 5;
    cadData.entities.push(
      { type: 'CIRCLE', layer: 'CONSTRUCTION', center: { x: mainX + 25, y: mainY + 25 }, radius: pointRadius },
      { type: 'CIRCLE', layer: 'CONSTRUCTION', center: { x: mainX + mainWidth - 25, y: mainY + 25 }, radius: pointRadius },
      { type: 'CIRCLE', layer: 'CONSTRUCTION', center: { x: mainX + 25, y: mainY + mainHeight - 25 }, radius: pointRadius },
      { type: 'CIRCLE', layer: 'CONSTRUCTION', center: { x: mainX + mainWidth - 25, y: mainY + mainHeight - 25 }, radius: pointRadius }
    );

    // Material specification text
    cadData.entities.push(
      { type: 'TEXT', layer: 'TEXT', position: { x: mainX + mainWidth / 2, y: mainY + mainHeight / 2 }, text: 'CONCRETE', height: 12 },
      { type: 'TEXT', layer: 'TEXT', position: { x: mainX + mainWidth / 2, y: mainY + mainHeight / 2 - 15 }, text: 'M25 GRADE', height: 10 }
    );

    // Notes area
    cadData.entities.push(
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: 560 }, end: { x: 790, y: 560 } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: 560 }, end: { x: 790, y: 590 } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 790, y: 590 }, end: { x: 10, y: 590 } },
      { type: 'LINE', layer: 'TITLEBLOCK', start: { x: 10, y: 590 }, end: { x: 10, y: 560 } },
      { type: 'TEXT', layer: 'TEXT', position: { x: 20, y: 575 }, text: 'NOTES: Professional DXF CAD drawing generated by HSR Construction Estimator (ezdxf equivalent)', height: 8 }
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
    for (const element of elements) {
      const x = (element.coordinates?.x || 0) + 50;
      const y = (element.coordinates?.y || 0) + 150;

      switch (element.type) {
        case 'rectangle':
          const width = element.coordinates?.width || 100;
          const height = element.coordinates?.height || 100;

          // Add rectangle as lines (professional CAD practice)
          cadData.entities.push(
            { type: 'LINE', layer: 'CONSTRUCTION', start: { x, y }, end: { x: x + width, y } },
            { type: 'LINE', layer: 'CONSTRUCTION', start: { x: x + width, y }, end: { x: x + width, y: y + height } },
            { type: 'LINE', layer: 'CONSTRUCTION', start: { x: x + width, y: y + height }, end: { x, y: y + height } },
            { type: 'LINE', layer: 'CONSTRUCTION', start: { x, y: y + height }, end: { x, y } }
          );
          break;

        case 'line':
          const x2 = (element.coordinates?.x2 || element.coordinates?.x + 100) + 50;
          const y2 = (element.coordinates?.y2 || element.coordinates?.y + 100) + 150;
          cadData.entities.push({ type: 'LINE', layer: 'CONSTRUCTION', start: { x, y }, end: { x: x2, y: y2 } });
          break;

        case 'circle':
          const radius = element.coordinates?.radius || 50;
          cadData.entities.push({ type: 'CIRCLE', layer: 'CONSTRUCTION', center: { x: x + radius, y: y + radius }, radius });
          break;

        case 'text':
          if (element.text) {
            const fontSize = element.properties?.fontSize || 12;
            cadData.entities.push({ type: 'TEXT', layer: 'TEXT', position: { x, y }, text: element.text, height: fontSize });
          }
          break;

        case 'dimension':
          const dimX2 = (element.coordinates?.x2 || element.coordinates?.x + 100) + 50;
          const dimY2 = (element.coordinates?.y2 || element.coordinates?.y) + 150;
          cadData.entities.push({ type: 'LINE', layer: 'DIMENSIONS', start: { x, y }, end: { x: dimX2, y: dimY2 } });

          if (element.dimensions) {
            const midX = (x + dimX2) / 2;
            const midY = (y + dimY2) / 2 - 10;
            cadData.entities.push({ type: 'TEXT', layer: 'DIMENSIONS', position: { x: midX, y: midY }, text: element.dimensions, height: 10 });
          }
          break;
      }
    }
  }

  private static convertCADToSVG(cadData: any, title: string, componentName: string): string {
    // Convert DXF drawing to SVG for preview
    const svgElements: string[] = [];

    // SVG header
    svgElements.push(`<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg" style="background: white;">`);

    // Add professional styling
    svgElements.push(`
      <defs>
        <style>
          .title-text { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; fill: black; }
          .info-text { font-family: Arial, sans-serif; font-size: 12px; fill: black; }
          .small-text { font-family: Arial, sans-serif; font-size: 10px; fill: black; }
          .dimension-text { font-family: Arial, sans-serif; font-size: 10px; fill: blue; }
          .construction-line { stroke: red; stroke-width: 2; fill: none; }
          .dimension-line { stroke: blue; stroke-width: 1; fill: none; }
          .center-line { stroke: green; stroke-width: 1; stroke-dasharray: 10,5; fill: none; }
          .border-line { stroke: black; stroke-width: 1; fill: none; }
          .text-element { font-family: Arial, sans-serif; font-size: 12px; fill: black; }
        </style>
      </defs>
    `);

    // Title block (converted from DXF)
    svgElements.push(`<rect x="10" y="10" width="780" height="80" class="border-line" stroke-width="2"/>`);
    svgElements.push(`<text x="20" y="35" class="title-text">${title}</text>`);
    svgElements.push(`<text x="20" y="55" class="info-text">Component: ${componentName}</text>`);
    svgElements.push(`<text x="20" y="75" class="small-text">Scale: 1:100 | Date: ${new Date().toLocaleDateString()} | DXF CAD Drawing</text>`);

    // Main drawing area
    svgElements.push(`<rect x="10" y="100" width="780" height="450" class="border-line"/>`);

    // Add converted CAD elements as SVG (for preview)
    this.addConvertedCADElementsToSVG(svgElements, cadData);

    // Notes area
    svgElements.push(`<rect x="10" y="560" width="780" height="30" class="border-line"/>`);
    svgElements.push(`<text x="20" y="575" class="small-text">NOTES: Professional DXF CAD drawing generated by HSR Construction Estimator (ezdxf equivalent)</text>`);

    // Close SVG
    svgElements.push(`</svg>`);

    return svgElements.join('\n');
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
      // Create a temporary canvas to render the SVG
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = drawing.dimensions.width;
      tempCanvas.height = drawing.dimensions.height;
      const ctx = tempCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Create an image from SVG
      const svgBlob = new Blob([drawing.svgContent], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();

      return new Promise((resolve, reject) => {
        img.onload = () => {
          // Draw the image on canvas
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          ctx.drawImage(img, 0, 0);

          // Create PDF
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
          });

          // Add title
          pdf.setFontSize(16);
          pdf.text(drawing.title, 20, 20);

          // Add drawing info
          pdf.setFontSize(10);
          pdf.text(`Component: ${drawing.componentName}`, 20, 30);
          pdf.text(`Scale: ${drawing.scale}`, 20, 35);
          pdf.text(`Date: ${drawing.createdAt.toLocaleDateString()}`, 20, 40);

          // Add the canvas as image to PDF
          const imgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 20, 50, 250, 150);

          // Add description if available
          if (drawing.description) {
            pdf.setFontSize(8);
            const splitDescription = pdf.splitTextToSize(drawing.description.substring(0, 500), 250);
            pdf.text(splitDescription, 20, 210);
          }

          // Save the PDF
          pdf.save(`${drawing.title.replace(/\s+/g, '_')}_Drawing.pdf`);

          // Cleanup
          URL.revokeObjectURL(svgUrl);
          resolve();
        };

        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error('Failed to load SVG image'));
        };

        img.src = svgUrl;
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF. Please try again.');
    }
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
