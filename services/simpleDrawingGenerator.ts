import { LLMService } from './llmService';

// Simple structured data format for LLM response
export interface LineData {
  startX: number | null;
  startY: number | null;
  endX: number | null;
  endY: number | null;
  layer: string | null;
  color: number | null;
  linetype: string | null;
}

export interface StructuredDrawingData {
  title: string;
  lines: LineData[];
}

export class SimpleDrawingGenerator {
  /**
   * Generate structured drawing data from user description
   */
  static async generateStructuredData(description: string): Promise<StructuredDrawingData> {
    const prompt = this.createStructuredPrompt(description);
    
    console.log('📝 Structured Drawing Prompt:', prompt.substring(0, 200) + '...');

    try {
      const response = await LLMService.generateResponse(prompt);
      console.log('✅ LLM Response received, length:', response.length);
      
      const structuredData = this.parseStructuredResponse(response);
      console.log('✅ Structured data parsed:', structuredData);
      
      return structuredData;
    } catch (error) {
      console.error('❌ Structured data generation failed:', error);
      throw new Error(`Structured data generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Python code from structured data
   */
  static generatePythonCode(data: StructuredDrawingData): string {
    let code = `import ezdxf

# Create a new DXF R2010 document
doc = ezdxf.new("R2010", setup=True)

# Add new entities to the modelspace
msp = doc.modelspace()

`;

    // Add lines
    if (data.lines && data.lines.length > 0) {
      code += `# Add line entities\n`;
      
      data.lines.forEach((line, index) => {
        const startX = line.startX ?? 0;
        const startY = line.startY ?? 0;
        const endX = line.endX ?? 10;
        const endY = line.endY ?? 0;
        const layer = line.layer ? `"${line.layer}"` : null;
        const color = line.color ?? null;
        const linetype = line.linetype ? `"${line.linetype}"` : null;

        // Build dxfattribs
        const attrs: string[] = [];
        if (layer) attrs.push(`"layer": ${layer}`);
        if (color !== null) attrs.push(`"color": ${color}`);
        if (linetype) attrs.push(`"linetype": ${linetype}`);

        const dxfattribs = attrs.length > 0 ? `, dxfattribs={${attrs.join(', ')}}` : '';

        code += `msp.add_line((${startX}, ${startY}), (${endX}, ${endY})${dxfattribs})\n`;
      });
    } else {
      // Default line if no lines provided
      code += `# Add a default LINE entity\n`;
      code += `msp.add_line((0, 0), (10, 0))\n`;
    }

    code += `
# Save the DXF document
doc.saveas("${data.title || 'drawing'}.dxf")`;

    return code;
  }

  /**
   * Create structured prompt for LLM
   */
  private static createStructuredPrompt(description: string): string {
    return `You are a CAD engineer. Analyze the drawing request and provide ONLY the required line data in the exact JSON format below.

DRAWING REQUEST:
${description}

REQUIRED OUTPUT FORMAT (JSON only, no explanations):
{
  "title": "drawing_name",
  "lines": [
    {
      "startX": number_or_null,
      "startY": number_or_null, 
      "endX": number_or_null,
      "endY": number_or_null,
      "layer": "string_or_null",
      "color": number_or_null,
      "linetype": "string_or_null"
    }
  ]
}

RULES:
- Use null for any value you want to use default
- Default values: startX=0, startY=0, endX=10, endY=0, layer=null, color=null, linetype=null
- Coordinates in millimeters
- Common linetypes: "CONTINUOUS", "DASHED", "DOTTED"
- Colors: 1=red, 2=yellow, 3=green, 4=cyan, 5=blue, 6=magenta, 7=white
- Provide ONLY the JSON object, nothing else`;
  }

  /**
   * Parse LLM response to extract structured data
   */
  private static parseStructuredResponse(response: string): StructuredDrawingData {
    try {
      // Clean the response - remove any markdown or extra text
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks if present
      cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find JSON object
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validate structure
      if (!parsed.title || !Array.isArray(parsed.lines)) {
        throw new Error('Invalid JSON structure - missing title or lines array');
      }

      return {
        title: parsed.title,
        lines: parsed.lines.map((line: any) => ({
          startX: line.startX,
          startY: line.startY,
          endX: line.endX,
          endY: line.endY,
          layer: line.layer,
          color: line.color,
          linetype: line.linetype
        }))
      };
    } catch (error) {
      console.error('Failed to parse structured response:', error);
      console.error('Raw response:', response);
      
      // Return default structure if parsing fails
      return {
        title: 'drawing',
        lines: [{
          startX: 0,
          startY: 0,
          endX: 10,
          endY: 0,
          layer: null,
          color: null,
          linetype: null
        }]
      };
    }
  }
}
