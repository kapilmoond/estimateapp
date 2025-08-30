import { DrawingSpecification } from '../components/DrawingSpecificationInterface';
import { LLMService } from './llmService';

export class DrawingSpecificationParser {
  /**
   * Parse natural language description into structured drawing specification
   */
  static async parseDescription(description: string): Promise<DrawingSpecification> {
    const prompt = this.createParsingPrompt(description);
    
    try {
      const response = await LLMService.generateContent(prompt);
      const specification = this.extractSpecificationFromResponse(response);
      return specification;
    } catch (error) {
      console.error('Error parsing drawing description:', error);
      // Return default specification on error
      return this.getDefaultSpecification();
    }
  }

  private static createParsingPrompt(description: string): string {
    return `You are a professional CAD engineer and technical drawing expert. Analyze the following drawing description and provide a complete, detailed drawing specification.

**CRITICAL: You must respond with ONLY a JSON object. NO Python code, NO explanations, NO markdown. Just the JSON specification.**

**DRAWING DESCRIPTION:**
${description}

**YOUR TASK:**
1. Determine ALL geometric elements needed (lines, circles, arcs, rectangles, etc.)
2. Calculate exact coordinates and dimensions based on engineering standards
3. Specify ALL dimension lines needed to fully document the drawing
4. Determine hatching patterns for materials (if any)
5. Position everything professionally with proper spacing

**REQUIRED OUTPUT FORMAT:**
Respond with ONLY a valid JSON object in this exact format:

{
  "title": "Descriptive Drawing Title",
  "scale": 1,
  "units": "mm",
  "drawingSize": {"width": 3000, "height": 2000},
  "elements": [
    {
      "type": "line",
      "coordinates": [[x1, y1], [x2, y2]],
      "properties": {"layer": "CONSTRUCTION", "lineType": "CONTINUOUS"}
    },
    {
      "type": "circle",
      "coordinates": [[centerX, centerY], [radius]],
      "properties": {"layer": "CONSTRUCTION"}
    },
    {
      "type": "rectangle",
      "coordinates": [[x1, y1], [x2, y2]],
      "properties": {"layer": "CONSTRUCTION"}
    },
    {
      "type": "polyline",
      "coordinates": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
      "properties": {"layer": "CONSTRUCTION", "closed": true}
    }
  ],
  "dimensions": [
    {
      "type": "linear",
      "measurePoints": [[x1, y1], [x2, y2]],
      "dimensionLinePosition": [x, y],
      "properties": {
        "layer": "DIMENSIONS",
        "textHeight": 100,
        "arrowSize": 50,
        "label": "auto"
      }
    }
  ],
  "hatching": [
    {
      "boundaryPoints": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
      "pattern": "ANSI31",
      "scale": 1.0,
      "angle": 45,
      "properties": {"layer": "HATCHING", "material": "concrete"}
    }
  ],
  "layers": [
    {"name": "CONSTRUCTION", "color": 7, "lineType": "CONTINUOUS"},
    {"name": "DIMENSIONS", "color": 1, "lineType": "CONTINUOUS"},
    {"name": "HATCHING", "color": 2, "lineType": "CONTINUOUS"}
  ]
}

**ENGINEERING ANALYSIS RULES:**
1. **Coordinate System**: Origin (0,0) at bottom-left, X-axis right, Y-axis up, all in millimeters
2. **Element Positioning**: Center drawings in coordinate space, leave margins for dimensions
3. **Dimension Placement**: Position dimension lines 200-300mm away from elements
4. **Text Sizing**: Use textHeight 100-150 for drawings up to 5000mm, scale proportionally
5. **Layer Standards**: CONSTRUCTION (color 7), DIMENSIONS (color 1), HATCHING (color 2)
6. **Professional Spacing**: Ensure adequate space between elements and dimensions

**DETAILED EXAMPLES:**

**Example 1 - "2m line with dimensions":**
{
  "title": "2000mm Horizontal Line",
  "elements": [
    {"type": "line", "coordinates": [[0, 0], [2000, 0]], "properties": {"layer": "CONSTRUCTION"}}
  ],
  "dimensions": [
    {
      "type": "linear",
      "measurePoints": [[0, 0], [2000, 0]],
      "dimensionLinePosition": [1000, -200],
      "properties": {"layer": "DIMENSIONS", "textHeight": 100, "arrowSize": 50}
    }
  ]
}

**Example 2 - "Circle 500mm radius":**
{
  "title": "Circle R500",
  "elements": [
    {"type": "circle", "coordinates": [[0, 0], [500]], "properties": {"layer": "CONSTRUCTION"}}
  ],
  "dimensions": [
    {
      "type": "radial",
      "measurePoints": [[0, 0], [500, 0]],
      "dimensionLinePosition": [250, 250],
      "properties": {"layer": "DIMENSIONS", "textHeight": 100}
    }
  ]
}

**Example 3 - "Rectangle 1000x500mm with concrete hatching":**
{
  "title": "Concrete Rectangle 1000x500",
  "elements": [
    {"type": "rectangle", "coordinates": [[0, 0], [1000, 500]], "properties": {"layer": "CONSTRUCTION"}}
  ],
  "dimensions": [
    {
      "type": "linear",
      "measurePoints": [[0, 0], [1000, 0]],
      "dimensionLinePosition": [500, -200],
      "properties": {"layer": "DIMENSIONS", "textHeight": 100}
    },
    {
      "type": "linear",
      "measurePoints": [[0, 0], [0, 500]],
      "dimensionLinePosition": [-200, 250],
      "properties": {"layer": "DIMENSIONS", "textHeight": 100}
    }
  ],
  "hatching": [
    {
      "boundaryPoints": [[0, 0], [1000, 0], [1000, 500], [0, 500]],
      "pattern": "ANSI31",
      "scale": 1.0,
      "angle": 45,
      "properties": {"layer": "HATCHING", "material": "concrete"}
    }
  ]
}

**CRITICAL REQUIREMENTS:**
1. Respond with ONLY the JSON object
2. NO Python code generation
3. NO explanations or text
4. NO markdown formatting
5. Just the structured JSON specification

**FORBIDDEN:**
- Do NOT generate Python code
- Do NOT include import statements
- Do NOT include ezdxf code
- Do NOT add explanations

Respond with ONLY the JSON object.`;
  }

