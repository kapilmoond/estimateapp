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
  type: 'linear' | 'aligned' | 'radius' | 'diameter' | 'angular' | 'arc' | null;
  // Linear and aligned dimensions
  p1X?: number | null;
  p1Y?: number | null;
  p2X?: number | null;
  p2Y?: number | null;
  baseX?: number | null;  // For linear dimensions
  baseY?: number | null;  // For linear dimensions
  distance?: number | null;  // For aligned dimensions
  angle?: number | null;  // Rotation angle in degrees

  // Radius and diameter dimensions
  centerX?: number | null;  // Center point for radius/diameter
  centerY?: number | null;
  radius?: number | null;   // Radius value

  // Angular and arc dimensions
  startAngle?: number | null;  // Start angle in degrees
  endAngle?: number | null;    // End angle in degrees

  // Common properties
  text?: string | null;  // Custom text override
  location?: { x: number; y: number } | null;  // User defined text location
  layer: string | null;
  color: number | null;
  dimstyle: string | null;
}

export interface SplineData {
  controlPoints?: { x: number; y: number; z?: number }[] | null;
  fitPoints?: { x: number; y: number; z?: number }[] | null;
  degree?: number | null;
  closed?: boolean | null;
  layer: string | null;
  color: number | null;
  linetype: string | null;
}

export interface HatchData {
  pattern?: string | null;  // Pattern name like "ANSI31", "SOLID"
  patternScale?: number | null;
  patternAngle?: number | null;
  color?: number | null;
  boundaries: {
    type: 'polyline' | 'edge';
    vertices?: { x: number; y: number; bulge?: number }[] | null;
    edges?: {
      type: 'line' | 'arc' | 'ellipse';
      startX?: number; startY?: number;
      endX?: number; endY?: number;
      centerX?: number; centerY?: number;
      radius?: number;
      startAngle?: number; endAngle?: number;
    }[] | null;
    isExternal?: boolean | null;
  }[];
  layer: string | null;
}

export interface MeshData {
  vertices: { x: number; y: number; z: number }[];
  faces: number[][];  // Array of vertex indices for each face
  subdivisionLevels?: number | null;
  layer: string | null;
  color: number | null;
}

export interface StructuredDrawingData {
  title: string;
  lines: LineData[];
  circles: CircleData[];
  arcs: ArcData[];
  points: PointData[];
  dimensions: DimensionData[];
  splines: SplineData[];
  hatches: HatchData[];
  meshes: MeshData[];
}

export interface ModificationData {
  delete: {
    lines: number[];      // Array of line indices to delete
    circles: number[];    // Array of circle indices to delete
    arcs: number[];       // Array of arc indices to delete
    points: number[];     // Array of point indices to delete
    dimensions: number[]; // Array of dimension indices to delete
    splines: number[];    // Array of spline indices to delete
    hatches: number[];    // Array of hatch indices to delete
    meshes: number[];     // Array of mesh indices to delete
  };
  add: StructuredDrawingData; // New entities to add
}

