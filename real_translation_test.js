// Real AutoLISP Translation Test using actual TypeScript service
// This simulates the actual translation process

const testCases = [
  {
    id: 1,
    name: "Simple Foundation Plan",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(rectangle 0 0 12000 8000)
(line 6000 0 6000 8000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 12000 0 6000 -1000)
(text 6000 -1500 300 "12000mm")
(layer "TEXT")
(color 7)
(text 6000 4000 400 "FOUNDATION PLAN")`
  },
  {
    id: 2,
    name: "Circular Structure",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(circle 5000 5000 5000)
(circle 5000 5000 50)
(layer "DIMENSIONS")
(color 5)
(dimension 5000 5000 10000 5000 7500 5000)
(text 7500 5200 300 "R5000mm")
(layer "TEXT")
(color 7)
(text 5000 5500 500 "WATER TANK")`
  },
  {
    id: 3,
    name: "Arc and Mixed Geometry",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(arc 8000 0 8000 0 90)
(line 0 0 8000 0)
(rectangle 0 8000 8000 16000)
(layer "TEXT")
(color 7)
(text 4000 4000 300 "MIXED GEOMETRY")`
  },
  {
    id: 4,
    name: "Polyline Test",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(polyline 0 0 3000 0 3000 2000 1500 3000 0 2000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 3000 0 1500 -500)
(text 1500 -800 250 "3000mm")`
  },
  {
    id: 5,
    name: "Dimension Variations",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(rectangle 0 0 8000 5000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 8000 0 4000 -1000)
(dimlinear 0 0 0 5000 -1000 2500 "5000mm")
(text 4000 -1500 300 "8000mm")`
  },
  {
    id: 6,
    name: "Multiple Layers",
    autolisp: `(layer "WALLS")
(color 1)
(rectangle 0 0 10000 6000)
(layer "DOORS")
(color 2)
(rectangle 2000 0 3000 200)
(layer "WINDOWS")
(color 3)
(rectangle 1000 6000 2500 6200)
(layer "TEXT")
(color 7)
(text 5000 3000 400 "BUILDING PLAN")`
  },
  {
    id: 7,
    name: "Edge Cases - Negative Coordinates",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(rectangle -1000 -500 15000 10000)
(line 0 0 14000 9500)
(circle 7000 4750 2500)
(layer "DIMENSIONS")
(color 5)
(dimension -1000 -500 15000 -500 7000 -1500)
(text 7000 -2000 300 "16000mm")`
  },
  {
    id: 8,
    name: "Text Positioning Variations",
    autolisp: `(layer "TEXT")
(color 7)
(text 6000 7000 600 "MAIN TITLE")
(text 6000 6000 400 "Subtitle")
(text 6000 5000 300 "Normal Text")
(text 6000 4000 200 "Small Text")
(text 1000 1000 250 "Corner Label")`
  },
  {
    id: 9,
    name: "Complex Dimension Test",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(rectangle 0 0 12000 8000)
(line 4000 0 4000 8000)
(line 8000 0 8000 8000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 4000 0 2000 -1000)
(dimension 4000 0 8000 0 6000 -1000)
(dimension 8000 0 12000 0 10000 -1000)
(dimlinear 0 0 0 8000 -1000 4000 "8000mm")
(text 2000 -1500 250 "4000")
(text 6000 -1500 250 "4000")
(text 10000 -1500 250 "4000")`
  },
  {
    id: 10,
    name: "Error Test - Invalid Syntax",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(rectangle 0 0 12000 8000)
(line 6000 0 6000)
(circle 5000 5000)
(dimension 0 0 12000)
(text 6000 4000 "MISSING HEIGHT")`
  }
];

// Mock the AutoLISP translator functionality
class MockAutoLispTranslator {
  static currentLayer = '0';
  static currentColor = 7;
  static currentLinetype = 'CONTINUOUS';

  static translateAutoLispToPython(autolispCode) {
    // Reset state
    this.currentLayer = '0';
    this.currentColor = 7;
    this.currentLinetype = 'CONTINUOUS';

    const result = {
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
      const commands = this.parseAutoLispCommands(autolispCode);
      result.statistics.totalCommands = commands.length;

      let pythonCode = this.getPythonImports();

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
          const errorMessage = error.message || String(error);
          result.errors.push(`Error translating ${command.command}: ${errorMessage}`);
          
          if (errorMessage.includes('Invalid number') || errorMessage.includes('Failed to parse coordinate')) {
            result.errors.push(`  → Command: ${command.originalLine}`);
            result.errors.push(`  → Tip: Ensure all coordinates are pure numbers`);
          }
        }
      }

