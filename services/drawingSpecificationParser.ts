import { DrawingSpecification } from '../components/DrawingSpecificationInterface';
import { LLMService } from './llmService';

export class DrawingSpecificationParser {
  /**
   * Parse natural language description into structured drawing specification
   */
  static async parseDescription(
    description: string,
    isModification: boolean = false,
    previousSpecification?: DrawingSpecification,
    modificationRequest?: string
  ): Promise<DrawingSpecification> {
    const prompt = isModification && previousSpecification && modificationRequest
      ? this.createModificationPrompt(previousSpecification, modificationRequest, description)
      : this.createParsingPrompt(description);
    
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

  /**
   * Create modification prompt for existing drawing specification
   */
  private static createModificationPrompt(
    previousSpecification: DrawingSpecification,
    modificationRequest: string,
    originalDescription: string
  ): string {
    return `MODIFY the existing drawing specification based on the modification request below.

**IMPORTANT: This is a MODIFICATION request, not a new drawing. You must:**
1. Take the existing specification as your starting point
2. Apply ONLY the requested modifications
3. Keep all other elements unchanged unless specifically requested
4. Maintain the same JSON structure and format
5. Preserve existing coordinates, dimensions, and properties unless modification affects them

**EXISTING DRAWING SPECIFICATION TO MODIFY:**
${JSON.stringify(previousSpecification, null, 2)}

**MODIFICATION REQUEST:**
${modificationRequest}

**ORIGINAL DESCRIPTION CONTEXT:**
${originalDescription}

**TASK:** Modify the above existing specification according to the modification request. Return the COMPLETE modified specification in the same JSON format, but only change what was specifically requested.

**CRITICAL: Respond with ONLY a JSON object. NO explanations, NO Python code, NO markdown.**

Respond with ONLY the JSON object.`;
  }

  private static createParsingPrompt(description: string): string {
    return `You are a professional CAD engineer. Analyze the drawing requirements and provide precise geometric specifications.

**CRITICAL: Respond with ONLY a JSON object. NO explanations, NO Python code, NO markdown.**

**DRAWING DESCRIPTION:**
${description}

**YOUR TASK:**
Provide exact specifications for each drawing element with precise coordinates and attributes.

**REQUIRED JSON FORMAT:**
{
  "title": "Drawing Title",
  "scale": 1,
  "units": "mm",
  "lines": [
    {
      "startPoint": [x1, y1],
      "endPoint": [x2, y2],
      "lineType": "CONTINUOUS",
      "layer": "CONSTRUCTION",
      "color": 7
    }
  ],
  "circles": [
    {
      "centerPoint": [x, y],
      "radius": value,
      "layer": "CONSTRUCTION",
      "color": 7
    }
  ],
  "arcs": [
    {
      "centerPoint": [x, y],
      "radius": value,
      "startAngle": degrees,
      "endAngle": degrees,
      "layer": "CONSTRUCTION",
      "color": 7
    }
  ],
  "rectangles": [
    {
      "corner1": [x1, y1],
      "corner2": [x2, y2],
      "layer": "CONSTRUCTION",
      "color": 7
    }
  ],
  "polylines": [
    {
      "points": [[x1, y1], [x2, y2], [x3, y3]],
      "closed": true,
      "layer": "CONSTRUCTION",
      "color": 7
    }
  ],
  "linearDimensions": [
    {
      "point1": [x1, y1],
      "point2": [x2, y2],
      "dimensionLinePosition": [x, y],
      "textHeight": 200,
      "arrowSize": 80,
      "layer": "DIMENSIONS",
      "color": 1
    }
  ],
  "radialDimensions": [
    {
      "centerPoint": [x, y],
      "radiusPoint": [x, y],
      "textHeight": 200,
      "layer": "DIMENSIONS",
      "color": 1
    }
  ],
  "hatching": [
    {
      "boundaryPoints": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
      "pattern": "ANSI31",
      "scale": 1.0,
      "angle": 45,
      "layer": "HATCHING",
      "color": 2
    }
  ]
}

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

**SPECIFICATION RULES:**
1. **Coordinates**: All in millimeters, origin (0,0) at bottom-left
2. **Multiple Elements**: Use arrays for multiple lines, circles, etc.
3. **Precise Positioning**: Calculate exact coordinates for professional layout
4. **Dimension Placement**: Position dimension lines 200-300mm from elements
5. **Text Sizing**: Use textHeight 200 for visibility, arrowSize 80
6. **Layer Standards**: CONSTRUCTION (color 7), DIMENSIONS (color 1), HATCHING (color 2)

**EXAMPLES:**

**"2m horizontal line with dimension":**
{
  "title": "2000mm Horizontal Line",
  "lines": [
    {
      "startPoint": [0, 0],
      "endPoint": [2000, 0],
      "lineType": "CONTINUOUS",
      "layer": "CONSTRUCTION",
      "color": 7
    }
  ],
  "linearDimensions": [
    {
      "point1": [0, 0],
      "point2": [2000, 0],
      "dimensionLinePosition": [1000, -300],
      "textHeight": 200,
      "arrowSize": 80,
      "layer": "DIMENSIONS",
      "color": 1
    }
  ]
}

**"Circle 500mm radius with radial dimension":**
{
  "title": "Circle R500",
  "circles": [
    {
      "centerPoint": [0, 0],
      "radius": 500,
      "layer": "CONSTRUCTION",
      "color": 7
    }
  ],
  "radialDimensions": [
    {
      "centerPoint": [0, 0],
      "radiusPoint": [500, 0],
      "textHeight": 200,
      "layer": "DIMENSIONS",
      "color": 1
    }
  ]
}

**"Rectangle 1000x500mm with concrete hatching":**
{
  "title": "Concrete Rectangle",
  "rectangles": [
    {
      "corner1": [0, 0],
      "corner2": [1000, 500],
      "layer": "CONSTRUCTION",
      "color": 7
    }
  ],
  "linearDimensions": [
    {
      "point1": [0, 0],
      "point2": [1000, 0],
      "dimensionLinePosition": [500, -300],
      "textHeight": 200,
      "arrowSize": 80,
      "layer": "DIMENSIONS",
      "color": 1
    },
    {
      "point1": [0, 0],
      "point2": [0, 500],
      "dimensionLinePosition": [-300, 250],
      "textHeight": 200,
      "arrowSize": 80,
      "layer": "DIMENSIONS",
      "color": 1
    }
  ],
  "hatching": [
    {
      "boundaryPoints": [[0, 0], [1000, 0], [1000, 500], [0, 500]],
      "pattern": "ANSI31",
      "scale": 1.0,
      "angle": 45,
      "layer": "HATCHING",
      "color": 2
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
