import { DrawingSpecification, DrawingElement, DimensionElement } from '../components/DrawingSpecificationInterface';

export class DrawingCodeGenerator {
  /**
   * Generate complete Python code from drawing specification
   */
  static generatePythonCode(spec: DrawingSpecification): string {
    const code = [
      this.generateImports(),
      this.generateDocumentSetup(),
      this.generateLayers(spec.layers),
      this.generateDimensionStyle(spec),
      this.generateElements(spec.elements),
      this.generateDimensions(spec.dimensions),
      this.generateSave(spec.title)
    ];

    return code.join('\n\n');
  }

  private static generateImports(): string {
    return `import ezdxf`;
  }

  private static generateDocumentSetup(): string {
    return `# Create document with setup=True for dimension styles
doc = ezdxf.new("R2010", setup=True)
msp = doc.modelspace()`;
  }

  private static generateLayers(layers: { name: string; color: number; lineType?: string }[]): string {
    const layerCode = layers.map(layer => {
      if (layer.lineType) {
        return `doc.layers.add(name="${layer.name}", color=${layer.color}, linetype="${layer.lineType}")`;
      } else {
        return `doc.layers.add(name="${layer.name}", color=${layer.color})`;
      }
    });

    return `# Create layers
${layerCode.join('\n')}`;
  }

  private static generateDimensionStyle(spec: DrawingSpecification): string {
    // Calculate appropriate text height based on drawing scale
    const baseTextHeight = 100;
    const scaledTextHeight = Math.max(50, baseTextHeight / Math.sqrt(spec.scale));
    const arrowSize = Math.max(25, scaledTextHeight * 0.5);

    return `# Configure dimension style for visible text and arrows
dimstyle = doc.dimstyles.get("Standard")
dimstyle.dxf.dimtxt = ${scaledTextHeight}        # Text height
dimstyle.dxf.dimasz = ${arrowSize}         # Arrow size
dimstyle.dxf.dimexe = ${Math.round(arrowSize * 0.5)}         # Extension beyond dimension line
dimstyle.dxf.dimexo = ${Math.round(arrowSize * 0.2)}          # Extension line offset
dimstyle.dxf.dimgap = ${Math.round(arrowSize * 0.2)}         # Gap around text
dimstyle.dxf.dimclrt = 1         # Text color (red)
dimstyle.dxf.dimclrd = 1         # Dimension line color (red)
dimstyle.dxf.dimclre = 1         # Extension line color (red)
dimstyle.dxf.dimtad = 1          # Text above dimension line
dimstyle.dxf.dimjust = 0         # Center text
dimstyle.dxf.dimblk = ""         # Use default arrow blocks
dimstyle.dxf.dimblk1 = ""        # First arrow block
dimstyle.dxf.dimblk2 = ""        # Second arrow block`;
  }

  private static generateElements(elements: DrawingElement[]): string {
    if (elements.length === 0) {
      return '# No elements specified';
    }

    const elementCode = elements.map(element => {
      switch (element.type) {
        case 'line':
          return this.generateLine(element);
        case 'circle':
          return this.generateCircle(element);
        case 'arc':
          return this.generateArc(element);
        case 'rectangle':
          return this.generateRectangle(element);
        case 'polyline':
          return this.generatePolyline(element);
        default:
          return `# Unknown element type: ${element.type}`;
      }
    });

    return `# Add drawing elements
${elementCode.join('\n')}`;
  }

  private static generateLine(element: DrawingElement): string {
    const [start, end] = element.coordinates;
    return `msp.add_line((${start[0]}, ${start[1]}), (${end[0]}, ${end[1]}), dxfattribs={"layer": "${element.properties.layer}"})`;
  }

  private static generateCircle(element: DrawingElement): string {
    const [center] = element.coordinates;
    const radius = element.coordinates[1] ? element.coordinates[1][0] : 100; // Default radius
    return `msp.add_circle((${center[0]}, ${center[1]}), radius=${radius}, dxfattribs={"layer": "${element.properties.layer}"})`;
  }

  private static generateArc(element: DrawingElement): string {
    const [center] = element.coordinates;
    const radius = element.coordinates[1] ? element.coordinates[1][0] : 100;
    const startAngle = element.coordinates[2] ? element.coordinates[2][0] : 0;
    const endAngle = element.coordinates[2] ? element.coordinates[2][1] : 90;
    return `msp.add_arc((${center[0]}, ${center[1]}), radius=${radius}, start_angle=${startAngle}, end_angle=${endAngle}, dxfattribs={"layer": "${element.properties.layer}"})`;
  }

