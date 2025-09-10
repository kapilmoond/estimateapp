import { LLMService } from './llmService';

// Enhanced structured data format for LLM response
export interface LineData {
  startX: number | null;
  startY: number | null;
  endX: number | null;
  endY: number | null;
  layer: string | null;
  color: number | null;
  linetype: string | null;
}

export interface CircleData {
  centerX: number | null;
  centerY: number | null;
  radius: number | null;
  layer: string | null;
  color: number | null;
  linetype: string | null;
}

export interface ArcData {
  centerX: number | null;
  centerY: number | null;
  radius: number | null;
  startAngle: number | null;
  endAngle: number | null;
  layer: string | null;
  color: number | null;
  linetype: string | null;
}

export interface PointData {
  x: number | null;
  y: number | null;
  layer: string | null;
  color: number | null;
}

export interface DimensionData {
  type: 'linear' | 'aligned' | null;
  p1X: number | null;
  p1Y: number | null;
  p2X: number | null;
  p2Y: number | null;
  baseX: number | null;
  baseY: number | null;
  angle: number | null; // for rotated dimensions
  distance: number | null; // for aligned dimensions
  text: string | null; // custom text override
  layer: string | null;
  color: number | null;
  dimstyle: string | null;
}

export interface StructuredDrawingData {
  title: string;
  lines: LineData[];
  circles: CircleData[];
  arcs: ArcData[];
  points: PointData[];
  dimensions: DimensionData[];
}