export class SimpleDrawingGenerator {
  /**
   * Generate structured drawing data from user description
   */
  static async generateStructuredData(
    description: string,
    previousData?: StructuredDrawingData,
    originalDescription?: string
  ): Promise<StructuredDrawingData> {
    if (previousData && originalDescription) {
      // MODIFICATION: Use delete/add system
      const modificationData = await this.generateModificationData(description, previousData, originalDescription);
      return this.applyModification(previousData, modificationData);
    } else {
      // NEW DRAWING: Use original system
      const prompt = this.createStructuredPrompt(description, previousData, originalDescription);

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
  }

  /**
   * Generate modification data with delete/add instructions
   */
  static async generateModificationData(
    description: string,
    previousData: StructuredDrawingData,
    originalDescription: string
  ): Promise<ModificationData> {
    const prompt = this.createModificationPrompt(description, previousData, originalDescription);

    console.log('📝 Modification Prompt:', prompt.substring(0, 200) + '...');

    try {
      const response = await LLMService.generateContent(prompt);
      console.log('✅ Modification Response received, length:', response.length);

      const modificationData = this.parseModificationResponse(response);
      console.log('✅ Modification data parsed:', modificationData);

      return modificationData;
    } catch (error) {
      console.error('❌ Modification generation failed:', error);
      throw new Error(`Modification generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply modification to existing drawing data
   */
  static applyModification(previousData: StructuredDrawingData, modification: ModificationData): StructuredDrawingData {
    console.log('🔄 Applying modification to existing drawing...');

    // Start with previous data
    const result: StructuredDrawingData = {
      title: modification.add.title || previousData.title,
      lines: [...previousData.lines],
      circles: [...previousData.circles],
      arcs: [...previousData.arcs],
      points: [...previousData.points],
      dimensions: [...previousData.dimensions],
      splines: [...(previousData.splines || [])],
      hatches: [...(previousData.hatches || [])],
      meshes: [...(previousData.meshes || [])]
    };

    // Delete entities (in reverse order to maintain indices)
    modification.delete.lines.sort((a, b) => b - a).forEach(index => {
      if (index >= 0 && index < result.lines.length) {
        result.lines.splice(index, 1);
        console.log(`🗑️ Deleted line at index ${index}`);
      }
    });

    modification.delete.circles.sort((a, b) => b - a).forEach(index => {
      if (index >= 0 && index < result.circles.length) {
        result.circles.splice(index, 1);
        console.log(`🗑️ Deleted circle at index ${index}`);
      }
    });

    modification.delete.arcs.sort((a, b) => b - a).forEach(index => {
      if (index >= 0 && index < result.arcs.length) {
        result.arcs.splice(index, 1);
        console.log(`🗑️ Deleted arc at index ${index}`);
      }
    });

    modification.delete.points.sort((a, b) => b - a).forEach(index => {
      if (index >= 0 && index < result.points.length) {
        result.points.splice(index, 1);
        console.log(`🗑️ Deleted point at index ${index}`);
      }
    });

    modification.delete.dimensions.sort((a, b) => b - a).forEach(index => {
      if (index >= 0 && index < result.dimensions.length) {
        result.dimensions.splice(index, 1);
        console.log(`🗑️ Deleted dimension at index ${index}`);
      }
    });

    modification.delete.splines.sort((a, b) => b - a).forEach(index => {
      if (index >= 0 && index < result.splines.length) {
        result.splines.splice(index, 1);
        console.log(`🗑️ Deleted spline at index ${index}`);
      }
    });

    modification.delete.hatches.sort((a, b) => b - a).forEach(index => {
      if (index >= 0 && index < result.hatches.length) {
        result.hatches.splice(index, 1);
        console.log(`🗑️ Deleted hatch at index ${index}`);
      }
    });

    modification.delete.meshes.sort((a, b) => b - a).forEach(index => {
      if (index >= 0 && index < result.meshes.length) {
        result.meshes.splice(index, 1);
        console.log(`🗑️ Deleted mesh at index ${index}`);
      }
    });

    // Add new entities
    result.lines.push(...modification.add.lines);
    result.circles.push(...modification.add.circles);
    result.arcs.push(...modification.add.arcs);
    result.points.push(...modification.add.points);
    result.dimensions.push(...modification.add.dimensions);
    result.splines.push(...modification.add.splines);
    result.hatches.push(...modification.add.hatches);
    result.meshes.push(...modification.add.meshes);

    const deletedCount = modification.delete.lines.length + modification.delete.circles.length +
                        modification.delete.arcs.length + modification.delete.points.length +
                        modification.delete.dimensions.length + modification.delete.splines.length +
                        modification.delete.hatches.length + modification.delete.meshes.length;

    const addedCount = modification.add.lines.length + modification.add.circles.length +
                      modification.add.arcs.length + modification.add.points.length +
                      modification.add.dimensions.length + modification.add.splines.length +
                      modification.add.hatches.length + modification.add.meshes.length;

    console.log(`✅ Applied modification: deleted ${deletedCount} entities, added ${addedCount} entities`);

    return result;
  }

  /**
   * Calculate drawing bounds from all entities
   */
  private static calculateDrawingBounds(data: StructuredDrawingData): { minX: number, minY: number, maxX: number, maxY: number, width: number, height: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Check lines
    data.lines?.forEach(line => {
      const startX = line.startX ?? 0;
      const startY = line.startY ?? 0;
      const endX = line.endX ?? 10;
      const endY = line.endY ?? 0;
      minX = Math.min(minX, startX, endX);
      minY = Math.min(minY, startY, endY);
      maxX = Math.max(maxX, startX, endX);
      maxY = Math.max(maxY, startY, endY);
    });

    // Check circles
    data.circles?.forEach(circle => {
      const centerX = circle.centerX ?? 0;
      const centerY = circle.centerY ?? 0;
      const radius = circle.radius ?? 5;
      minX = Math.min(minX, centerX - radius);
      minY = Math.min(minY, centerY - radius);
      maxX = Math.max(maxX, centerX + radius);
      maxY = Math.max(maxY, centerY + radius);
    });

    // Check arcs
    data.arcs?.forEach(arc => {
      const centerX = arc.centerX ?? 0;
      const centerY = arc.centerY ?? 0;
      const radius = arc.radius ?? 5;
      minX = Math.min(minX, centerX - radius);
      minY = Math.min(minY, centerY - radius);
      maxX = Math.max(maxX, centerX + radius);
      maxY = Math.max(maxY, centerY + radius);
    });

    // Check points
    data.points?.forEach(point => {
      const x = point.x ?? 0;
      const y = point.y ?? 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    // Check dimension points
    data.dimensions?.forEach(dim => {
      if (dim.type === 'linear' || dim.type === 'aligned') {
        const p1X = dim.p1X ?? 0;
        const p1Y = dim.p1Y ?? 0;
        const p2X = dim.p2X ?? 100;
        const p2Y = dim.p2Y ?? 0;
        minX = Math.min(minX, p1X, p2X);
        minY = Math.min(minY, p1Y, p2Y);
        maxX = Math.max(maxX, p1X, p2X);
        maxY = Math.max(maxY, p1Y, p2Y);
      } else if (dim.type === 'radius' || dim.type === 'diameter' || dim.type === 'angular' || dim.type === 'arc') {
        const centerX = dim.centerX ?? 0;
        const centerY = dim.centerY ?? 0;
        const radius = dim.radius ?? 50;
        minX = Math.min(minX, centerX - radius);
        minY = Math.min(minY, centerY - radius);
        maxX = Math.max(maxX, centerX + radius);
        maxY = Math.max(maxY, centerY + radius);
      }
    });

    // Check spline points
    data.splines?.forEach(spline => {
      const points = spline.controlPoints || spline.fitPoints || [];
      points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    // Check hatch boundaries
    data.hatches?.forEach(hatch => {
      hatch.boundaries.forEach(boundary => {
        if (boundary.vertices) {
          boundary.vertices.forEach(vertex => {
            minX = Math.min(minX, vertex.x);
            minY = Math.min(minY, vertex.y);
            maxX = Math.max(maxX, vertex.x);
            maxY = Math.max(maxY, vertex.y);
          });
        }
      });
    });

    // Check mesh vertices
    data.meshes?.forEach(mesh => {
      mesh.vertices.forEach(vertex => {
        minX = Math.min(minX, vertex.x);
        minY = Math.min(minY, vertex.y);
        maxX = Math.max(maxX, vertex.x);
        maxY = Math.max(maxY, vertex.y);
      });
    });

    // Fallback if no entities
    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = 100; maxY = 100;
    }

    const width = maxX - minX;
    const height = maxY - minY;

    return { minX, minY, maxX, maxY, width, height };
  }

  /**
   * Calculate appropriate dimension styling based on drawing size
   */
  private static calculateDimensionStyling(bounds: { width: number, height: number }) {
    const drawingSize = Math.max(bounds.width, bounds.height);

    // Scale factors based on drawing size
    let textHeight: number;
    let arrowSize: number;
    let dimGap: number;
    let extLineOffset: number;
    let extLineExtension: number;

    if (drawingSize <= 100) {
      // Small drawings (up to 100mm)
      textHeight = 2.5;
      arrowSize = 1.25;
      dimGap = 1.0;
      extLineOffset = 1.25;
      extLineExtension = 1.25;
    } else if (drawingSize <= 500) {
      // Medium drawings (100-500mm)
      textHeight = 5.0;
      arrowSize = 2.5;
      dimGap = 2.0;
      extLineOffset = 2.5;
      extLineExtension = 2.5;
    } else if (drawingSize <= 2000) {
      // Large drawings (500-2000mm)
      textHeight = 12.5;
      arrowSize = 6.25;
      dimGap = 5.0;
      extLineOffset = 6.25;
      extLineExtension = 6.25;
    } else if (drawingSize <= 10000) {
      // Very large drawings (2-10m)
      textHeight = 25.0;
      arrowSize = 12.5;
      dimGap = 10.0;
      extLineOffset = 12.5;
      extLineExtension = 12.5;
    } else {
      // Huge drawings (>10m)
      textHeight = 50.0;
      arrowSize = 25.0;
      dimGap = 20.0;
      extLineOffset = 25.0;
      extLineExtension = 25.0;
    }

    return { textHeight, arrowSize, dimGap, extLineOffset, extLineExtension };
  }

  /**
   * Generate Python code from structured data
   */
  static generatePythonCode(data: StructuredDrawingData): string {
    // Calculate drawing bounds and appropriate styling
    const bounds = this.calculateDrawingBounds(data);
    const styling = this.calculateDimensionStyling(bounds);

    // Collect all unique layers from all entities
    const layers = new Set<string>();

    // Collect layers from all entity types
    data.lines?.forEach(line => line.layer && layers.add(line.layer));
    data.circles?.forEach(circle => circle.layer && layers.add(circle.layer));
    data.arcs?.forEach(arc => arc.layer && layers.add(arc.layer));
    data.points?.forEach(point => point.layer && layers.add(point.layer));
    data.dimensions?.forEach(dim => dim.layer && layers.add(dim.layer));
    data.splines?.forEach(spline => spline.layer && layers.add(spline.layer));
    data.hatches?.forEach(hatch => hatch.layer && layers.add(hatch.layer));
    data.meshes?.forEach(mesh => mesh.layer && layers.add(mesh.layer));

    let code = `import ezdxf

# Create a new DXF R2010 document
doc = ezdxf.new("R2010", setup=True)

# Add new entities to the modelspace
msp = doc.modelspace()

# Configure dimension styling based on drawing size
# Drawing bounds: ${bounds.width.toFixed(1)}mm x ${bounds.height.toFixed(1)}mm
dimstyle = doc.dimstyles.get("EZDXF")
dimstyle.dxf.dimtxt = ${styling.textHeight}      # Text height
dimstyle.dxf.dimasz = ${styling.arrowSize}       # Arrow size
dimstyle.dxf.dimgap = ${styling.dimGap}          # Gap between dimension line and text
dimstyle.dxf.dimexo = ${styling.extLineOffset}  # Extension line offset from measurement point
dimstyle.dxf.dimexe = ${styling.extLineExtension} # Extension line extension beyond dimension line

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
        } else {
          // Determine if this is a vertical dimension (same X coordinates)
          const isVertical = p1X === p2X;
          // Determine if this is a horizontal dimension (same Y coordinates)
          const isHorizontal = p1Y === p2Y;

          let angleArg = '';
          if (angle !== null) {
            // Explicit angle provided
            angleArg = `, angle=${angle}`;
          } else if (isVertical) {
            // CRITICAL: Vertical dimensions require angle=90
            angleArg = `, angle=90`;
          } else if (isHorizontal) {
            // Horizontal dimensions don't need angle (default is 0)
            angleArg = '';
          }

          // Linear dimension with proper angle
          code += `dim = msp.add_linear_dim(base=(${baseX}, ${baseY}), p1=(${p1X}, ${p1Y}), p2=(${p2X}, ${p2Y})${angleArg}${dimstyleArg}${textArg}${dxfattribs})\n`;
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

    // Add splines
    if (data.splines && data.splines.length > 0) {
      code += `# Add spline entities\n`;
      data.splines.forEach((spline, index) => {
        if (spline.controlPoints && spline.controlPoints.length > 0) {
          const controlPointsStr = spline.controlPoints.map(p => `(${p.x}, ${p.y}${p.z !== undefined ? `, ${p.z}` : ''})`).join(', ');
          code += `spline${index + 1} = msp.add_spline(control_points=[${controlPointsStr}], degree=${spline.degree ?? 3}, closed=${spline.closed ?? false})\n`;
          code += `spline${index + 1}.dxf.layer = "${spline.layer || '0'}"\n`;
          if (spline.color !== null) {
            code += `spline${index + 1}.dxf.color = ${spline.color}\n`;
          }
          if (spline.linetype) {
            code += `spline${index + 1}.dxf.linetype = "${spline.linetype}"\n`;
          }
        } else if (spline.fitPoints && spline.fitPoints.length > 0) {
          const fitPointsStr = spline.fitPoints.map(p => `(${p.x}, ${p.y}${p.z !== undefined ? `, ${p.z}` : ''})`).join(', ');
          code += `spline${index + 1} = msp.add_spline_fit_points(fit_points=[${fitPointsStr}], degree=${spline.degree ?? 3}, closed=${spline.closed ?? false})\n`;
          code += `spline${index + 1}.dxf.layer = "${spline.layer || '0'}"\n`;
          if (spline.color !== null) {
            code += `spline${index + 1}.dxf.color = ${spline.color}\n`;
          }
          if (spline.linetype) {
            code += `spline${index + 1}.dxf.linetype = "${spline.linetype}"\n`;
          }
        }
        code += `\n`;
      });
    }

    // Add hatches
    if (data.hatches && data.hatches.length > 0) {
      code += `# Add hatch entities\n`;
      data.hatches.forEach((hatch, index) => {
        code += `hatch${index + 1} = msp.add_hatch(color=${hatch.color ?? 7})\n`;
        code += `hatch${index + 1}.dxf.layer = "${hatch.layer || '0'}"\n`;

        hatch.boundaries.forEach((boundary, bIndex) => {
          if (boundary.type === 'polyline' && boundary.vertices) {
            const verticesStr = boundary.vertices.map(v => `(${v.x}, ${v.y}${v.bulge !== undefined ? `, ${v.bulge}` : ''})`).join(', ');
            code += `with hatch${index + 1}.edit_boundary() as boundary_editor:\n`;
            code += `    boundary_editor.add_polyline_path([${verticesStr}], is_closed=True, flags=1)\n`;
          } else if (boundary.type === 'edge' && boundary.edges) {
            code += `with hatch${index + 1}.edit_boundary() as boundary_editor:\n`;
            code += `    edge_path = boundary_editor.add_edge_path(flags=1)\n`;
            boundary.edges.forEach(edge => {
              if (edge.type === 'line') {
                code += `    edge_path.add_line((${edge.startX ?? 0}, ${edge.startY ?? 0}), (${edge.endX ?? 0}, ${edge.endY ?? 0}))\n`;
              } else if (edge.type === 'arc') {
                code += `    edge_path.add_arc((${edge.centerX ?? 0}, ${edge.centerY ?? 0}), ${edge.radius ?? 50}, ${edge.startAngle ?? 0}, ${edge.endAngle ?? 90})\n`;
              }
            });
          }
        });

        if (hatch.pattern && hatch.pattern !== 'SOLID') {
          code += `hatch${index + 1}.set_pattern_fill("${hatch.pattern}", scale=${hatch.patternScale ?? 1}, angle=${hatch.patternAngle ?? 0})\n`;
        } else {
          code += `hatch${index + 1}.set_solid_fill()\n`;
        }
        code += `\n`;
      });
    }

    // Add meshes
    if (data.meshes && data.meshes.length > 0) {
      code += `# Add mesh entities\n`;
      data.meshes.forEach((mesh, index) => {
        const verticesStr = mesh.vertices.map(v => `(${v.x}, ${v.y}, ${v.z})`).join(', ');
        const facesStr = mesh.faces.map(face => `[${face.join(', ')}]`).join(', ');

        code += `mesh${index + 1} = msp.add_mesh()\n`;
        code += `mesh${index + 1}.dxf.layer = "${mesh.layer || '0'}"\n`;
        if (mesh.color !== null) {
          code += `mesh${index + 1}.dxf.color = ${mesh.color}\n`;
        }
        code += `vertices = [${verticesStr}]\n`;
        code += `for vertex in vertices:\n`;
        code += `    mesh${index + 1}.vertices.append(vertex)\n`;
        code += `faces = [${facesStr}]\n`;
        code += `for face in faces:\n`;
        code += `    mesh${index + 1}.faces.append(face)\n`;
        if (mesh.subdivisionLevels && mesh.subdivisionLevels > 0) {
          code += `mesh${index + 1}.dxf.subdivision_levels = ${mesh.subdivisionLevels}\n`;
        }
        code += `\n`;
      });
    }

    code += `
# Save the DXF document
doc.saveas("${data.title || 'drawing'}.dxf")`;

    return code;
  }

  /**
   * Create modification prompt for delete/add system
   */
  private static createModificationPrompt(
    description: string,
    previousData: StructuredDrawingData,
    originalDescription: string
  ): string {
    const ezdxfDocumentation = this.getEzdxfDocumentation();

    // Add indices to entities for deletion reference
    const indexedPreviousData = {
      ...previousData,
      lines: previousData.lines.map((line, index) => ({ ...line, index })),
      circles: previousData.circles.map((circle, index) => ({ ...circle, index })),
      arcs: previousData.arcs.map((arc, index) => ({ ...arc, index })),
      points: previousData.points.map((point, index) => ({ ...point, index })),
      dimensions: previousData.dimensions.map((dim, index) => ({ ...dim, index })),
      splines: previousData.splines.map((spline, index) => ({ ...spline, index })),
      hatches: previousData.hatches.map((hatch, index) => ({ ...hatch, index })),
      meshes: previousData.meshes.map((mesh, index) => ({ ...mesh, index }))
    };

    return `You are a professional CAD engineer. Analyze the modification request and provide ONLY the required modification data in the exact JSON format below.

${ezdxfDocumentation}

ORIGINAL DRAWING REQUEST:
${originalDescription}

CURRENT DRAWING DATA (with indices for deletion reference):
${JSON.stringify(indexedPreviousData, null, 2)}

MODIFICATION REQUEST:
${description}

MODIFICATION INSTRUCTIONS:
1. Analyze what entities need to be DELETED from the current drawing
2. Specify what new entities need to be ADDED
3. For deletion, provide the INDEX numbers of entities to remove
4. For addition, provide complete new entity data
5. If no deletion is needed, provide empty arrays
6. If no addition is needed, provide empty arrays

REQUIRED OUTPUT FORMAT (JSON only, no explanations):
{
  "delete": {
    "lines": [index1, index2, ...],
    "circles": [index1, index2, ...],
    "arcs": [index1, index2, ...],
    "points": [index1, index2, ...],
    "dimensions": [index1, index2, ...],
    "splines": [index1, index2, ...],
    "hatches": [index1, index2, ...],
    "meshes": [index1, index2, ...]
  },
  "add": {
    "title": "drawing_name",
    "lines": [...],
    "circles": [...],
    "arcs": [...],
    "points": [...],
    "dimensions": [...],
    "splines": [...],
    "hatches": [...],
    "meshes": [...]
  }
}

EXAMPLES:
- To change line color: DELETE old line by index, ADD new line with different color
- To add windows: DELETE nothing (empty arrays), ADD new window entities
- To move door: DELETE old door entities by index, ADD new door at new location
- To resize dimension: DELETE old dimension by index, ADD new dimension with new size

RULES:
- Use entity INDEX numbers from the current drawing data above for deletion
- Provide complete entity data for additions
- Empty arrays are allowed if no deletion/addition needed
- AUTOMATIC SIZING: App calculates proper text size, arrow size, and spacing
- Provide ONLY the JSON object, nothing else`;
  }

  /**
   * Create structured prompt for LLM with ezdxf documentation
   */
  private static createStructuredPrompt(
    description: string,
    previousData?: StructuredDrawingData,
    originalDescription?: string
  ): string {
    const ezdxfDocumentation = this.getEzdxfDocumentation();

    let prompt = `You are a professional CAD engineer. Analyze the drawing request and provide ONLY the required entity data in the exact JSON format below.

${ezdxfDocumentation}`;

    // Handle modification vs new drawing
    if (previousData && originalDescription) {
      // MODIFICATION: Include complete context
      prompt += `

ORIGINAL DRAWING REQUEST:
${originalDescription}

PREVIOUS DRAWING DATA (generated from original request):
${JSON.stringify(previousData, null, 2)}

NEW MODIFICATION REQUEST:
${description}

MODIFICATION INSTRUCTIONS:
1. Start with the PREVIOUS DRAWING DATA above
2. Apply the NEW MODIFICATION REQUEST to modify/add/remove entities as needed
3. Keep all existing entities that are not affected by the modification
4. Maintain the same coordinate system and scale
5. Preserve layer organization and naming conventions`;
    } else if (previousData) {
      // MODIFICATION without original description (fallback)
      prompt += `

DRAWING REQUEST:
${description}

PREVIOUS DRAWING DATA (for modification):
${JSON.stringify(previousData, null, 2)}

MODIFICATION INSTRUCTIONS: Modify the above drawing data according to the new request. Keep existing entities that are not affected by the modification.`;
    } else {
      // NEW DRAWING
      prompt += `

DRAWING REQUEST:
${description}`;
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
- AUTOMATIC SIZING: App calculates proper text size, arrow size, and spacing based on total drawing size
- Focus on placement and measurement - app handles all dimension styling automatically
- Provide ONLY the JSON object, nothing else`;

    return prompt;
  }

  /**
   * Get ezdxf documentation for prompt
   */
  private static getEzdxfDocumentation(): string {
    return `COMPREHENSIVE EZDXF DOCUMENTATION REFERENCE:

LAYERS (AUTO-CREATED BY APP):
- DO NOT create layers in your response - the app will auto-create them
- Just specify layer names in entity data - app handles layer creation
- Common layer names: "CONSTRUCTION", "WALLS", "DOORS", "WINDOWS", "DIMENSIONS", "TEXT", "CENTERLINES", "HATCHING", "SPLINES", "MESHES"
- Layer colors: 1=red, 2=yellow, 3=green, 4=cyan, 5=blue, 6=magenta, 7=white, 8=dark_gray, 9=light_gray
- Entities inherit layer properties automatically

LINETYPES:
- Standard: "CONTINUOUS", "DASHED", "DOTTED", "DASHDOT", "DASHDOTDOT", "DIVIDE", "CENTER", "PHANTOM", "HIDDEN", "BORDER", "BORDER2", "BORDERX2"
- Use standard names only - app handles linetype setup
- CONTINUOUS = solid lines, DASHED = broken lines, DOTTED = dotted lines, CENTER = centerlines, HIDDEN = hidden edges

BASIC ENTITIES:
- Line: Connects two points (x1,y1) to (x2,y2)
- Circle: Center point (cx,cy) with radius
- Arc: Center point (cx,cy) with radius, start/end angles in degrees
- Point: Single coordinate (x,y) for marking locations
- All coordinates in millimeters, angles in degrees
- Arc angles: counter-clockwise from positive X-axis (0° = right, 90° = up)

DIMENSIONS (APP AUTO-SIZES TEXT/ARROWS):
- Types: "linear", "aligned", "radius", "diameter", "angular", "arc"
- Linear: Measures distance between two points with dimension line at base location
- Aligned: Measures distance parallel to line between two points with offset
- Radius: Measures radius of circles/arcs, requires centerX, centerY, radius, angle
- Diameter: Measures diameter of circles/arcs, requires centerX, centerY, radius, angle
- Angular: Measures angles between lines or arcs, requires centerX, centerY, startAngle, endAngle
- Arc: Measures arc length, requires centerX, centerY, radius, startAngle, endAngle
- IMPORTANT: App automatically calculates proper text size, arrow size, and spacing based on drawing size

DIMENSION POSITIONING RULES (CRITICAL FOR PROPER EXTENSION LINES):
- For HORIZONTAL dimensions (measuring horizontal distances):
  * p1 and p2 have same Y coordinate but different X coordinates
  * baseY should be ABOVE or BELOW the measurement line (offset vertically by 50-100mm minimum)
  * baseX should be between p1X and p2X (usually midpoint: (p1X + p2X) / 2)
  * NO angle parameter needed (default angle=0 for horizontal)
  * Example: measuring from (0,0) to (400,0), base should be (200, -50) or (200, 50)
  * Extension lines will automatically connect (0,0) and (400,0) to the dimension line at Y=-50

- For VERTICAL dimensions (measuring vertical distances):
  * p1 and p2 have same X coordinate but different Y coordinates
  * baseX should be LEFT or RIGHT of the measurement line (offset horizontally by 50-100mm minimum)
  * baseY should be between p1Y and p2Y (usually midpoint: (p1Y + p2Y) / 2)
  * CRITICAL: Must include "angle": 90 in the dimension data for vertical dimensions
  * Example: measuring from (100,600) to (100,2600), base should be (50, 1600) with angle=90
  * Extension lines will automatically connect (100,600) and (100,2600) to the dimension line at X=50

- CRITICAL EZDXF REQUIREMENT: Vertical dimensions MUST have angle=90 or they won't display properly
- Base point must be offset from the construction line to create proper extension lines
- Extension lines automatically connect measurement points (p1, p2) to dimension line (base)
- Dimension line is drawn at the base location, parallel to measurement direction
- Text is placed on or near the dimension line showing the measured distance
- Minimum offset: 50mm for small drawings, 100mm+ for large drawings

SPLINES (SMOOTH CURVES):
- Control points: Define spline by control points for precise curve definition
- Fit points: Define spline by points the curve passes through (less precise)
- Degree: Curve degree (1=linear, 2=quadratic, 3=cubic, etc.) - use 3 for smooth curves
- Closed: Whether spline forms a closed loop (true/false)
- 3D support: Include z coordinate for 3D splines
- Example: {"controlPoints": [{"x": 0, "y": 0}, {"x": 50, "y": 100}, {"x": 100, "y": 0}], "degree": 3, "closed": false}

HATCHES (FILLED AREAS):
- Patterns: "SOLID", "ANSI31", "ANSI32", "ANSI33", "ANSI34", "ANSI35", "ANSI36", "ANSI37", "ANSI38", "BRICK", "CROSS", "DOTS", "EARTH", "ESCHER", "FLEX", "GRASS", "GRAVEL", "HEX", "HONEY", "HOUND", "INSUL", "LINE", "MUDST", "NET", "NET3", "PLAST", "PLASTI", "SACNCR", "SQUARE", "STARS", "STEEL", "SWAMP", "TRANS", "TRIANG", "ZIGZAG"
- Boundaries: Define filled area using polyline vertices or edge paths
- Polyline boundaries: Array of vertices with x, y coordinates (and optional bulge for arcs)
- Edge boundaries: Array of edges (lines, arcs, ellipses) defining complex shapes
- Scale: Pattern scaling (0.1-10.0, default 1.0)
- Angle: Pattern rotation (0-360 degrees, default 0)
- Multiple boundaries: Support for islands and complex shapes
- Example: {"pattern": "ANSI31", "patternScale": 1.0, "patternAngle": 45, "boundaries": [{"type": "polyline", "vertices": [{"x": 0, "y": 0}, {"x": 100, "y": 0}, {"x": 100, "y": 100}, {"x": 0, "y": 100}]}]}

MESHES (3D SURFACES):
- Vertices: 3D points defining mesh geometry (x, y, z coordinates)
- Faces: Arrays of vertex indices defining triangular/quad faces (0-based indexing)
- Subdivision: Smoothing level for curved surfaces (0-4 levels, default 0)
- Professional 3D modeling capabilities for complex surfaces
- Triangular faces: Use 3 vertex indices [0, 1, 2]
- Quad faces: Use 4 vertex indices [0, 1, 2, 3]
- Example: {"vertices": [{"x": 0, "y": 0, "z": 0}, {"x": 100, "y": 0, "z": 0}, {"x": 50, "y": 100, "z": 50}], "faces": [[0, 1, 2]], "subdivisionLevels": 1}

PROFESSIONAL CAD FEATURES:
- Radius Dimensions: Automatic leader lines and text positioning
- Diameter Dimensions: Crossing diameter lines with center marks
- Angular Dimensions: Arc-based angle measurement with extension lines
- Arc Dimensions: Precise arc length measurement along curves
- Rational Splines: Advanced curve control with weights and knot vectors
- Polyface Meshes: Complex 3D surfaces with multiple faces and vertices
- Pattern Hatching: Comprehensive pattern library with custom scaling and rotation
- Complex Linetypes: Patterns with text, shapes, and custom spacing

ATTRIBUTES:
- layer: Layer name (string) - app will create if needed
- color: Color index (1-255) or null for layer default
- linetype: Linetype name or null for layer default
- Use null for any attribute to use defaults

COORDINATE SYSTEM:
- Origin (0,0) at bottom-left
- X-axis: positive to the right
- Y-axis: positive upward
- Z-axis: positive out of screen (for 3D entities)
- All measurements in millimeters
- Angles in degrees (0° = positive X-axis, counter-clockwise)`;
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
          centerX: dim.centerX,
          centerY: dim.centerY,
          radius: dim.radius,
          startAngle: dim.startAngle,
          endAngle: dim.endAngle,
          text: dim.text,
          location: dim.location,
          layer: dim.layer,
          color: dim.color,
          dimstyle: dim.dimstyle
        })),
        splines: (parsed.splines || []).map((spline: any) => ({
          controlPoints: spline.controlPoints,
          fitPoints: spline.fitPoints,
          degree: spline.degree,
          closed: spline.closed,
          layer: spline.layer,
          color: spline.color,
          linetype: spline.linetype
        })),
        hatches: (parsed.hatches || []).map((hatch: any) => ({
          pattern: hatch.pattern,
          patternScale: hatch.patternScale,
          patternAngle: hatch.patternAngle,
          color: hatch.color,
          boundaries: hatch.boundaries || [],
          layer: hatch.layer
        })),
        meshes: (parsed.meshes || []).map((mesh: any) => ({
          vertices: mesh.vertices || [],
          faces: mesh.faces || [],
          subdivisionLevels: mesh.subdivisionLevels,
          layer: mesh.layer,
          color: mesh.color
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
        dimensions: [],
        splines: [],
        hatches: [],
        meshes: []
      };
    }
  }

  /**
   * Parse modification response from LLM
   */
  private static parseModificationResponse(response: string): ModificationData {
    try {
      // Clean the response
      let cleanResponse = response.trim();

      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Parse JSON
      const modificationData = JSON.parse(cleanResponse);

      // Validate structure
      if (!modificationData.delete || !modificationData.add) {
        throw new Error('Invalid modification data structure: missing delete or add sections');
      }

      // Ensure delete section has all required arrays
      const deleteSection = {
        lines: modificationData.delete.lines || [],
        circles: modificationData.delete.circles || [],
        arcs: modificationData.delete.arcs || [],
        points: modificationData.delete.points || [],
        dimensions: modificationData.delete.dimensions || [],
        splines: modificationData.delete.splines || [],
        hatches: modificationData.delete.hatches || [],
        meshes: modificationData.delete.meshes || []
      };

      // Ensure add section has all required arrays
      const addSection = {
        title: modificationData.add.title || 'modified_drawing',
        lines: modificationData.add.lines || [],
        circles: modificationData.add.circles || [],
        arcs: modificationData.add.arcs || [],
        points: modificationData.add.points || [],
        dimensions: modificationData.add.dimensions || [],
        splines: modificationData.add.splines || [],
        hatches: modificationData.add.hatches || [],
        meshes: modificationData.add.meshes || []
      };

      return {
        delete: deleteSection,
        add: addSection
      };
    } catch (error) {
      console.error('Error parsing modification response:', error);
      console.error('Raw response:', response);
      throw new Error(`Failed to parse modification response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}