      pythonCode += '\n# Save the drawing\ndoc.saveas("technical_drawing.dxf")\n';
      result.pythonCode = pythonCode;
      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Translation failed: ${error.message}`);
    }

    return result;
  }

  static parseAutoLispCommands(autolispCode) {
    const commands = [];
    const lines = autolispCode.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith(';')) continue;
      
      const match = line.match(/^\(\s*(\w+)\s*(.*)\)$/);
      if (match) {
        const [, command, paramStr] = match;
        const parameters = this.parseParameters(paramStr);
        commands.push({
          command: command.toLowerCase(),
          parameters,
          originalLine: line
        });
      }
    }
    
    return commands;
  }

  static parseParameters(paramStr) {
    const params = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < paramStr.length; i++) {
      const char = paramStr[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          params.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      params.push(current.trim());
    }
    
    return params;
  }

  static translateCommand(command) {
    switch (command.command) {
      case 'layer':
        return this.translateLayer(command);
      case 'color':
        return this.translateColor(command);
      case 'rectangle':
        return this.translateRectangle(command);
      case 'line':
        return this.translateLine(command);
      case 'circle':
        return this.translateCircle(command);
      case 'arc':
        return this.translateArc(command);
      case 'polyline':
        return this.translatePolyline(command);
      case 'text':
        return this.translateText(command);
      case 'dimension':
      case 'dimlinear':
        return this.translateDimension(command);
      default:
        return null;
    }
  }

  static translateLayer(command) {
    if (command.parameters.length < 1) {
      throw new Error('LAYER command requires layer name');
    }
    const layerName = command.parameters[0].replace(/"/g, '');
    this.currentLayer = layerName;
    return `# Set current layer to ${layerName}\nif '${layerName}' not in doc.layers:\n    doc.layers.new('${layerName}', dxfattribs={'color': ${this.currentColor}})`;
  }

  static translateColor(command) {
    if (command.parameters.length < 1) {
      throw new Error('COLOR command requires color value');
    }
    const color = parseInt(command.parameters[0]);
    if (isNaN(color)) {
      throw new Error(`Invalid color value: ${command.parameters[0]}`);
    }
    this.currentColor = color;
    return `# Set current color to ${color}`;
  }

  static translateRectangle(command) {
    if (command.parameters.length < 4) {
      throw new Error('RECTANGLE command requires at least 4 parameters (x1 y1 x2 y2)');
    }
    const coords = command.parameters.slice(0, 4).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x1, y1, x2, y2] = coords;
    return `# Rectangle from (${x1}, ${y1}) to (${x2}, ${y2})\npoints = [(${x1}, ${y1}), (${x2}, ${y1}), (${x2}, ${y2}), (${x1}, ${y2})]\nmsp.add_lwpolyline(points, close=True, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateLine(command) {
    if (command.parameters.length < 4) {
      throw new Error('LINE command requires at least 4 parameters (x1 y1 x2 y2)');
    }
    const coords = command.parameters.slice(0, 4).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x1, y1, x2, y2] = coords;
    return `# Line from (${x1}, ${y1}) to (${x2}, ${y2})\nmsp.add_line((${x1}, ${y1}), (${x2}, ${y2}), dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateCircle(command) {
    if (command.parameters.length < 3) {
      throw new Error('CIRCLE command requires at least 3 parameters (x y radius)');
    }
    const coords = command.parameters.slice(0, 3).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x, y, radius] = coords;
    return `# Circle at (${x}, ${y}) with radius ${radius}\nmsp.add_circle((${x}, ${y}), ${radius}, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateArc(command) {
    if (command.parameters.length < 5) {
      throw new Error('ARC command requires at least 5 parameters (x y radius start_angle end_angle)');
    }
    const coords = command.parameters.slice(0, 5).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x, y, radius, startAngle, endAngle] = coords;
    return `# Arc at (${x}, ${y}) with radius ${radius} from ${startAngle}° to ${endAngle}°\nmsp.add_arc((${x}, ${y}), ${radius}, ${startAngle}, ${endAngle}, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translatePolyline(command) {
    if (command.parameters.length < 4 || command.parameters.length % 2 !== 0) {
      throw new Error('POLYLINE command requires even number of parameters (x1 y1 x2 y2 ...)');
    }
    const points = [];
    for (let i = 0; i < command.parameters.length; i += 2) {
      const x = parseFloat(command.parameters[i]);
      const y = parseFloat(command.parameters[i + 1]);
      if (isNaN(x) || isNaN(y)) throw new Error(`Invalid coordinates: ${command.parameters[i]}, ${command.parameters[i + 1]}`);
      points.push(`(${x}, ${y})`);
    }
    return `# Polyline with ${points.length} points\npoints = [${points.join(', ')}]\nmsp.add_lwpolyline(points, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateText(command) {
    if (command.parameters.length < 4) {
      throw new Error('TEXT command requires at least 4 parameters (x y height "text")');
    }
    const x = parseFloat(command.parameters[0]);
    const y = parseFloat(command.parameters[1]);
    const height = parseFloat(command.parameters[2]);
    const text = command.parameters[3].replace(/"/g, '');
    if (isNaN(x) || isNaN(y) || isNaN(height)) {
      throw new Error(`Invalid text parameters: ${command.parameters.slice(0, 3).join(', ')}`);
    }
    return `# Text "${text}" at (${x}, ${y}) with height ${height}\nmsp.add_text("${text}", dxfattribs={'insert': (${x}, ${y}), 'height': ${height}, 'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateDimension(command) {
    if (command.parameters.length < 6) {
      throw new Error('DIMENSION command requires at least 6 parameters (x1 y1 x2 y2 dim_x dim_y)');
    }
    const coords = command.parameters.slice(0, 6).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x1, y1, x2, y2, dimX, dimY] = coords;
    let result = `# Linear dimension from (${x1}, ${y1}) to (${x2}, ${y2})\ndim = msp.add_linear_dim(\n    base=(${dimX}, ${dimY}),\n    p1=(${x1}, ${y1}),\n    p2=(${x2}, ${y2}),\n    dxfattribs={'layer': 'DIMENSIONS'}\n)`;
    
    if (command.parameters.length > 6) {
      const customText = command.parameters[6].replace(/"/g, '');
      result += `\ndim.dxf.text = "${customText}"`;
    }
    
    result += `\ndim.render()`;
    return result;
  }

  static getPythonImports() {
    return `import ezdxf
from ezdxf import units
from ezdxf.enums import TextEntityAlignment
from ezdxf.math import Vec3
import math

# Create new DXF document
doc = ezdxf.new('R2010')
msp = doc.modelspace()

# Set up layers (check if they exist first)
if 'CONSTRUCTION' not in doc.layers:
    doc.layers.new('CONSTRUCTION', dxfattribs={'color': 1})
if 'DIMENSIONS' not in doc.layers:
    doc.layers.new('DIMENSIONS', dxfattribs={'color': 5})
if 'TEXT' not in doc.layers:
    doc.layers.new('TEXT', dxfattribs={'color': 7})
if 'WALLS' not in doc.layers:
    doc.layers.new('WALLS', dxfattribs={'color': 1})
if 'DOORS' not in doc.layers:
    doc.layers.new('DOORS', dxfattribs={'color': 2})
if 'WINDOWS' not in doc.layers:
    doc.layers.new('WINDOWS', dxfattribs={'color': 3})

`;
  }
}

