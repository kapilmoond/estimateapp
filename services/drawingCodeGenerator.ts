import { DrawingSettings } from '../components/DrawingSettingsPanel';
import { DrawingSettingsService } from './drawingSettingsService';

export class DrawingCodeGenerator {
  /**
   * Generate complete Python code from attribute-based specification
   */
  static generatePythonCode(spec: any, settings?: DrawingSettings): string {
    const drawingSettings = settings || DrawingSettingsService.loadSettings();

    // Geometry from grouped arrays
    const geomSections = [
      this.generateLines(spec.lines || []),
      this.generateCircles(spec.circles || []),
      this.generateArcs(spec.arcs || []),
      this.generateRectangles(spec.rectangles || []),
      this.generatePolylines(spec.polylines || [])
    ];
    const geomGrouped = geomSections.filter(s => s.trim() !== '').join('\n\n');

    // Fallback geometry from unified elements
    const geomFromElements = (!geomGrouped && Array.isArray(spec.elements) && spec.elements.length > 0)
      ? this.generateElements(spec.elements)
      : '';

    // Dimensions from grouped arrays
    const dimSections = [
      this.generateLinearDimensions(spec.linearDimensions || []),
      this.generateRadialDimensions(spec.radialDimensions || [])
    ];
    const dimsGrouped = dimSections.filter(s => s.trim() !== '').join('\n\n');

    // Fallback dimensions from unified dimensions
    const dimsFromUnified = (!dimsGrouped && Array.isArray(spec.dimensions) && spec.dimensions.length > 0)
      ? this.generateDimensions(spec.dimensions)
      : '';

    const code = [
      this.generateImports(),
      this.generateDocumentSetup(drawingSettings),
      this.generateLayers(drawingSettings),
      this.generateDimensionStyle(drawingSettings),
      geomGrouped,
      geomFromElements,
      dimsGrouped,
      dimsFromUnified,
      this.generateHatching(spec.hatching || []),
      this.generateSave(spec.title || 'drawing')
    ];

    return code.filter(section => section.trim() !== '').join('\n\n');
  }

  private static generateImports(): string {
    return 'import ezdxf';
  }

  private static generateDocumentSetup(settings: DrawingSettings): string {
    return '# Create document with setup=True for dimension styles\n' +
           'doc = ezdxf.new("' + settings.documentFormat + '", setup=True)\n' +
           'msp = doc.modelspace()\n' +
           '\n' +
           '# Set drawing units (INSUNITS)\n' +
           'units_map = {"mm": 4, "m": 6, "inches": 1, "feet": 2}\n' +
           'doc.header["$INSUNITS"] = units_map.get("' + settings.units + '", 4)\n' +
           '\n' +
           '# Configure text style from settings\n' +
           'if "Standard" not in doc.styles:\n' +
           '    doc.styles.add("Standard", font="' + settings.text.fontName + '")\n' +
           'text_style = doc.styles.get("Standard")\n' +
           'text_style.dxf.height = 0  # Variable height\n' +
           'text_style.dxf.width = ' + settings.text.widthFactor + '  # Width factor\n' +
           'text_style.dxf.oblique = ' + (settings.text.obliqueAngle * Math.PI / 180) + '  # Oblique angle in radians';
  }

  private static generateLayers(settings: DrawingSettings): string {
    const layers = settings.layers;
    return '# Create layers from settings with safe add\n' +
           'def ensure_layer(name, color, linetype):\n' +
           '    try:\n' +
           '        doc.layers.add(name=name, color=color, linetype=linetype)\n' +
           '    except Exception:\n' +
           '        pass\n' +
           '    return doc.layers.get(name)\n' +
           'lyr_con = ensure_layer("' + layers.construction.name + '", ' + layers.construction.color + ', "' + layers.construction.lineType + '")\n' +
           'lyr_dim = ensure_layer("' + layers.dimensions.name + '", ' + layers.dimensions.color + ', "' + layers.dimensions.lineType + '")\n' +
           'lyr_hat = ensure_layer("' + layers.hatching.name + '", ' + layers.hatching.color + ', "' + layers.hatching.lineType + '")\n' +
           'lyr_txt = ensure_layer("' + layers.text.name + '", ' + layers.text.color + ', "' + layers.text.lineType + '")\n' +
           '\n' +
           '# Apply default lineweight to layers if possible\n' +
           'try:\n' +
           '    lw = ' + settings.lines.defaultLineWeight + '\n' +
           '    for lyr in (lyr_con, lyr_dim, lyr_hat, lyr_txt):\n' +
           '        lyr.dxf.lineweight = lw\n' +
           'except Exception:\n' +
           '    pass';
  }

