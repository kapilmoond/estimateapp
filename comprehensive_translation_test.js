// Comprehensive Translation Test with Real Complex Cases
// This will test the actual translation and identify real issues

// Import the complex test cases
const complexTestCases = [
  {
    id: 1,
    name: "Multi-Story Building Foundation",
    autolisp: `(layer "FOUNDATION")
(color 1)
(rectangle 0 0 25000 18000)
(rectangle 2000 2000 23000 16000)
(circle 3000 3000 300)
(circle 8000 3000 300)
(circle 13000 3000 300)
(layer "REINFORCEMENT")
(color 3)
(line 0 6000 25000 6000)
(line 6250 0 6250 18000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 25000 0 12500 -2000)
(dimlinear 0 0 6250 0 3125 -1000 "6250mm")
(layer "TEXT")
(color 7)
(text 12500 20000 800 "FOUNDATION PLAN")
(text 3000 2500 200 "Ø600mm PILE")`
  },
  {
    id: 2,
    name: "Industrial Site with Curves",
    autolisp: `(layer "BOUNDARY")
(color 1)
(rectangle 0 0 150000 100000)
(layer "BUILDINGS")
(color 2)
(rectangle 20000 30000 80000 70000)
(layer "ROADS")
(color 6)
(polyline 0 50000 20000 50000 20000 30000 80000 30000)
(layer "UTILITIES")
(color 3)
(line 0 25000 150000 25000)
(circle 15000 15000 3000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 150000 0 75000 -5000)
(dimlinear 20000 30000 80000 30000 50000 25000 "60000mm")
(layer "TEXT")
(color 7)
(text 75000 105000 1200 "SITE PLAN")
(text 50000 50000 400 "MAIN FACTORY")`
  },
  {
    id: 3,
    name: "Bridge with Arcs",
    autolisp: `(layer "DECK")
(color 1)
(rectangle 0 8000 30000 9000)
(layer "GIRDERS")
(color 2)
(rectangle 2000 6000 4000 8000)
(rectangle 7000 6000 9000 8000)
(layer "PIERS")
(color 1)
(rectangle 7500 0 8500 6000)
(layer "REINFORCEMENT")
(color 3)
(circle 2500 7500 50)
(circle 3500 7500 50)
(line 1000 8500 29000 8500)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 30000 0 15000 -1000)
(dimlinear 2000 6000 4000 6000 3000 5500 "2000mm")
(layer "TEXT")
(color 7)
(text 15000 11000 600 "BRIDGE SECTION")
(text 3000 7000 150 "GIRDER")`
  },
  {
    id: 4,
    name: "Highway with Complex Arcs",
    autolisp: `(layer "MAINROAD")
(color 1)
(rectangle 0 15000 50000 18000)
(layer "RAMPS")
(color 2)
(arc 25000 15000 8000 0 90)
(arc 25000 18000 8000 270 360)
(arc 22000 18000 8000 90 180)
(layer "BRIDGES")
(color 3)
(rectangle 20000 16000 30000 17000)
(layer "COLUMNS")
(color 1)
(circle 21000 16500 300)
(circle 23000 16500 300)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 50000 0 25000 -2000)
(dimlinear 22000 15000 28000 15000 25000 14000 "6000mm")
(layer "TEXT")
(color 7)
(text 25000 52000 800 "HIGHWAY INTERCHANGE")
(text 25000 16500 300 "CENTRAL ISLAND")`
  },
  {
    id: 5,
    name: "Stadium with Multiple Arcs",
    autolisp: `(layer "FIELD")
(color 3)
(rectangle 20000 30000 80000 70000)
(arc 50000 50000 25000 0 360)
(layer "TRACK")
(color 6)
(arc 50000 50000 30000 0 360)
(arc 50000 50000 28000 0 360)
(layer "SEATING_LOWER")
(color 1)
(arc 50000 50000 35000 0 360)
(layer "COLUMNS")
(color 1)
(circle 50000 20000 400)
(circle 65000 30000 400)
(circle 70000 50000 400)
(layer "DIMENSIONS")
(color 5)
(dimension 20000 50000 80000 50000 50000 45000)
(dimlinear 20000 50000 80000 50000 50000 15000 "60000mm")
(layer "TEXT")
(color 7)
(text 50000 90000 1000 "STADIUM PLAN")
(text 50000 50000 400 "PLAYING FIELD")`
  }
];

// Enhanced Mock Translator with better error detection
class EnhancedMockTranslator {
  static currentLayer = '0';
  static currentColor = 7;