  private static generateRectangle(element: DrawingElement): string {
    const [corner1, corner2] = element.coordinates;
    const points = [
      [corner1[0], corner1[1]],
      [corner2[0], corner1[1]],
      [corner2[0], corner2[1]],
      [corner1[0], corner2[1]]
    ];
    return `msp.add_lwpolyline([${points.map(p => `(${p[0]}, ${p[1]})`).join(', ')}], close=True, dxfattribs={"layer": "${element.properties.layer}"})`;
  }

  private static generatePolyline(element: DrawingElement): string {
    const points = element.coordinates.map(coord => `(${coord[0]}, ${coord[1]})`).join(', ');
    return `msp.add_lwpolyline([${points}], dxfattribs={"layer": "${element.properties.layer}"})`;
  }

  private static generateDimensions(dimensions: DimensionElement[]): string {
    if (dimensions.length === 0) {
      return '# No dimensions specified';
    }

    const dimensionCode = dimensions.map((dimension, index) => {
      switch (dimension.type) {
        case 'linear':
          return this.generateLinearDimension(dimension, index);
        case 'aligned':
          return this.generateAlignedDimension(dimension, index);
        case 'radial':
          return this.generateRadialDimension(dimension, index);
        case 'angular':
          return this.generateAngularDimension(dimension, index);
        default:
          return `# Unknown dimension type: ${dimension.type}`;
      }
    });

    return `# Add dimensions
${dimensionCode.join('\n')}`;
  }

  private static generateLinearDimension(dimension: DimensionElement, index: number): string {
    const [p1, p2] = dimension.points;
    const [baseX, baseY] = dimension.properties.position;
    
    return `dim${index + 1} = msp.add_linear_dim(
    base=(${baseX}, ${baseY}),
    p1=(${p1[0]}, ${p1[1]}),
    p2=(${p2[0]}, ${p2[1]}),
    dimstyle="Standard",
    text="<>",
    dxfattribs={"layer": "${dimension.properties.layer}"}
)
dim${index + 1}.render()`;
  }

  private static generateAlignedDimension(dimension: DimensionElement, index: number): string {
    const [p1, p2] = dimension.points;
    const distance = 200; // Default distance from measured line
    
    return `dim${index + 1} = msp.add_aligned_dim(
    p1=(${p1[0]}, ${p1[1]}),
    p2=(${p2[0]}, ${p2[1]}),
    distance=${distance},
    dimstyle="Standard",
    text="<>",
    dxfattribs={"layer": "${dimension.properties.layer}"}
)
dim${index + 1}.render()`;
  }

  private static generateRadialDimension(dimension: DimensionElement, index: number): string {
    const [center, point] = dimension.points;
    
    return `dim${index + 1} = msp.add_radius_dim(
    center=(${center[0]}, ${center[1]}),
    mpoint=(${point[0]}, ${point[1]}),
    dimstyle="Standard",
    dxfattribs={"layer": "${dimension.properties.layer}"}
)
dim${index + 1}.render()`;
  }

  private static generateAngularDimension(dimension: DimensionElement, index: number): string {
    const [center, p1, p2] = dimension.points;
    
    return `dim${index + 1} = msp.add_angular_dim_3p(
    base=(${center[0]}, ${center[1]}),
    p1=(${p1[0]}, ${p1[1]}),
    p2=(${p2[0]}, ${p2[1]}),
    dimstyle="Standard",
    dxfattribs={"layer": "${dimension.properties.layer}"}
)
dim${index + 1}.render()`;
  }

  private static generateSave(title: string): string {
    const filename = title ? 
      `${title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').toLowerCase()}.dxf` : 
      'drawing.dxf';
    
    return `# Save the drawing
doc.saveas("${filename}")`;
  }

  /**
   * Generate drawing specification from natural language using LLM
   */
  static async generateSpecificationFromDescription(description: string): Promise<DrawingSpecification> {
    // This would use LLM to parse natural language and create structured specification
    // For now, return a basic specification
    return {
      title: 'Generated Drawing',
      scale: 100,
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
}