  private static generateDimensionStyle(settings: DrawingSettings): string {
    const dim = settings.dimensions;
    const layers = settings.layers;

    // Determine text position value
    const textPosValue = dim.textPosition === 'above' ? 1 : dim.textPosition === 'below' ? 2 : 0;
    const textAlignValue = dim.textAlignment === 'left' ? 1 : dim.textAlignment === 'right' ? 2 : 0;

    let arrowConfig = '';
    if (dim.arrowType === 'arrows') {
      arrowConfig = 'dimstyle.dxf.dimasz = ' + dim.arrowSize + '         # Arrow size\n' +
                   'dimstyle.dxf.dimtsz = 0          # No tick marks\n';
    } else if (dim.arrowType === 'ticks') {
      arrowConfig = 'dimstyle.dxf.dimasz = 0          # No arrows\n' +
                   'dimstyle.dxf.dimtsz = ' + dim.tickSize + '         # Tick size\n';
    } else {
      // Auto mode - try arrows with tick fallback
      arrowConfig = 'dimstyle.dxf.dimasz = ' + dim.arrowSize + '         # Arrow size\n' +
                   'dimstyle.dxf.dimtsz = ' + dim.tickSize + '         # Tick size (fallback)\n';
    }

    return '# Configure dimension style from user settings\n' +
           'style_name = ' + '"' + dim.styleName + '"' + '\n' +
           'if style_name not in doc.dimstyles:\n' +
           '    doc.dimstyles.new(style_name)\n' +
           'dimstyle = doc.dimstyles.get(style_name)\n' +
           '\n' +
           '# Text settings from user preferences\n' +
           'dimstyle.dxf.dimtxt = ' + dim.textHeight + '        # Text height from settings\n' +
           'dimstyle.dxf.dimtad = ' + textPosValue + '          # Text position: ' + dim.textPosition + '\n' +
           'dimstyle.dxf.dimjust = ' + textAlignValue + '         # Text alignment: ' + dim.textAlignment + '\n' +
           'dimstyle.dxf.dimtih = 0          # Keep text horizontal inside\n' +
           'dimstyle.dxf.dimtoh = 0          # Keep text horizontal outside\n' +
           '\n' +
           '# Arrow/Tick configuration from settings\n' +
           arrowConfig +
           'dimstyle.dxf.dimblk = ""         # Default arrow block\n' +
           'dimstyle.dxf.dimblk1 = ""        # First arrow block\n' +
           'dimstyle.dxf.dimblk2 = ""        # Second arrow block\n' +
           '\n' +
           '# Extension line settings from user preferences\n' +
           'dimstyle.dxf.dimexe = ' + dim.extensionBeyond + '         # Extension beyond dimension line\n' +
           'dimstyle.dxf.dimexo = ' + dim.extensionOffset + '         # Extension line offset\n' +
           'dimstyle.dxf.dimgap = ' + dim.textGap + '         # Gap around text\n' +
           '\n' +
           '# Color settings from layer configuration\n' +
           'dimstyle.dxf.dimclrt = ' + layers.dimensions.color + '         # Text color from layer\n' +
           'dimstyle.dxf.dimclrd = ' + layers.dimensions.color + '         # Dimension line color\n' +
           'dimstyle.dxf.dimclre = ' + layers.dimensions.color + '         # Extension line color\n' +
           '\n' +
           '# Text formatting from settings\n' +
           'dimstyle.dxf.dimtxsty = "Standard"  # Use configured text style\n' +
           'dimstyle.dxf.dimscale = ' + (1.0 / settings.scale) + '      # Scale factor\n' +
           'dimstyle.dxf.dimtfac = 1.0       # Text scale factor\n' +
           'dimstyle.dxf.dimlfac = 1.0       # Linear scale factor\n' +
           '\n' +
           '# Number formatting from settings\n' +
           'dimstyle.dxf.dimzin = ' + (dim.suppressZeros ? 8 : 0) + '          # Zero suppression\n' +
           'dimstyle.dxf.dimdec = ' + dim.decimalPlaces + '          # Decimal places\n' +
           'dimstyle.dxf.dimrnd = ' + dim.roundingValue + '          # Rounding value\n' +
           (dim.arrowType === 'auto' ? '\n' +
           '# Auto mode: Fallback to tick marks if arrows fail\n' +
           'try:\n' +
           '    test_dim = msp.add_linear_dim(base=(0, -1000), p1=(0, -1000), p2=(100, -1000), dimstyle=style_name)\n' +
           '    test_dim.render()\n' +
           '    msp.delete_entity(test_dim)\n' +
           'except:\n' +
           '    dimstyle.dxf.dimtsz = ' + dim.tickSize + '     # Force tick marks\n' +
           '    dimstyle.dxf.dimasz = 0       # Disable arrows\n' +
           '    print("Using tick marks instead of arrows for better visibility")' : '') + '\n' +
           '# Global drawing defaults\n' +
           'default_lineweight = ' + settings.lines.defaultLineWeight + '';
  }

