import { TechnicalDrawing } from '../types';
import { GoogleGenAI } from "@google/genai";

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
    
    const basePrompt = `You are a professional technical draftsman and engineer. Your task is to create detailed instructions for generating a technical drawing.

${guidelines}

**DRAWING TITLE:** ${title}
**COMPONENT:** ${componentName}
**DESCRIPTION:** ${description}

**USER REQUIREMENTS:**
${userInput}

${designContext ? `**DESIGN CONTEXT:**\n${designContext}\n` : ''}

**INSTRUCTIONS:**
1. Create detailed instructions for a technical drawing that includes:
   - Plan view, elevation view, and section views as needed
   - All critical dimensions and measurements
   - Material specifications and symbols
   - Construction details and assembly instructions
   - Scale information
   - Title block with project information

2. Provide specific SVG drawing instructions that can be programmatically generated, including:
   - Coordinate points for all lines and shapes
   - Dimension lines with measurements
   - Text labels and annotations
   - Proper scaling and layout

3. Include drawing standards compliance (IS 696, IS 962 for technical drawings)

4. Specify line weights, text sizes, and drawing conventions

**OUTPUT FORMAT:**
Provide detailed drawing specifications in a structured format that includes:
- Drawing layout and scale
- All geometric elements with coordinates
- Dimension specifications
- Text and annotation requirements
- Material symbols and legends`;

    const fullPrompt = this.createPromptWithReference(basePrompt, referenceText);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: fullPrompt,
      });

      const drawingInstructions = response.text;
      
      // Generate basic SVG from instructions
      const svgContent = this.generateBasicSVG(title, drawingInstructions, componentName);

      const drawing: TechnicalDrawing = {
        id: this.generateId(),
        title,
        description: drawingInstructions,
        svgContent,
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

  static generateBasicSVG(title: string, instructions: string, componentName: string): string {
    // Generate a basic SVG template with title and placeholder content
    const svgTemplate = `
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- Title Block -->
  <rect x="10" y="10" width="780" height="80" fill="none" stroke="black" stroke-width="2"/>
  <text x="20" y="35" font-family="Arial" font-size="16" font-weight="bold">${title}</text>
  <text x="20" y="55" font-family="Arial" font-size="12">Component: ${componentName}</text>
  <text x="20" y="75" font-family="Arial" font-size="10">Scale: 1:100 | Date: ${new Date().toLocaleDateString()}</text>
  
  <!-- Main Drawing Area -->
  <rect x="10" y="100" width="780" height="450" fill="none" stroke="black" stroke-width="1"/>
  
  <!-- Sample Drawing Elements -->
  <rect x="200" y="200" width="400" height="200" fill="none" stroke="black" stroke-width="2"/>
  <line x1="200" y1="200" x2="600" y2="400" stroke="black" stroke-width="1" stroke-dasharray="5,5"/>
  <line x1="600" y1="200" x2="200" y2="400" stroke="black" stroke-width="1" stroke-dasharray="5,5"/>
  
  <!-- Dimension Lines -->
  <line x1="200" y1="180" x2="600" y2="180" stroke="black" stroke-width="1"/>
  <line x1="200" y1="175" x2="200" y2="185" stroke="black" stroke-width="1"/>
  <line x1="600" y1="175" x2="600" y2="185" stroke="black" stroke-width="1"/>
  <text x="390" y="175" font-family="Arial" font-size="10" text-anchor="middle">400mm</text>
  
  <!-- Notes Area -->
  <rect x="10" y="560" width="780" height="30" fill="none" stroke="black" stroke-width="1"/>
  <text x="20" y="575" font-family="Arial" font-size="8">NOTES: This is a basic template. Use the drawing editor to modify and add details.</text>
</svg>`;

    return svgTemplate.trim();
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