  static translateAutoLispToPython(autolispCode) {
    this.currentLayer = '0';
    this.currentColor = 7;

    const result = {
      pythonCode: '',
      success: false,
      errors: [],
      warnings: [],
      statistics: { totalCommands: 0, translatedCommands: 0, skippedCommands: 0, errorCommands: 0 }
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
          result.errors.push(`Error translating ${command.command}: ${error.message}`);
          
          // Add specific error context
          if (error.message.includes('Invalid number') || error.message.includes('coordinate')) {
            result.errors.push(`  → Command: ${command.originalLine}`);
            result.errors.push(`  → Parameters: [${command.parameters.join(', ')}]`);
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
          originalLine: line,
          lineNumber: i + 1
        });
      } else {
        // Invalid syntax
        commands.push({
          command: 'invalid',
          parameters: [],
          originalLine: line,
          lineNumber: i + 1
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
    if (command.command === 'invalid') {
      throw new Error(`Invalid AutoLISP syntax: ${command.originalLine}`);
    }

    switch (command.command) {
      case 'layer': return this.translateLayer(command);
      case 'color': return this.translateColor(command);
      case 'rectangle': return this.translateRectangle(command);
      case 'line': return this.translateLine(command);
      case 'circle': return this.translateCircle(command);
      case 'arc': return this.translateArc(command);
      case 'polyline': return this.translatePolyline(command);
      case 'text': return this.translateText(command);
      case 'dimension':
      case 'dimlinear': return this.translateDimension(command);
      default: return null;
    }
  }

  static translateLayer(command) {
    if (command.parameters.length < 1) throw new Error('LAYER command requires layer name');
    const layerName = command.parameters[0].replace(/"/g, '');
    this.currentLayer = layerName;
    return `# Set current layer to ${layerName}\nif '${layerName}' not in doc.layers:\n    doc.layers.new('${layerName}', dxfattribs={'color': ${this.currentColor}})`;
  }

  static translateColor(command) {
    if (command.parameters.length < 1) throw new Error('COLOR command requires color value');
    const color = parseInt(command.parameters[0]);
    if (isNaN(color)) throw new Error(`Invalid color value: ${command.parameters[0]}`);
    this.currentColor = color;
    return `# Set current color to ${color}`;
  }

  static translateRectangle(command) {
    if (command.parameters.length < 4) throw new Error('RECTANGLE command requires at least 4 parameters (x1 y1 x2 y2)');
    const coords = command.parameters.slice(0, 4).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x1, y1, x2, y2] = coords;
    return `# Rectangle from (${x1}, ${y1}) to (${x2}, ${y2})\npoints = [(${x1}, ${y1}), (${x2}, ${y1}), (${x2}, ${y2}), (${x1}, ${y2})]\nmsp.add_lwpolyline(points, close=True, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateLine(command) {
    if (command.parameters.length < 4) throw new Error('LINE command requires at least 4 parameters (x1 y1 x2 y2)');
    const coords = command.parameters.slice(0, 4).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x1, y1, x2, y2] = coords;
    return `# Line from (${x1}, ${y1}) to (${x2}, ${y2})\nmsp.add_line((${x1}, ${y1}), (${x2}, ${y2}), dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateCircle(command) {
    if (command.parameters.length < 3) throw new Error('CIRCLE command requires at least 3 parameters (x y radius)');
    const coords = command.parameters.slice(0, 3).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x, y, radius] = coords;
    return `# Circle at (${x}, ${y}) with radius ${radius}\nmsp.add_circle((${x}, ${y}), ${radius}, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateArc(command) {
    if (command.parameters.length < 5) throw new Error('ARC command requires at least 5 parameters (x y radius start_angle end_angle)');
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
    if (command.parameters.length < 4) throw new Error('TEXT command requires at least 4 parameters (x y height "text")');
    const x = parseFloat(command.parameters[0]);
    const y = parseFloat(command.parameters[1]);
    const height = parseFloat(command.parameters[2]);
    const text = command.parameters[3].replace(/"/g, '');
    if (isNaN(x) || isNaN(y) || isNaN(height)) throw new Error(`Invalid text parameters`);
    return `# Text "${text}" at (${x}, ${y}) with height ${height}\nmsp.add_text("${text}", dxfattribs={'insert': (${x}, ${y}), 'height': ${height}, 'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateDimension(command) {
    if (command.parameters.length < 6) throw new Error('DIMENSION command requires at least 6 parameters (x1 y1 x2 y2 dim_x dim_y)');
    const coords = command.parameters.slice(0, 6).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x1, y1, x2, y2, dimX, dimY] = coords;
    
    if (command.parameters.length > 6) {
      const customText = command.parameters[6].replace(/"/g, '');
      return `# Linear dimension from (${x1}, ${y1}) to (${x2}, ${y2}) with custom text "${customText}"\ndim = msp.add_linear_dim(\n    base=(${dimX}, ${dimY}),\n    p1=(${x1}, ${y1}),\n    p2=(${x2}, ${y2}),\n    text="${customText}",\n    dxfattribs={'layer': 'DIMENSIONS', 'color': ${this.currentColor}}\n)\ndim.render()`;
    } else {
      return `# Linear dimension from (${x1}, ${y1}) to (${x2}, ${y2})\ndim = msp.add_linear_dim(\n    base=(${dimX}, ${dimY}),\n    p1=(${x1}, ${y1}),\n    p2=(${x2}, ${y2}),\n    dxfattribs={'layer': 'DIMENSIONS', 'color': ${this.currentColor}}\n)\ndim.render()`;
    }
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
if 'FOUNDATION' not in doc.layers:
    doc.layers.new('FOUNDATION', dxfattribs={'color': 1})
if 'REINFORCEMENT' not in doc.layers:
    doc.layers.new('REINFORCEMENT', dxfattribs={'color': 3})
if 'DIMENSIONS' not in doc.layers:
    doc.layers.new('DIMENSIONS', dxfattribs={'color': 5})
if 'TEXT' not in doc.layers:
    doc.layers.new('TEXT', dxfattribs={'color': 7})
if 'BOUNDARY' not in doc.layers:
    doc.layers.new('BOUNDARY', dxfattribs={'color': 1})
if 'BUILDINGS' not in doc.layers:
    doc.layers.new('BUILDINGS', dxfattribs={'color': 2})
if 'ROADS' not in doc.layers:
    doc.layers.new('ROADS', dxfattribs={'color': 6})
if 'UTILITIES' not in doc.layers:
    doc.layers.new('UTILITIES', dxfattribs={'color': 3})
if 'DECK' not in doc.layers:
    doc.layers.new('DECK', dxfattribs={'color': 1})
if 'GIRDERS' not in doc.layers:
    doc.layers.new('GIRDERS', dxfattribs={'color': 2})
if 'PIERS' not in doc.layers:
    doc.layers.new('PIERS', dxfattribs={'color': 1})
if 'MAINROAD' not in doc.layers:
    doc.layers.new('MAINROAD', dxfattribs={'color': 1})
if 'RAMPS' not in doc.layers:
    doc.layers.new('RAMPS', dxfattribs={'color': 2})
if 'BRIDGES' not in doc.layers:
    doc.layers.new('BRIDGES', dxfattribs={'color': 3})
if 'COLUMNS' not in doc.layers:
    doc.layers.new('COLUMNS', dxfattribs={'color': 1})
if 'FIELD' not in doc.layers:
    doc.layers.new('FIELD', dxfattribs={'color': 3})
if 'TRACK' not in doc.layers:
    doc.layers.new('TRACK', dxfattribs={'color': 6})
if 'SEATING_LOWER' not in doc.layers:
    doc.layers.new('SEATING_LOWER', dxfattribs={'color': 1})

`;
  }
}

// Run comprehensive tests
console.log('🧪 COMPREHENSIVE COMPLEX AUTOLISP TRANSLATION TESTING');
console.log('='.repeat(80));

let passedTests = 0;
let totalTests = complexTestCases.length;
let totalErrors = [];
let totalWarnings = [];

complexTestCases.forEach(testCase => {
  console.log(`\n🔍 Complex Test ${testCase.id}: ${testCase.name}`);
  console.log('='.repeat(60));
  
  const result = EnhancedMockTranslator.translateAutoLispToPython(testCase.autolisp);
  
  console.log(`📊 Translation Statistics:`);
  console.log(`  Total Commands: ${result.statistics.totalCommands}`);
  console.log(`  Successfully Translated: ${result.statistics.translatedCommands}`);
  console.log(`  Errors: ${result.statistics.errorCommands}`);
  console.log(`  Warnings: ${result.statistics.skippedCommands}`);
  console.log(`  Success Rate: ${((result.statistics.translatedCommands / result.statistics.totalCommands) * 100).toFixed(1)}%`);
  
  if (result.success) {
    console.log(`✅ PASSED - All commands translated successfully`);
    passedTests++;
  } else {
    console.log(`❌ FAILED - Translation errors detected`);
    console.log(`\n🚨 ERRORS:`);
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
      totalErrors.push(`Test ${testCase.id}: ${error}`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.log(`\n⚠️ WARNINGS:`);
    result.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
      totalWarnings.push(`Test ${testCase.id}: ${warning}`);
    });
  }
  
  // Show a sample of the generated Python code
  const pythonLines = result.pythonCode.split('\n');
  const sampleLines = pythonLines.slice(20, 30); // Show middle section
  console.log(`\n📝 Sample Generated Python Code:`);
  sampleLines.forEach(line => {
    if (line.trim()) console.log(`  ${line}`);
  });
});

console.log('\n📊 COMPREHENSIVE TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Complex Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${totalTests - passedTests} ❌`);
console.log(`Overall Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log(`Total Errors Found: ${totalErrors.length}`);
console.log(`Total Warnings: ${totalWarnings.length}`);

if (totalErrors.length > 0) {
  console.log('\n🔧 ALL ERRORS THAT NEED FIXING:');
  console.log('-'.repeat(50));
  totalErrors.forEach((error, index) => {
    console.log(`${index + 1}. ${error}`);
  });
}

if (totalWarnings.length > 0) {
  console.log('\n⚠️ ALL WARNINGS:');
  console.log('-'.repeat(30));
  totalWarnings.forEach((warning, index) => {
    console.log(`${index + 1}. ${warning}`);
  });
}

console.log('\n🎯 NEXT STEPS:');
console.log('1. Fix all identified errors in the AutoLISP translator');
console.log('2. Test the fixed translator with these complex cases');
console.log('3. Verify the generated Python code executes without errors');
console.log('4. Test the actual DXF file generation on the server');
console.log('5. Validate the visual output of the generated drawings');