  private static generateLines(lines: any[]): string {
    if (lines.length === 0) return '';

    const lineCode = lines.map((line, index) => {
      return 'msp.add_line((' + line.startPoint[0] + ', ' + line.startPoint[1] + '), (' +
             line.endPoint[0] + ', ' + line.endPoint[1] + '), dxfattribs={"layer": "' +
             line.layer + '", "color": ' + line.color + ', "lineweight": default_lineweight})';
    });

    return '# Add lines\n' + lineCode.join('\n');
  }

  private static generateCircles(circles: any[]): string {
    if (circles.length === 0) return '';

    const circleCode = circles.map((circle, index) => {
      return 'msp.add_circle((' + circle.centerPoint[0] + ', ' + circle.centerPoint[1] + '), radius=' +
             circle.radius + ', dxfattribs={"layer": "' + circle.layer + '", "color": ' + circle.color + ', "lineweight": default_lineweight})';
    });

    return '# Add circles\n' + circleCode.join('\n');
  }

  private static generateArcs(arcs: any[]): string {
    if (arcs.length === 0) return '';

    const arcCode = arcs.map((arc, index) => {
      return 'msp.add_arc((' + arc.centerPoint[0] + ', ' + arc.centerPoint[1] + '), radius=' +
             arc.radius + ', start_angle=' + arc.startAngle + ', end_angle=' + arc.endAngle +
             ', dxfattribs={"layer": "' + arc.layer + '", "color": ' + arc.color + ', "lineweight": default_lineweight})';
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
             rect.layer + '", "color": ' + rect.color + ', "lineweight": default_lineweight})';
    });

    return '# Add rectangles\n' + rectCode.join('\n');
  }

  private static generatePolylines(polylines: any[]): string {
    if (polylines.length === 0) return '';

    const polyCode = polylines.map((poly, index) => {
      const points = poly.points.map((p: number[]) => '(' + p[0] + ', ' + p[1] + ')').join(', ');
      const closeStr = poly.closed ? ', close=True' : '';
      return 'msp.add_lwpolyline([' + points + ']' + closeStr + ', dxfattribs={"layer": "' +
             poly.layer + '", "color": ' + poly.color + ', "lineweight": default_lineweight})';
    });

    return '# Add polylines\n' + polyCode.join('\n');
  }

  private static generateLinearDimensions(dimensions: any[]): string {
    if (dimensions.length === 0) return '';

    const dimCode = dimensions.map((dim, index) => {
      return '# Linear dimension ' + (index + 1) + ' - MUST show measurement value\n' +
             'dim' + (index + 1) + ' = msp.add_linear_dim(\n' +
             '    base=(' + dim.dimensionLinePosition[0] + ', ' + dim.dimensionLinePosition[1] + '),\n' +
             '    p1=(' + dim.point1[0] + ', ' + dim.point1[1] + '),\n' +
             '    p2=(' + dim.point2[0] + ', ' + dim.point2[1] + '),\n' +
             '    dimstyle=style_name,\n' +
             '    text="<>",                    # CRITICAL: Auto measurement text\n' +
             '    dxfattribs={"layer": "' + dim.layer + '", "color": ' + dim.color + '}\n' +
             ')\n' +
             '# CRITICAL: Render dimension to make it visible\n' +
             'dim' + (index + 1) + '.render()';
    });

    return '# Add linear dimensions with VISIBLE text and arrows/ticks\n' + dimCode.join('\n\n');
  }

  private static generateElements(elements: any[]): string {
    if (!elements || elements.length === 0) return '';
    const parts: string[] = [];
    elements.forEach((el) => {
      switch (el.type) {
        case 'line':
          parts.push(this.generateLine(el));
          break;
        case 'circle':
          parts.push(this.generateCircle(el));
          break;
        case 'arc':
          parts.push(this.generateArc(el));
          break;
        case 'rectangle':
          parts.push(this.generateRectangle(el));
          break;
        case 'polyline':
          parts.push(this.generatePolyline(el));
          break;
        default:
          parts.push('# Unsupported element type: ' + el.type);
      }
    });
    return '# Add elements (fallback)\n' + parts.join('\n');
  }