  private static extractSpecificationFromResponse(response: string): DrawingSpecification {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validate and normalize the specification
      return this.validateAndNormalizeSpecification(parsed);
    } catch (error) {
      console.error('Error extracting specification from response:', error);
      console.log('Response was:', response);
      return this.getDefaultSpecification();
    }
  }

  private static validateAndNormalizeSpecification(spec: any): DrawingSpecification {
    // Ensure all required fields exist with defaults
    const normalized: DrawingSpecification = {
      title: spec.title || 'Generated Drawing',
      scale: spec.scale || 100,
      units: spec.units || 'mm',
      elements: [],
      dimensions: [],
      layers: spec.layers || [
        { name: 'CONSTRUCTION', color: 7 },
        { name: 'DIMENSIONS', color: 1 },
        { name: 'HATCHING', color: 2 }
      ]
    };

    // Validate and normalize elements
    if (Array.isArray(spec.elements)) {
      normalized.elements = spec.elements.map((element: any, index: number) => ({
        id: `element_${index + 1}`,
        type: element.type || 'line',
        coordinates: element.coordinates || [[0, 0], [100, 0]],
        properties: {
          layer: element.properties?.layer || 'CONSTRUCTION',
          color: element.properties?.color || 7
        }
      }));
    }

    // Validate and normalize dimensions
    if (Array.isArray(spec.dimensions)) {
      normalized.dimensions = spec.dimensions.map((dimension: any, index: number) => ({
        id: `dimension_${index + 1}`,
        type: dimension.type || 'linear',
        points: dimension.points || [[0, 0], [100, 0]],
        properties: {
          layer: 'DIMENSIONS',
          textHeight: dimension.properties?.textHeight || 100,
          arrowSize: dimension.properties?.arrowSize || 50,
          position: dimension.properties?.position || [0, -200]
        }
      }));
    }

    return normalized;
  }

  private static getDefaultSpecification(): DrawingSpecification {
    return {
      title: 'Simple Line Drawing',
      scale: 1,
      units: 'mm',
      elements: [
        {
          id: 'line1',
          type: 'line',
          coordinates: [[0, 0], [2000, 0]],
          properties: { layer: 'CONSTRUCTION' }
        }
      ],
      dimensions: [
        {
          id: 'dim1',
          type: 'linear',
          points: [[0, 0], [2000, 0]],
          properties: {
            layer: 'DIMENSIONS',
            textHeight: 100,
            arrowSize: 50,
            position: [0, -200]
          }
        }
      ],
      layers: [
        { name: 'CONSTRUCTION', color: 7 },
        { name: 'DIMENSIONS', color: 1 }
      ]
    };
  }

  /**
   * Generate enhanced specification with additional details
   */
  static async enhanceSpecification(
    baseSpec: DrawingSpecification, 
    additionalRequirements: string
  ): Promise<DrawingSpecification> {
    const prompt = `Enhance the following drawing specification based on additional requirements:

**CURRENT SPECIFICATION:**
${JSON.stringify(baseSpec, null, 2)}

**ADDITIONAL REQUIREMENTS:**
${additionalRequirements}

**INSTRUCTIONS:**
1. Add missing elements or dimensions based on requirements
2. Adjust coordinates and positioning for better layout
3. Add appropriate hatching if materials are mentioned
4. Ensure all dimensions are properly positioned
5. Maintain the same JSON format

Respond with ONLY the enhanced JSON specification.`;

    try {
      const response = await LLMService.generateContent(prompt);
      return this.extractSpecificationFromResponse(response);
    } catch (error) {
      console.error('Error enhancing specification:', error);
      return baseSpec; // Return original on error
    }
  }
}
