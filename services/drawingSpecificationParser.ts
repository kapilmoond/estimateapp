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
    return `You are a professional CAD engineer. Parse the following drawing description into a structured JSON specification.

**DRAWING DESCRIPTION:**
${description}

**REQUIRED OUTPUT FORMAT:**
Respond with ONLY a valid JSON object in this exact format:

{
  "title": "Drawing Title",
  "scale": 100,
  "units": "mm",
  "elements": [
    {
      "type": "line|circle|arc|rectangle|polyline",
      "coordinates": [[x1, y1], [x2, y2]],
      "properties": {
        "layer": "CONSTRUCTION|DIMENSIONS|HATCHING"
      }
    }
  ],
  "dimensions": [
    {
      "type": "linear|aligned|radial|angular",
      "points": [[x1, y1], [x2, y2]],
      "properties": {
        "layer": "DIMENSIONS",
        "textHeight": 100,
        "arrowSize": 50,
        "position": [x, y]
      }
    }
  ],
  "layers": [
    {"name": "CONSTRUCTION", "color": 7},
    {"name": "DIMENSIONS", "color": 1},
    {"name": "HATCHING", "color": 2}
  ]
}

**PARSING RULES:**
1. Extract geometric elements (lines, circles, etc.) from the description
2. Determine appropriate coordinates based on mentioned dimensions
3. Add linear dimensions for all major measurements mentioned
4. Use standard layers: CONSTRUCTION (color 7), DIMENSIONS (color 1), HATCHING (color 2)
5. Set appropriate scale based on drawing size (1:1 for small, 1:100 for buildings)
6. Use millimeters as default units
7. Position dimensions below/beside elements with appropriate offsets

**COORDINATE SYSTEM:**
- Origin (0,0) at bottom-left
- X-axis horizontal (positive right)
- Y-axis vertical (positive up)
- All coordinates in millimeters

**EXAMPLES:**

For "2m line": 
- Element: line from (0,0) to (2000,0)
- Dimension: linear from (0,0) to (2000,0) positioned at (0,-200)

For "circle with 500mm radius":
- Element: circle at (0,0) with radius 500
- Dimension: radial from center (0,0) to point (500,0)

For "rectangle 1000x500mm":
- Element: rectangle from (0,0) to (1000,500)
- Dimensions: linear for width and height

Respond with ONLY the JSON object, no explanations.`;
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