export class SimpleDrawingGenerator {
  /**
   * Generate structured drawing data from user description
   */
  static async generateStructuredData(description: string, previousData?: StructuredDrawingData): Promise<StructuredDrawingData> {
    const prompt = this.createStructuredPrompt(description, previousData);

    console.log('📝 Structured Drawing Prompt:', prompt.substring(0, 200) + '...');

    try {
      const response = await LLMService.generateContent(prompt);
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
    // Collect all unique layers from all entities
    const layers = new Set<string>();

    // Collect layers from all entity types
    data.lines?.forEach(line => line.layer && layers.add(line.layer));
    data.circles?.forEach(circle => circle.layer && layers.add(circle.layer));
    data.arcs?.forEach(arc => arc.layer && layers.add(arc.layer));
    data.points?.forEach(point => point.layer && layers.add(point.layer));
    data.dimensions?.forEach(dim => dim.layer && layers.add(dim.layer));

    let code = `import ezdxf

# Create a new DXF R2010 document
doc = ezdxf.new("R2010", setup=True)

# Add new entities to the modelspace
msp = doc.modelspace()

`;

    // Auto-create layers if any are found
    if (layers.size > 0) {
      code += `# Auto-create layers found in structured data\n`;
      Array.from(layers).forEach(layerName => {
        code += `if "${layerName}" not in doc.layers:\n`;
        code += `    doc.layers.add(name="${layerName}")\n`;
      });
      code += `\n`;
    }

    // Add lines
    if (data.lines && data.lines.length > 0) {
      code += `# Add line entities\n`;

      data.lines.forEach((line) => {
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
    }

    // Add circles
    if (data.circles && data.circles.length > 0) {
      code += `\n# Add circle entities\n`;

      data.circles.forEach((circle) => {
        const centerX = circle.centerX ?? 0;
        const centerY = circle.centerY ?? 0;
        const radius = circle.radius ?? 5;
        const layer = circle.layer ? `"${circle.layer}"` : null;
        const color = circle.color ?? null;
        const linetype = circle.linetype ? `"${circle.linetype}"` : null;

        // Build dxfattribs
        const attrs: string[] = [];
        if (layer) attrs.push(`"layer": ${layer}`);
        if (color !== null) attrs.push(`"color": ${color}`);
        if (linetype) attrs.push(`"linetype": ${linetype}`);

        const dxfattribs = attrs.length > 0 ? `, dxfattribs={${attrs.join(', ')}}` : '';

        code += `msp.add_circle((${centerX}, ${centerY}), radius=${radius}${dxfattribs})\n`;
      });
    }

    // Add arcs
    if (data.arcs && data.arcs.length > 0) {
      code += `\n# Add arc entities\n`;

      data.arcs.forEach((arc) => {
        const centerX = arc.centerX ?? 0;
        const centerY = arc.centerY ?? 0;
        const radius = arc.radius ?? 5;
        const startAngle = arc.startAngle ?? 0;
        const endAngle = arc.endAngle ?? 90;
        const layer = arc.layer ? `"${arc.layer}"` : null;
        const color = arc.color ?? null;
        const linetype = arc.linetype ? `"${arc.linetype}"` : null;

        // Build dxfattribs
        const attrs: string[] = [];
        if (layer) attrs.push(`"layer": ${layer}`);
        if (color !== null) attrs.push(`"color": ${color}`);
        if (linetype) attrs.push(`"linetype": ${linetype}`);

        const dxfattribs = attrs.length > 0 ? `, dxfattribs={${attrs.join(', ')}}` : '';

        code += `msp.add_arc((${centerX}, ${centerY}), radius=${radius}, start_angle=${startAngle}, end_angle=${endAngle}${dxfattribs})\n`;
      });
    }

    // Add points
    if (data.points && data.points.length > 0) {
      code += `\n# Add point entities\n`;

      data.points.forEach((point) => {
        const x = point.x ?? 0;
        const y = point.y ?? 0;
        const layer = point.layer ? `"${point.layer}"` : null;
        const color = point.color ?? null;

        // Build dxfattribs
        const attrs: string[] = [];
        if (layer) attrs.push(`"layer": ${layer}`);
        if (color !== null) attrs.push(`"color": ${color}`);

        const dxfattribs = attrs.length > 0 ? `, dxfattribs={${attrs.join(', ')}}` : '';

        code += `msp.add_point((${x}, ${y})${dxfattribs})\n`;
      });
    }

    // Add dimensions
    if (data.dimensions && data.dimensions.length > 0) {
      code += `\n# Add dimension entities\n`;

      data.dimensions.forEach((dim) => {
        const p1X = dim.p1X ?? 0;
        const p1Y = dim.p1Y ?? 0;
        const p2X = dim.p2X ?? 100;
        const p2Y = dim.p2Y ?? 0;
        const baseX = dim.baseX ?? 50;
        const baseY = dim.baseY ?? 20;
        const angle = dim.angle ?? null;
        const distance = dim.distance ?? null;
        const text = dim.text ? `"${dim.text}"` : null;
        const layer = dim.layer ? `"${dim.layer}"` : null;
        const color = dim.color ?? null;
        const dimstyle = dim.dimstyle ? `"${dim.dimstyle}"` : '"EZDXF"';

        // Build dxfattribs for dimension
        const attrs: string[] = [];
        if (layer) attrs.push(`"layer": ${layer}`);
        if (color !== null) attrs.push(`"color": ${color}`);

        const dxfattribs = attrs.length > 0 ? `, dxfattribs={${attrs.join(', ')}}` : '';
        const textArg = text ? `, text=${text}` : '';
        const dimstyleArg = `, dimstyle=${dimstyle}`;

        if (dim.type === 'aligned') {
          const distanceArg = distance !== null ? `, distance=${distance}` : '';
          code += `dim = msp.add_aligned_dim(p1=(${p1X}, ${p1Y}), p2=(${p2X}, ${p2Y})${distanceArg}${dimstyleArg}${textArg}${dxfattribs})\n`;
        } else if (angle !== null) {
          // Rotated linear dimension
          code += `dim = msp.add_linear_dim(base=(${baseX}, ${baseY}), p1=(${p1X}, ${p1Y}), p2=(${p2X}, ${p2Y}), angle=${angle}${dimstyleArg}${textArg}${dxfattribs})\n`;
        } else {
          // Standard linear dimension
          code += `dim = msp.add_linear_dim(base=(${baseX}, ${baseY}), p1=(${p1X}, ${p1Y}), p2=(${p2X}, ${p2Y})${dimstyleArg}${textArg}${dxfattribs})\n`;
        }
        code += `dim.render()\n`;
      });
    }

    // Add default line if no entities provided
    if ((!data.lines || data.lines.length === 0) &&
        (!data.circles || data.circles.length === 0) &&
        (!data.arcs || data.arcs.length === 0) &&
        (!data.points || data.points.length === 0) &&
        (!data.dimensions || data.dimensions.length === 0)) {
      code += `# Add a default LINE entity\n`;
      code += `msp.add_line((0, 0), (10, 0))\n`;
    }

    code += `
# Save the DXF document
doc.saveas("${data.title || 'drawing'}.dxf")`;

    return code;
  }

  /**
   * Create structured prompt for LLM with ezdxf documentation
   */
  private static createStructuredPrompt(description: string, previousData?: StructuredDrawingData): string {
    const ezdxfDocumentation = this.getEzdxfDocumentation();

    let prompt = `You are a professional CAD engineer. Analyze the drawing request and provide ONLY the required entity data in the exact JSON format below.

${ezdxfDocumentation}

DRAWING REQUEST:
${description}`;

    // Include previous data for modifications
    if (previousData) {
      prompt += `

PREVIOUS DRAWING DATA (for modification):
${JSON.stringify(previousData, null, 2)}

MODIFICATION INSTRUCTIONS: Modify the above drawing data according to the new request. Keep existing entities that are not affected by the modification.`;
    }

    prompt += `

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
  ],
  "circles": [
    {
      "centerX": number_or_null,
      "centerY": number_or_null,
      "radius": number_or_null,
      "layer": "string_or_null",
      "color": number_or_null,
      "linetype": "string_or_null"
    }
  ],
  "arcs": [
    {
      "centerX": number_or_null,
      "centerY": number_or_null,
      "radius": number_or_null,
      "startAngle": number_or_null,
      "endAngle": number_or_null,
      "layer": "string_or_null",
      "color": number_or_null,
      "linetype": "string_or_null"
    }
  ],
  "points": [
    {
      "x": number_or_null,
      "y": number_or_null,
      "layer": "string_or_null",
      "color": number_or_null
    }
  ],
  "dimensions": [
    {
      "type": "linear_or_aligned_or_null",
      "p1X": number_or_null,
      "p1Y": number_or_null,
      "p2X": number_or_null,
      "p2Y": number_or_null,
      "baseX": number_or_null,
      "baseY": number_or_null,
      "angle": number_or_null,
      "distance": number_or_null,
      "text": "string_or_null",
      "layer": "string_or_null",
      "color": number_or_null,
      "dimstyle": "string_or_null"
    }
  ]
}

RULES:
- Use null for any value you want to use default
- Default values: coordinates=0, radius=5, angles=0/90, layer=null, color=null, linetype=null
- Dimension defaults: type="linear", baseX/Y=midpoint+offset, distance=20, dimstyle="EZDXF"
- Coordinates in millimeters, angles in degrees
- Common linetypes: "CONTINUOUS", "DASHED", "DOTTED", "DASHDOT"
- Colors: 1=red, 2=yellow, 3=green, 4=cyan, 5=blue, 6=magenta, 7=white
- Empty arrays are allowed for entity types not needed
- For dimensions: p1/p2 are measurement points, base is dimension line location
- Provide ONLY the JSON object, nothing else`;

    return prompt;
  }

  /**
   * Get ezdxf documentation for prompt
   */
  private static getEzdxfDocumentation(): string {
    return `EZDXF DOCUMENTATION REFERENCE:

LAYERS (AUTO-CREATED BY APP):
- DO NOT create layers in your response - the app will auto-create them
- Just specify layer names in entity data - app handles layer creation
- Common layer names: "CONSTRUCTION", "WALLS", "DOORS", "WINDOWS", "DIMENSIONS", "TEXT", "CENTERLINES"
- Layer colors: 1=red, 2=yellow, 3=green, 4=cyan, 5=blue, 6=magenta, 7=white
- Entities inherit layer properties automatically

LINETYPES:
- Standard linetypes: "CONTINUOUS", "DASHED", "DOTTED", "DASHDOT", "CENTER"
- Use standard names only - app handles linetype setup
- CONTINUOUS = solid lines, DASHED = broken lines, DOTTED = dotted lines

ENTITIES:
- Line: Connects two points (x1,y1) to (x2,y2)
- Circle: Center point (cx,cy) with radius
- Arc: Center point (cx,cy) with radius, start/end angles in degrees
- Point: Single coordinate (x,y) for marking locations
- Dimension: Measures distance between two points with annotation
- All coordinates in millimeters, angles in degrees
- Arc angles: counter-clockwise from positive X-axis (0° = right, 90° = up)

DIMENSIONS:
- Types: "linear" (horizontal/vertical/rotated), "aligned" (parallel to measured line)
- Linear: Measures distance between two points with dimension line at base location
- Aligned: Measures distance parallel to line between two points with offset
- Base point: Location of dimension line (linear dimensions only)
- Distance: Offset from measured line (aligned dimensions only)
- Angle: Rotation angle in degrees (0=horizontal, 90=vertical)
- Text override: Custom text instead of measured value
- Dimstyle: "EZDXF" (default), "Standard", or custom style name

ATTRIBUTES:
- layer: Layer name (string) - app will create if needed
- color: Color index (1-255) or null for layer default
- linetype: Linetype name or null for layer default
- Use null for any attribute to use defaults`;
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
        lines: (parsed.lines || []).map((line: any) => ({
          startX: line.startX,
          startY: line.startY,
          endX: line.endX,
          endY: line.endY,
          layer: line.layer,
          color: line.color,
          linetype: line.linetype
        })),
        circles: (parsed.circles || []).map((circle: any) => ({
          centerX: circle.centerX,
          centerY: circle.centerY,
          radius: circle.radius,
          layer: circle.layer,
          color: circle.color,
          linetype: circle.linetype
        })),
        arcs: (parsed.arcs || []).map((arc: any) => ({
          centerX: arc.centerX,
          centerY: arc.centerY,
          radius: arc.radius,
          startAngle: arc.startAngle,
          endAngle: arc.endAngle,
          layer: arc.layer,
          color: arc.color,
          linetype: arc.linetype
        })),
        points: (parsed.points || []).map((point: any) => ({
          x: point.x,
          y: point.y,
          layer: point.layer,
          color: point.color
        })),
        dimensions: (parsed.dimensions || []).map((dim: any) => ({
          type: dim.type,
          p1X: dim.p1X,
          p1Y: dim.p1Y,
          p2X: dim.p2X,
          p2Y: dim.p2Y,
          baseX: dim.baseX,
          baseY: dim.baseY,
          angle: dim.angle,
          distance: dim.distance,
          text: dim.text,
          layer: dim.layer,
          color: dim.color,
          dimstyle: dim.dimstyle
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
        }],
        circles: [],
        arcs: [],
        points: [],
        dimensions: []
      };
    }
  }
}
