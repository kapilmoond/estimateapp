export class DrawingCodeGenerator {
  /**
   * Generate complete Python code from drawing specification
   */
  static generatePythonCode(spec: any): string {
    const code = [
      this.generateImports(),
      this.generateDocumentSetup(),
      this.generateLayers(spec.layers || []),
      this.generateDimensionStyle(spec),
      this.generateElements(spec.elements || []),
      this.generateDimensions(spec.dimensions || []),
      this.generateHatching(spec.hatching || []),
      this.generateSave(spec.title || 'drawing')
    ];

    return code.join('\n\n');
  }

  private static generateImports(): string {
    return 'import ezdxf';
  }

  private static generateDocumentSetup(): string {
    return '# Create document with setup=True for dimension styles\n' +
           'doc = ezdxf.new("R2010", setup=True)\n' +
           'msp = doc.modelspace()\n' +
           '\n' +
           '# Ensure Standard text style exists and is properly configured\n' +
           'if "Standard" not in doc.styles:\n' +
           '    doc.styles.add("Standard", font="arial.ttf")\n' +
           'text_style = doc.styles.get("Standard")\n' +
           'text_style.dxf.height = 0  # Variable height\n' +
           'text_style.dxf.width = 1.0  # Width factor';
  }

  private static generateLayers(layers: any[]): string {
    const layerCode = layers.map(layer => {
      if (layer.lineType) {
        return 'doc.layers.add(name="' + layer.name + '", color=' + layer.color + ', linetype="' + layer.lineType + '")';
      } else {
        return 'doc.layers.add(name="' + layer.name + '", color=' + layer.color + ')';
      }
    });

    return '# Create layers\n' + layerCode.join('\n');
  }

  private static generateDimensionStyle(spec: any): string {
    // Use larger text height for better visibility
    const baseTextHeight = 200;  // Increased from 100
    const scaledTextHeight = Math.max(100, baseTextHeight / Math.sqrt(spec.scale || 1));
    const arrowSize = Math.max(50, scaledTextHeight * 0.4);

    return '# Configure dimension style for VISIBLE text and arrows\n' +
           'dimstyle = doc.dimstyles.get("Standard")\n' +
           '# CRITICAL: Text visibility settings\n' +
           'dimstyle.dxf.dimtxt = ' + scaledTextHeight + '        # Text height (LARGE for visibility)\n' +
           'dimstyle.dxf.dimasz = ' + arrowSize + '         # Arrow size\n' +
           'dimstyle.dxf.dimexe = ' + Math.round(arrowSize * 0.5) + '         # Extension beyond dimension line\n' +
           'dimstyle.dxf.dimexo = ' + Math.round(arrowSize * 0.3) + '          # Extension line offset\n' +
           'dimstyle.dxf.dimgap = ' + Math.round(arrowSize * 0.3) + '         # Gap around text\n' +
           '# Text positioning and visibility\n' +
           'dimstyle.dxf.dimtad = 1          # Text above dimension line\n' +
           'dimstyle.dxf.dimjust = 0         # Center text horizontally\n' +
           'dimstyle.dxf.dimtih = 0          # Text inside horizontal\n' +
           'dimstyle.dxf.dimtoh = 0          # Text outside horizontal\n' +
           '# Colors for visibility\n' +
           'dimstyle.dxf.dimclrt = 1         # Text color (red)\n' +
           'dimstyle.dxf.dimclrd = 1         # Dimension line color (red)\n' +
           'dimstyle.dxf.dimclre = 1         # Extension line color (red)\n' +
           '# Arrow configuration\n' +
           'dimstyle.dxf.dimblk = ""         # Use default arrow blocks\n' +
           'dimstyle.dxf.dimblk1 = ""        # First arrow block\n' +
           'dimstyle.dxf.dimblk2 = ""        # Second arrow block\n' +
           'dimstyle.dxf.dimtsz = 0          # Use arrows (not ticks)\n' +
           '# Force text display\n' +
           'dimstyle.dxf.dimtxsty = "Standard"  # Use standard text style\n' +
           'dimstyle.dxf.dimscale = 1.0      # Overall scale factor\n' +
           '\n' +
           '# CRITICAL: Force dimension text visibility\n' +
           'dimstyle.dxf.dimtfac = 1.0       # Text scale factor\n' +
           'dimstyle.dxf.dimlfac = 1.0       # Linear scale factor\n' +
           'dimstyle.dxf.dimrnd = 0          # Rounding value\n' +
           'dimstyle.dxf.dimdec = 0          # Decimal places\n' +
           'dimstyle.dxf.dimzin = 0          # Zero suppression';
  }

  private static generateElements(elements: any[]): string {
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
          return '# Unknown element type: ' + element.type;
      }
    });

    return '# Add drawing elements\n' + elementCode.join('\n');
  }

  private static generateLine(element: any): string {
    const [start, end] = element.coordinates;
    return 'msp.add_line((' + start[0] + ', ' + start[1] + '), (' + end[0] + ', ' + end[1] + '), dxfattribs={"layer": "' + element.properties.layer + '"})';
  }

  private static generateCircle(element: any): string {
    const [center] = element.coordinates;
    const radius = element.coordinates[1] ? element.coordinates[1][0] : 100;
    return 'msp.add_circle((' + center[0] + ', ' + center[1] + '), radius=' + radius + ', dxfattribs={"layer": "' + element.properties.layer + '"})';
  }

  private static generateArc(element: any): string {
    const [center] = element.coordinates;
    const radius = element.coordinates[1] ? element.coordinates[1][0] : 100;
    const startAngle = element.coordinates[2] ? element.coordinates[2][0] : 0;
    const endAngle = element.coordinates[2] ? element.coordinates[2][1] : 90;
    return 'msp.add_arc((' + center[0] + ', ' + center[1] + '), radius=' + radius + ', start_angle=' + startAngle + ', end_angle=' + endAngle + ', dxfattribs={"layer": "' + element.properties.layer + '"})';
  }

  private static generateRectangle(element: any): string {
    const [corner1, corner2] = element.coordinates;
    const points = [
      [corner1[0], corner1[1]],
      [corner2[0], corner1[1]],
      [corner2[0], corner2[1]],
      [corner1[0], corner2[1]]
    ];
    const pointsStr = points.map(p => '(' + p[0] + ', ' + p[1] + ')').join(', ');
    return 'msp.add_lwpolyline([' + pointsStr + '], close=True, dxfattribs={"layer": "' + element.properties.layer + '"})';
  }

  private static generatePolyline(element: any): string {
    const pointsStr = element.coordinates.map((coord: number[]) => '(' + coord[0] + ', ' + coord[1] + ')').join(', ');
    return 'msp.add_lwpolyline([' + pointsStr + '], dxfattribs={"layer": "' + element.properties.layer + '"})';
  }

  private static generateDimensions(dimensions: any[]): string {
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
          return '# Unknown dimension type: ' + dimension.type;
      }
    });

    return '# Add dimensions\n' + dimensionCode.join('\n');
  }

  private static generateLinearDimension(dimension: any, index: number): string {
    const [p1, p2] = dimension.measurePoints;
    const [baseX, baseY] = dimension.dimensionLinePosition;
    
    return 'dim' + (index + 1) + ' = msp.add_linear_dim(\n' +
           '    base=(' + baseX + ', ' + baseY + '),\n' +
           '    p1=(' + p1[0] + ', ' + p1[1] + '),\n' +
           '    p2=(' + p2[0] + ', ' + p2[1] + '),\n' +
           '    dimstyle="Standard",\n' +
           '    text="<>",\n' +
           '    dxfattribs={"layer": "' + (dimension.properties.layer || 'DIMENSIONS') + '"}\n' +
           ')\n' +
           'dim' + (index + 1) + '.render()';
  }

  private static generateAlignedDimension(dimension: any, index: number): string {
    const [p1, p2] = dimension.measurePoints;
    const distance = 200;
    
    return 'dim' + (index + 1) + ' = msp.add_aligned_dim(\n' +
           '    p1=(' + p1[0] + ', ' + p1[1] + '),\n' +
           '    p2=(' + p2[0] + ', ' + p2[1] + '),\n' +
           '    distance=' + distance + ',\n' +
           '    dimstyle="Standard",\n' +
           '    text="<>",\n' +
           '    dxfattribs={"layer": "' + (dimension.properties.layer || 'DIMENSIONS') + '"}\n' +
           ')\n' +
           'dim' + (index + 1) + '.render()';
  }

  private static generateRadialDimension(dimension: any, index: number): string {
    const [center, point] = dimension.measurePoints;
    
    return 'dim' + (index + 1) + ' = msp.add_radius_dim(\n' +
           '    center=(' + center[0] + ', ' + center[1] + '),\n' +
           '    mpoint=(' + point[0] + ', ' + point[1] + '),\n' +
           '    dimstyle="Standard",\n' +
           '    dxfattribs={"layer": "' + (dimension.properties.layer || 'DIMENSIONS') + '"}\n' +
           ')\n' +
           'dim' + (index + 1) + '.render()';
  }

  private static generateAngularDimension(dimension: any, index: number): string {
    const [center, p1, p2] = dimension.measurePoints;
    
    return 'dim' + (index + 1) + ' = msp.add_angular_dim_3p(\n' +
           '    base=(' + center[0] + ', ' + center[1] + '),\n' +
           '    p1=(' + p1[0] + ', ' + p1[1] + '),\n' +
           '    p2=(' + p2[0] + ', ' + p2[1] + '),\n' +
           '    dimstyle="Standard",\n' +
           '    dxfattribs={"layer": "' + (dimension.properties.layer || 'DIMENSIONS') + '"}\n' +
           ')\n' +
           'dim' + (index + 1) + '.render()';
  }

  private static generateHatching(hatching: any[]): string {
    if (hatching.length === 0) {
      return '# No hatching specified';
    }

    const hatchCode = hatching.map((hatch, index) => {
      const points = hatch.boundaryPoints.map((p: number[]) => '(' + p[0] + ', ' + p[1] + ')').join(', ');
      
      return 'hatch' + (index + 1) + ' = msp.add_hatch(dxfattribs={"layer": "' + (hatch.properties.layer || 'HATCHING') + '"})\n' +
             'hatch' + (index + 1) + '.set_pattern_fill("' + hatch.pattern + '", scale=' + hatch.scale + ', angle=' + hatch.angle + ')\n' +
             'hatch' + (index + 1) + '.paths.add_polyline_path([' + points + '], is_closed=True)';
    });

    return '# Add hatching\n' + hatchCode.join('\n');
  }

  private static generateSave(title: string): string {
    const filename = title ? 
      title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').toLowerCase() + '.dxf' : 
      'drawing.dxf';
    
    return '# Save the drawing\ndoc.saveas("' + filename + '")';
  }
}