  private static generateRadialDimensions(dimensions: any[]): string {
    if (dimensions.length === 0) return '';

    const dimCode = dimensions.map((dim, index) => {
      return 'rdim' + (index + 1) + ' = msp.add_radius_dim(\n' +
             '    center=(' + dim.centerPoint[0] + ', ' + dim.centerPoint[1] + '),\n' +
             '    mpoint=(' + dim.radiusPoint[0] + ', ' + dim.radiusPoint[1] + '),\n' +
             '    dimstyle=style_name,\n' +
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
    const pts = dimension.measurePoints || dimension.points || dimension.coordinates || [];
    const p1 = Array.isArray(pts[0]) ? pts[0] : [0, 0];
    const p2 = Array.isArray(pts[1]) ? pts[1] : [100, 0];
    const base = dimension.dimensionLinePosition || dimension.properties?.position || [
      (p1[0] + p2[0]) / 2,
      (p1[1] + p2[1]) / 2 + 200
    ];
    const layer = (dimension.properties && dimension.properties.layer) ? dimension.properties.layer : 'DIMENSIONS';

    return 'dim' + (index + 1) + ' = msp.add_linear_dim(\n' +
           '    base=(' + base[0] + ', ' + base[1] + '),\n' +
           '    p1=(' + p1[0] + ', ' + p1[1] + '),\n' +
           '    p2=(' + p2[0] + ', ' + p2[1] + '),\n' +
           '    dimstyle=style_name,\n' +
           '    text="<>",\n' +
           '    dxfattribs={"layer": "' + layer + '"}\n' +
           ')\n' +
           'dim' + (index + 1) + '.render()';
  }

  private static generateAlignedDimension(dimension: any, index: number): string {
    const pts = dimension.measurePoints || dimension.points || dimension.coordinates || [];
    const p1 = Array.isArray(pts[0]) ? pts[0] : [0, 0];
    const p2 = Array.isArray(pts[1]) ? pts[1] : [100, 0];
    const distance = (dimension.properties && typeof dimension.properties.distance === 'number')
      ? dimension.properties.distance
      : (typeof dimension.distance === 'number' ? dimension.distance : 200);
    const layer = (dimension.properties && dimension.properties.layer) ? dimension.properties.layer : 'DIMENSIONS';

    return 'dim' + (index + 1) + ' = msp.add_aligned_dim(\n' +
           '    p1=(' + p1[0] + ', ' + p1[1] + '),\n' +
           '    p2=(' + p2[0] + ', ' + p2[1] + '),\n' +
           '    distance=' + distance + ',\n' +
           '    dimstyle=style_name,\n' +
           '    text="<>",\n' +
           '    dxfattribs={"layer": "' + layer + '"}\n' +
           ')\n' +
           'dim' + (index + 1) + '.render()';
  }

  private static generateRadialDimension(dimension: any, index: number): string {
    const pts = dimension.measurePoints || dimension.points || dimension.coordinates || [];
    const center = Array.isArray(pts[0]) ? pts[0] : (dimension.center || [0, 0]);
    const mpoint = Array.isArray(pts[1]) ? pts[1] : [100, 0];
    const layer = (dimension.properties && dimension.properties.layer) ? dimension.properties.layer : 'DIMENSIONS';

    return 'dim' + (index + 1) + ' = msp.add_radius_dim(\n' +
           '    center=(' + center[0] + ', ' + center[1] + '),\n' +
           '    mpoint=(' + mpoint[0] + ', ' + mpoint[1] + '),\n' +
           '    dimstyle=style_name,\n' +
           '    dxfattribs={"layer": "' + layer + '"}\n' +
           ')\n' +
           'dim' + (index + 1) + '.render()';
  }

  private static generateAngularDimension(dimension: any, index: number): string {
    const pts = dimension.measurePoints || dimension.points || dimension.coordinates || [];
    const center = Array.isArray(pts[0]) ? pts[0] : (dimension.center || [0, 0]);
    const p1 = Array.isArray(pts[1]) ? pts[1] : [100, 0];
    const p2 = Array.isArray(pts[2]) ? pts[2] : [0, 100];
    const layer = (dimension.properties && dimension.properties.layer) ? dimension.properties.layer : 'DIMENSIONS';

    return 'dim' + (index + 1) + ' = msp.add_angular_dim_3p(\n' +
           '    base=(' + center[0] + ', ' + center[1] + '),\n' +
           '    p1=(' + p1[0] + ', ' + p1[1] + '),\n' +
           '    p2=(' + p2[0] + ', ' + p2[1] + '),\n' +
           '    dimstyle=style_name,\n' +
           '    dxfattribs={"layer": "' + layer + '"}\n' +
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
