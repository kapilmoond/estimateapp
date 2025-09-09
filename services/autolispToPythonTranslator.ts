/**
 * AutoLISP to Python ezdxf Translator
 * Converts AutoLISP drawing commands to Python ezdxf code
 */

export interface AutoLispCommand {
  command: string;
  parameters: any[];
  originalLine: string;
}

export interface TranslationResult {
  pythonCode: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    totalCommands: number;
    translatedCommands: number;
    skippedCommands: number;
    errorCommands: number;
  };
}

export class AutoLispToPythonTranslator {
  private static currentLayer = '0';
  private static currentColor = 7;
  private static currentLinetype = 'CONTINUOUS';

  private static pythonImports = `import ezdxf
from ezdxf import units
from ezdxf.enums import TextEntityAlignment
from ezdxf.math import Vec3
import math

# Create new DXF document
doc = ezdxf.new('R2010')
msp = doc.modelspace()

# Set up layers (check if they exist first)
if 'CONSTRUCTION' not in doc.layers:
    doc.layers.new('CONSTRUCTION', dxfattribs={'color': 1})  # Red
if 'DIMENSIONS' not in doc.layers:
    doc.layers.new('DIMENSIONS', dxfattribs={'color': 5})   # Blue
if 'TEXT' not in doc.layers:
    doc.layers.new('TEXT', dxfattribs={'color': 7})         # Black
if 'CENTERLINES' not in doc.layers:
    doc.layers.new('CENTERLINES', dxfattribs={'color': 3})  # Green

`;

  /**
   * Main translation function
   */
  static translateAutoLispToPython(autolispCode: string): TranslationResult {
    // Reset state for each translation
    this.currentLayer = '0';
    this.currentColor = 7;
    this.currentLinetype = 'CONTINUOUS';

    const result: TranslationResult = {
      pythonCode: '',
      success: false,
      errors: [],
      warnings: [],
      statistics: {
        totalCommands: 0,
        translatedCommands: 0,
        skippedCommands: 0,
        errorCommands: 0
      }
    };

    try {
      // Parse AutoLISP commands
      const commands = this.parseAutoLispCommands(autolispCode);
      result.statistics.totalCommands = commands.length;

      // Generate Python code
      let pythonCode = this.pythonImports;
      
      for (const command of commands) {
        try {
          const translatedCode = this.translateCommand(command);
          if (translatedCode) {
            pythonCode += translatedCode + '\n';
            result.statistics.translatedCommands++;
          } else {
            result.statistics.skippedCommands++;
            result.warnings.push(`Skipped unsupported command: ${command.command}`);
          }
        } catch (error) {
          result.statistics.errorCommands++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`Error translating ${command.command}: ${errorMessage}`);

          // Add helpful context for common errors
          if (errorMessage.includes('Invalid number') || errorMessage.includes('Failed to parse coordinate')) {
            result.errors.push(`  → Command: ${command.originalLine}`);
            result.errors.push(`  → Tip: Ensure all coordinates are pure numbers (e.g., 1000, not "Ø1000")`);
            result.errors.push(`  → Tip: Put text content in quotes (e.g., "Ø1000mm")`);
          }
        }
      }

      // Add save command
      pythonCode += '\n# Save the drawing\ndoc.saveas("technical_drawing.dxf")\n';

      result.pythonCode = pythonCode;
      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Translation failed: ${error}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Parse AutoLISP code into commands
   */
  private static parseAutoLispCommands(autolispCode: string): AutoLispCommand[] {
    const commands: AutoLispCommand[] = [];
    const lines = autolispCode.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';')) continue; // Skip comments and empty lines

