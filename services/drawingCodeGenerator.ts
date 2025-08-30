export class DrawingCodeGenerator {
  /**
   * Generate complete Python code from attribute-based specification
   */
  static generatePythonCode(spec: any): string {
    const code = [
      this.generateImports(),
      this.generateDocumentSetup(),
      this.generateStandardLayers(),
      this.generateDimensionStyle(),
      this.generateLines(spec.lines || []),
      this.generateCircles(spec.circles || []),
      this.generateArcs(spec.arcs || []),
      this.generateRectangles(spec.rectangles || []),
      this.generatePolylines(spec.polylines || []),
      this.generateLinearDimensions(spec.linearDimensions || []),
      this.generateRadialDimensions(spec.radialDimensions || []),
      this.generateHatching(spec.hatching || []),
      this.generateSave(spec.title || 'drawing')
    ];

    return code.filter(section => section.trim() !== '').join('\n\n');
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

  private static generateStandardLayers(): string {
    return '# Create standard layers\n' +
           'doc.layers.add(name="CONSTRUCTION", color=7)\n' +
           'doc.layers.add(name="DIMENSIONS", color=1)\n' +
           'doc.layers.add(name="HATCHING", color=2)';
  }

  private static generateDimensionStyle(): string {
    return '# Configure dimension style for VISIBLE text and arrows/ticks\n' +
           'dimstyle = doc.dimstyles.get("Standard")\n' +
           '\n' +
           '# CRITICAL: Text visibility settings\n' +
           'dimstyle.dxf.dimtxt = 250        # Text height (EXTRA LARGE for visibility)\n' +
           'dimstyle.dxf.dimtad = 1          # Text above dimension line\n' +
           'dimstyle.dxf.dimjust = 0         # Center text horizontally\n' +
           'dimstyle.dxf.dimtih = 0          # Keep text horizontal inside\n' +
           'dimstyle.dxf.dimtoh = 0          # Keep text horizontal outside\n' +
           '\n' +
           '# CRITICAL: Arrow/Tick configuration (try arrows first, fallback to ticks)\n' +
           'dimstyle.dxf.dimasz = 100        # Arrow/tick size (LARGE)\n' +
           'dimstyle.dxf.dimtsz = 50         # Tick size (fallback if arrows fail)\n' +
           'dimstyle.dxf.dimblk = ""         # Default arrow block\n' +
           'dimstyle.dxf.dimblk1 = ""        # First arrow block\n' +
           'dimstyle.dxf.dimblk2 = ""        # Second arrow block\n' +
           '\n' +
           '# Extension line settings\n' +
           'dimstyle.dxf.dimexe = 50         # Extension beyond dimension line\n' +
           'dimstyle.dxf.dimexo = 30         # Extension line offset\n' +
           'dimstyle.dxf.dimgap = 30         # Gap around text\n' +
           '\n' +
           '# Color settings for visibility\n' +
           'dimstyle.dxf.dimclrt = 1         # Text color (red)\n' +
           'dimstyle.dxf.dimclrd = 1         # Dimension line color (red)\n' +
           'dimstyle.dxf.dimclre = 1         # Extension line color (red)\n' +
           '\n' +
           '# Force text display\n' +
           'dimstyle.dxf.dimtxsty = "Standard"  # Use standard text style\n' +
           'dimstyle.dxf.dimscale = 1.0      # Overall scale factor\n' +
           'dimstyle.dxf.dimtfac = 1.0       # Text scale factor\n' +
           'dimstyle.dxf.dimlfac = 1.0       # Linear scale factor\n' +
           '\n' +
           '# Ensure dimension values are shown\n' +
           'dimstyle.dxf.dimzin = 0          # Show all zeros\n' +
           'dimstyle.dxf.dimdec = 0          # Decimal places\n' +
           'dimstyle.dxf.dimrnd = 0          # No rounding\n' +
           '\n' +
           '# Alternative: If arrows fail, use oblique strokes (slashes)\n' +
           '# dimstyle.dxf.dimtsz = 100      # Uncomment to force tick marks instead of arrows\n' +
           '\n' +
           '# BACKUP: Create tick-based dimension style if arrows fail\n' +
           'try:\n' +
           '    # Test if arrow style works\n' +
           '    test_dim = msp.add_linear_dim(base=(0, -1000), p1=(0, -1000), p2=(100, -1000), dimstyle="Standard")\n' +
           '    test_dim.render()\n' +
           '    msp.delete_entity(test_dim)\n' +
           'except:\n' +
           '    # If arrows fail, switch to tick marks (slashes)\n' +
           '    dimstyle.dxf.dimtsz = 100     # Force tick marks\n' +
           '    dimstyle.dxf.dimasz = 0       # Disable arrows\n' +
           '    print("Using tick marks instead of arrows for better visibility")';
  }

  private static generateLines(lines: any[]): string {
    if (lines.length === 0) return '';

    const lineCode = lines.map((line, index) => {
      return 'msp.add_line((' + line.startPoint[0] + ', ' + line.startPoint[1] + '), (' +
             line.endPoint[0] + ', ' + line.endPoint[1] + '), dxfattribs={"layer": "' +
             line.layer + '", "color": ' + line.color + '})';
    });

    return '# Add lines\n' + lineCode.join('\n');
  }

  private static generateCircles(circles: any[]): string {
    if (circles.length === 0) return '';

    const circleCode = circles.map((circle, index) => {
      return 'msp.add_circle((' + circle.centerPoint[0] + ', ' + circle.centerPoint[1] + '), radius=' +
             circle.radius + ', dxfattribs={"layer": "' + circle.layer + '", "color": ' + circle.color + '})';
    });

    return '# Add circles\n' + circleCode.join('\n');
  }

  private static generateArcs(arcs: any[]): string {
    if (arcs.length === 0) return '';

    const arcCode = arcs.map((arc, index) => {
      return 'msp.add_arc((' + arc.centerPoint[0] + ', ' + arc.centerPoint[1] + '), radius=' +
             arc.radius + ', start_angle=' + arc.startAngle + ', end_angle=' + arc.endAngle +
             ', dxfattribs={"layer": "' + arc.layer + '", "color": ' + arc.color + '})';
    });

    return '# Add arcs\n' + arcCode.join('\n');
  }

  private static generateRectangles(rectangles: any[]): string {
    if (rectangles.length === 0) return '';

    const rectCode = rectangles.map((rect, index) => {
      const points = [
        '(' + rect.corner1[0] + ', ' + rect.corner1[1] + ')',
        '(' + rect.corner2[0] + ', ' + rect.corner1[1] + ')',
        '(' + rect.corner2[0] + ', ' + rect.corner2[1] + ')',
        '(' + rect.corner1[0] + ', ' + rect.corner2[1] + ')'
      ];
      return 'msp.add_lwpolyline([' + points.join(', ') + '], close=True, dxfattribs={"layer": "' +
             rect.layer + '", "color": ' + rect.color + '})';
    });

    return '# Add rectangles\n' + rectCode.join('\n');
  }

  private static generatePolylines(polylines: any[]): string {
    if (polylines.length === 0) return '';

    const polyCode = polylines.map((poly, index) => {
      const points = poly.points.map((p: number[]) => '(' + p[0] + ', ' + p[1] + ')').join(', ');
      const closeStr = poly.closed ? ', close=True' : '';
      return 'msp.add_lwpolyline([' + points + ']' + closeStr + ', dxfattribs={"layer": "' +
             poly.layer + '", "color": ' + poly.color + '})';
    });

    return '# Add polylines\n' + polyCode.join('\n');
  }

  private static generateLinearDimensions(dimensions: any[]): string {
    if (dimensions.length === 0) return '';

    const dimCode = dimensions.map((dim, index) => {
      const textHeight = dim.textHeight || 250;
      return '# Linear dimension ' + (index + 1) + ' - MUST show measurement value\n' +
             'dim' + (index + 1) + ' = msp.add_linear_dim(\n' +
             '    base=(' + dim.dimensionLinePosition[0] + ', ' + dim.dimensionLinePosition[1] + '),\n' +
             '    p1=(' + dim.point1[0] + ', ' + dim.point1[1] + '),\n' +
             '    p2=(' + dim.point2[0] + ', ' + dim.point2[1] + '),\n' +
             '    dimstyle="Standard",\n' +
             '    text="<>",                    # CRITICAL: Auto measurement text\n' +
             '    dxfattribs={"layer": "' + dim.layer + '", "color": ' + dim.color + '}\n' +
             ')\n' +
             '# CRITICAL: Render dimension to make it visible\n' +
             'dim' + (index + 1) + '.render()\n' +
             '\n' +
             '# Debug: Print dimension info\n' +
             'print(f"Dimension ' + (index + 1) + ' created: {dim' + (index + 1) + '.dxf.measurement} units")\n' +
             'print(f"Dimension ' + (index + 1) + ' text height: {dimstyle.dxf.dimtxt}")';
    });

    return '# Add linear dimensions with VISIBLE text and arrows/ticks\n' + dimCode.join('\n\n');
  }

  private static generateRadialDimensions(dimensions: any[]): string {
    if (dimensions.length === 0) return '';

    const dimCode = dimensions.map((dim, index) => {
      return 'rdim' + (index + 1) + ' = msp.add_radius_dim(\n' +
             '    center=(' + dim.centerPoint[0] + ', ' + dim.centerPoint[1] + '),\n' +
             '    mpoint=(' + dim.radiusPoint[0] + ', ' + dim.radiusPoint[1] + '),\n' +
             '    dimstyle="Standard",\n' +
             '    dxfattribs={"layer": "' + dim.layer + '", "color": ' + dim.color + '}\n' +
             ')\n' +
             'rdim' + (index + 1) + '.render()';
    });

    return '# Add radial dimensions\n' + dimCode.join('\n\n');
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