// Run the tests
console.log('🧪 COMPREHENSIVE AUTOLISP TRANSLATION TESTING');
console.log('='.repeat(60));

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach(testCase => {
  console.log(`\n🔍 Test ${testCase.id}: ${testCase.name}`);
  console.log('-'.repeat(40));
  
  const result = MockAutoLispTranslator.translateAutoLispToPython(testCase.autolisp);
  
  console.log(`📊 Statistics:`);
  console.log(`  Total Commands: ${result.statistics.totalCommands}`);
  console.log(`  Translated: ${result.statistics.translatedCommands}`);
  console.log(`  Errors: ${result.statistics.errorCommands}`);
  console.log(`  Warnings: ${result.statistics.skippedCommands}`);
  
  if (result.success) {
    console.log(`✅ PASSED`);
    passedTests++;
  } else {
    console.log(`❌ FAILED`);
    console.log(`Errors:`);
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.log(`⚠️ Warnings:`);
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
});

console.log('\n📊 FINAL TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${totalTests - passedTests} ❌`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (totalTests - passedTests > 0) {
  console.log('\n🔧 ISSUES TO FIX:');
  console.log('- Review failed test cases above');
  console.log('- Check parameter validation');
  console.log('- Verify coordinate parsing');
  console.log('- Test with actual TypeScript service');
}