      try {
        const command = this.parseAutoLispLine(trimmed);
        if (command) {
          commands.push(command);
        }
      } catch (error) {
        console.warn(`Failed to parse line: ${trimmed}`, error);
      }
    }

    return commands;
  }

  /**
   * Parse a single AutoLISP line
   */
  private static parseAutoLispLine(line: string): AutoLispCommand | null {
    // Remove outer parentheses and split by spaces, handling nested parentheses
    const cleaned = line.replace(/^\(|\)$/g, '').trim();
    if (!cleaned) return null;

    const parts = this.splitAutoLispExpression(cleaned);
    if (parts.length === 0) return null;

    const command = parts[0].toLowerCase();
    const parameters = parts.slice(1);

    return {
      command,
      parameters,
      originalLine: line
    };
  }

  /**
   * Split AutoLISP expression handling nested parentheses and quotes
   */
  private static splitAutoLispExpression(expr: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        current += char;
      } else if (!inQuotes && char === '(') {
        depth++;
        current += char;
      } else if (!inQuotes && char === ')') {
        depth--;
        current += char;
      } else if (!inQuotes && char === ' ' && depth === 0) {
        if (current.trim()) {
          parts.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  /**
   * Translate individual AutoLISP command to Python
   */
  private static translateCommand(command: AutoLispCommand): string | null {
    switch (command.command) {
      case 'line':
        return this.translateLine(command);
      case 'circle':
        return this.translateCircle(command);
      case 'arc':
        return this.translateArc(command);
      case 'polyline':
      case 'lwpolyline':
        return this.translatePolyline(command);
      case 'rectangle':
        return this.translateRectangle(command);
      case 'text':
        return this.translateText(command);
      case 'mtext':
        return this.translateMText(command);
      case 'dimension':
      case 'dimlinear':
        return this.translateDimension(command);
      case 'layer':
        return this.translateLayer(command);
      case 'color':
        return this.translateColor(command);
      case 'linetype':
        return this.translateLinetype(command);
      case 'hatch':
        return this.translateHatch(command);
      case 'spline':
        return this.translateSpline(command);
      case 'block':
        return this.translateBlock(command);
      default:
        return null; // Unsupported command
    }
  }

  /**
   * Translate LINE command
   */
  private static translateLine(command: AutoLispCommand): string {
    if (command.parameters.length < 4) {
      throw new Error('LINE command requires at least 4 parameters (x1 y1 x2 y2)');
    }

    const [x1, y1, x2, y2] = command.parameters.map(p => this.parseNumber(p));

    return `# Line from (${x1}, ${y1}) to (${x2}, ${y2})
msp.add_line((${x1}, ${y1}), (${x2}, ${y2}), dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  /**
   * Translate CIRCLE command
   */
  private static translateCircle(command: AutoLispCommand): string {
    if (command.parameters.length < 3) {
      throw new Error('CIRCLE command requires at least 3 parameters (x y radius)');
    }

    const [x, y, radius] = command.parameters.map(p => this.parseNumber(p));

    return `# Circle at (${x}, ${y}) with radius ${radius}
msp.add_circle((${x}, ${y}), ${radius}, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  /**
   * Translate ARC command
   */
  private static translateArc(command: AutoLispCommand): string {
    if (command.parameters.length < 5) {
      throw new Error('ARC command requires at least 5 parameters (x y radius start_angle end_angle)');
    }

    const [x, y, radius, startAngle, endAngle] = command.parameters.map(p => this.parseNumber(p));
    
    return `# Arc at (${x}, ${y}) with radius ${radius} from ${startAngle}° to ${endAngle}°
msp.add_arc((${x}, ${y}), ${radius}, ${startAngle}, ${endAngle})`;
  }

  /**
   * Translate POLYLINE command
   */
  private static translatePolyline(command: AutoLispCommand): string {
    if (command.parameters.length < 4) {
      throw new Error('POLYLINE command requires at least 4 parameters (2 points minimum)');
    }

    // Parse points from parameters (x1 y1 x2 y2 x3 y3 ...)
    const points: string[] = [];
    for (let i = 0; i < command.parameters.length; i += 2) {
      if (i + 1 < command.parameters.length) {
        const x = this.parseNumber(command.parameters[i]);
        const y = this.parseNumber(command.parameters[i + 1]);
        points.push(`(${x}, ${y})`);
      }
    }

    if (points.length < 2) {
      throw new Error('POLYLINE command requires at least 2 valid points');
    }

    const commandType = command.command === 'lwpolyline' ? 'Lightweight polyline' : 'Polyline';

    return `# ${commandType} with ${points.length} points
points = [${points.join(', ')}]
msp.add_lwpolyline(points, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  /**
   * Translate RECTANGLE command
   */
  private static translateRectangle(command: AutoLispCommand): string {
    if (command.parameters.length < 4) {
      throw new Error('RECTANGLE command requires at least 4 parameters (x1 y1 x2 y2)');
    }

    const [x1, y1, x2, y2] = command.parameters.map(p => this.parseNumber(p));

    return `# Rectangle from (${x1}, ${y1}) to (${x2}, ${y2})
points = [(${x1}, ${y1}), (${x2}, ${y1}), (${x2}, ${y2}), (${x1}, ${y2})]
msp.add_lwpolyline(points, close=True, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  /**
   * Translate TEXT command
   */
  private static translateText(command: AutoLispCommand): string {
    if (command.parameters.length < 4) {
      throw new Error('TEXT command requires at least 4 parameters (x y height text)');
    }

    const x = this.parseNumber(command.parameters[0]);
    const y = this.parseNumber(command.parameters[1]);
    const height = this.parseNumber(command.parameters[2]);
    const text = this.parseString(command.parameters[3]);
    
    return `# Text "${text}" at (${x}, ${y}) with height ${height}
msp.add_text("${text}", dxfattribs={'insert': (${x}, ${y}), 'height': ${height}, 'layer': 'TEXT'})`;
  }

  /**
   * Translate DIMENSION command
   */
  private static translateDimension(command: AutoLispCommand): string {
    if (command.parameters.length < 6) {
      throw new Error('DIMENSION command requires at least 6 parameters (x1 y1 x2 y2 dim_x dim_y [text])');
    }

    // Parse coordinate parameters (first 6 are always coordinates)
    const x1 = this.parseNumberSafe(command.parameters[0]);
    const y1 = this.parseNumberSafe(command.parameters[1]);
    const x2 = this.parseNumberSafe(command.parameters[2]);
    const y2 = this.parseNumberSafe(command.parameters[3]);
    const dimX = this.parseNumberSafe(command.parameters[4]);
    const dimY = this.parseNumberSafe(command.parameters[5]);

    // Check if there's custom dimension text (7th parameter)
    let customText = '';
    if (command.parameters.length > 6) {
      customText = this.parseString(command.parameters[6]);
    }

    let dimensionCode = `# Linear dimension from (${x1}, ${y1}) to (${x2}, ${y2})
dim = msp.add_linear_dim(
    base=(${dimX}, ${dimY}),
    p1=(${x1}, ${y1}),
    p2=(${x2}, ${y2}),
    dxfattribs={'layer': 'DIMENSIONS'}
)`;

    // Add custom text if provided
    if (customText) {
      dimensionCode += `
dim.dxf.text = "${customText}"`;
    }

    dimensionCode += `
dim.render()`;

    return dimensionCode;
  }

  /**
   * Parse number from string, handling various formats
   */
  private static parseNumber(value: string): number {
    const cleaned = value.replace(/[()]/g, '').trim();
    const num = parseFloat(cleaned);
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${value}`);
    }
    return num;
  }

  /**
   * Parse number safely, providing better error context
   */
  private static parseNumberSafe(value: string): number {
    try {
      return this.parseNumber(value);
    } catch (error) {
      throw new Error(`Failed to parse coordinate "${value}" as number. Coordinates must be numeric values, not text or symbols.`);
    }
  }

  /**
   * Parse string from AutoLISP format
   */
  private static parseString(value: string): string {
    return value.replace(/^["']|["']$/g, '').trim();
  }

  /**
   * Translate MTEXT command
   */
  private static translateMText(command: AutoLispCommand): string {
    if (command.parameters.length < 5) {
      throw new Error('MTEXT command requires at least 5 parameters (x y width height text)');
    }

    const x = this.parseNumber(command.parameters[0]);
    const y = this.parseNumber(command.parameters[1]);
    const width = this.parseNumber(command.parameters[2]);
    const height = this.parseNumber(command.parameters[3]);
    const text = this.parseString(command.parameters[4]);

    return `# Multiline text "${text}" at (${x}, ${y}) with width ${width}
msp.add_mtext("${text}", dxfattribs={'insert': (${x}, ${y}), 'width': ${width}, 'height': ${height}, 'layer': 'TEXT'})`;
  }

  /**
   * Translate LINETYPE command
   */
  private static translateLinetype(command: AutoLispCommand): string {
    if (command.parameters.length < 1) {
      throw new Error('LINETYPE command requires linetype name');
    }

    const linetype = this.parseString(command.parameters[0]);
    this.currentLinetype = linetype; // Update current linetype state

    return `# Set current linetype to ${linetype}
# Linetype will be applied to subsequent entities`;
  }

  /**
   * Translate HATCH command
   */
  private static translateHatch(command: AutoLispCommand): string {
    if (command.parameters.length < 3) {
      throw new Error('HATCH command requires at least 3 parameters (pattern x y)');
    }

    const pattern = this.parseString(command.parameters[0]);
    const x = this.parseNumber(command.parameters[1]);
    const y = this.parseNumber(command.parameters[2]);

    return `# Hatch pattern "${pattern}" at (${x}, ${y})
# Note: Hatch patterns require boundary definition in ezdxf
# This is a simplified implementation`;
  }

  /**
   * Translate SPLINE command
   */
  private static translateSpline(command: AutoLispCommand): string {
    if (command.parameters.length < 6) {
      throw new Error('SPLINE command requires at least 6 parameters (3 points minimum)');
    }

    const points: string[] = [];
    for (let i = 0; i < command.parameters.length; i += 2) {
      if (i + 1 < command.parameters.length) {
        const x = this.parseNumber(command.parameters[i]);
        const y = this.parseNumber(command.parameters[i + 1]);
        points.push(`(${x}, ${y})`);
      }
    }

    if (points.length < 3) {
      throw new Error('SPLINE command requires at least 3 valid points');
    }

    return `# Spline through ${points.length} points
fit_points = [${points.join(', ')}]
msp.add_spline(fit_points=fit_points)`;
  }

  /**
   * Translate BLOCK command
   */
  private static translateBlock(command: AutoLispCommand): string {
    if (command.parameters.length < 3) {
      throw new Error('BLOCK command requires at least 3 parameters (name x y)');
    }

    const blockName = this.parseString(command.parameters[0]);
    const x = this.parseNumber(command.parameters[1]);
    const y = this.parseNumber(command.parameters[2]);

    return `# Insert block "${blockName}" at (${x}, ${y})
# Note: Block must be defined separately in ezdxf
# This is a placeholder for block insertion`;
  }

  /**
   * Translate LAYER command
   */
  private static translateLayer(command: AutoLispCommand): string {
    if (command.parameters.length < 1) {
      throw new Error('LAYER command requires layer name');
    }

    const layerName = this.parseString(command.parameters[0]);
    this.currentLayer = layerName; // Update current layer state

    return `# Set current layer to ${layerName}
# Ensure layer exists
if '${layerName}' not in doc.layers:
    doc.layers.new('${layerName}', dxfattribs={'color': ${this.currentColor}})`;
  }

  /**
   * Translate COLOR command
   */
  private static translateColor(command: AutoLispCommand): string {
    if (command.parameters.length < 1) {
      throw new Error('COLOR command requires color value');
    }

    const color = this.parseNumber(command.parameters[0]);
    this.currentColor = color; // Update current color state

    return `# Set current color to ${color}
# Color will be applied to subsequent entities`;
  }
}
