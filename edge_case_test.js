// Edge case testing for AutoLISP translation
// Testing scenarios that might cause real-world issues

const edgeCases = [
  {
    id: 1,
    name: "Dimension Text with Symbols",
    description: "Test dimension commands with symbol text (should work)",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(circle 5000 5000 5000)
(layer "DIMENSIONS")
(color 5)
(dimlinear 0 5000 10000 5000 5000 -1000 "Ø10000mm")
(dimlinear 5000 0 5000 10000 -1000 5000 "R5000mm")
(text 5000 -1500 300 "Ø10000mm")
(text -1500 5000 300 "R5000mm")`
  },
  {
    id: 2,
    name: "Large Coordinate Values",
    description: "Test with very large coordinate values",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(rectangle 0 0 100000 80000)
(line 50000 0 50000 80000)
(circle 25000 40000 15000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 100000 0 50000 -10000)
(text 50000 -15000 500 "100000mm")`
  },
  {
    id: 3,
    name: "Decimal Coordinates",
    description: "Test with decimal coordinate values",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(rectangle 0.5 0.5 1000.75 800.25)
(circle 500.5 400.5 200.75)
(layer "DIMENSIONS")
(color 5)
(dimension 0.5 0.5 1000.75 0.5 500.5 -100.5)
(text 500.5 -150.5 250.5 "1000.25mm")`
  },
  {
    id: 4,
    name: "Special Characters in Text",
    description: "Test text with special characters and symbols",
    autolisp: `(layer "TEXT")
(color 7)
(text 1000 5000 300 "Ø16mm @ 200mm c/c")
(text 1000 4500 300 "R.C.C. BEAM 300x450mm")
(text 1000 4000 300 "M25 GRADE CONCRETE")
(text 1000 3500 300 "Fe415 STEEL BARS")
(text 1000 3000 300 "1:2:4 CEMENT MORTAR")`
  },
  {
    id: 5,
    name: "Mixed Case Commands",
    description: "Test commands with mixed case (should be case insensitive)",
    autolisp: `(Layer "CONSTRUCTION")
(Color 1)
(Rectangle 0 0 8000 6000)
(Line 4000 0 4000 6000)
(Circle 2000 3000 1000)
(Text 4000 7000 400 "MIXED CASE TEST")`
  },
  {
    id: 6,
    name: "Extra Whitespace",
    description: "Test commands with extra whitespace",
    autolisp: `(  layer   "CONSTRUCTION"  )
(  color   1  )
(  rectangle   0   0   8000   6000  )
(  line   4000   0   4000   6000  )
(  text   4000   3000   300   "WHITESPACE TEST"  )`
  },
  {
    id: 7,
    name: "Zero and Negative Values",
    description: "Test with zero and negative coordinate values",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(rectangle -5000 -3000 5000 3000)
(line -5000 0 5000 0)
(line 0 -3000 0 3000)
(circle 0 0 1000)
(layer "DIMENSIONS")
(color 5)
(dimension -5000 -3000 5000 -3000 0 -4000)
(text 0 -4500 300 "10000mm")`
  },
  {
    id: 8,
    name: "Complex Polyline",
    description: "Test polyline with many points",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(polyline 0 0 1000 0 2000 500 3000 0 4000 1000 3500 2000 2500 2500 1500 2000 500 1500 0 1000)
(layer "TEXT")
(color 7)
(text 2000 3000 300 "COMPLEX POLYLINE")`
  },
  {
    id: 9,
    name: "Multiple Dimension Types",
    description: "Test both dimension and dimlinear commands",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(rectangle 0 0 6000 4000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 6000 0 3000 -800)
(dimlinear 0 0 0 4000 -800 2000 "4000mm")
(dimlinear 6000 0 6000 4000 6800 2000 "H=4000")
(text 3000 -1200 250 "6000mm")`
  },
  {
    id: 10,
    name: "Boundary Test - Very Small Values",
    description: "Test with very small coordinate values",
    autolisp: `(layer "CONSTRUCTION")
(color 1)
(rectangle 0.1 0.1 10.5 8.5)
(circle 5.25 4.25 2.5)
(line 0.1 4.25 10.5 4.25)
(layer "TEXT")
(color 7)
(text 5.25 9.0 1.5 "SMALL VALUES")`
  }
];

// Use the same MockAutoLispTranslator from the previous test
class MockAutoLispTranslator {
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
      
      // Handle extra whitespace in commands
      const match = line.match(/^\(\s*(\w+)\s*(.*)\)$/);
      if (match) {
        const [, command, paramStr] = match;
        const parameters = this.parseParameters(paramStr);
        commands.push({
          command: command.toLowerCase(), // Make case insensitive
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
      case 'layer': return this.translateLayer(command);
      case 'color': return this.translateColor(command);
      case 'rectangle': return this.translateRectangle(command);
      case 'line': return this.translateLine(command);
      case 'circle': return this.translateCircle(command);
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
    if (command.parameters.length < 4) throw new Error('RECTANGLE command requires at least 4 parameters');
    const coords = command.parameters.slice(0, 4).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x1, y1, x2, y2] = coords;
    return `# Rectangle from (${x1}, ${y1}) to (${x2}, ${y2})\npoints = [(${x1}, ${y1}), (${x2}, ${y1}), (${x2}, ${y2}), (${x1}, ${y2})]\nmsp.add_lwpolyline(points, close=True, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateLine(command) {
    if (command.parameters.length < 4) throw new Error('LINE command requires at least 4 parameters');
    const coords = command.parameters.slice(0, 4).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x1, y1, x2, y2] = coords;
    return `# Line from (${x1}, ${y1}) to (${x2}, ${y2})\nmsp.add_line((${x1}, ${y1}), (${x2}, ${y2}), dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateCircle(command) {
    if (command.parameters.length < 3) throw new Error('CIRCLE command requires at least 3 parameters');
    const coords = command.parameters.slice(0, 3).map(p => {
      const num = parseFloat(p);
      if (isNaN(num)) throw new Error(`Invalid coordinate: ${p}`);
      return num;
    });
    const [x, y, radius] = coords;
    return `# Circle at (${x}, ${y}) with radius ${radius}\nmsp.add_circle((${x}, ${y}), ${radius}, dxfattribs={'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translatePolyline(command) {
    if (command.parameters.length < 4 || command.parameters.length % 2 !== 0) {
      throw new Error('POLYLINE command requires even number of parameters');
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
    if (command.parameters.length < 4) throw new Error('TEXT command requires at least 4 parameters');
    const x = parseFloat(command.parameters[0]);
    const y = parseFloat(command.parameters[1]);
    const height = parseFloat(command.parameters[2]);
    const text = command.parameters[3].replace(/"/g, '');
    if (isNaN(x) || isNaN(y) || isNaN(height)) throw new Error(`Invalid text parameters`);
    return `# Text "${text}" at (${x}, ${y}) with height ${height}\nmsp.add_text("${text}", dxfattribs={'insert': (${x}, ${y}), 'height': ${height}, 'layer': '${this.currentLayer}', 'color': ${this.currentColor}})`;
  }

  static translateDimension(command) {
    if (command.parameters.length < 6) throw new Error('DIMENSION command requires at least 6 parameters');
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

# Set up layers
if 'CONSTRUCTION' not in doc.layers:
    doc.layers.new('CONSTRUCTION', dxfattribs={'color': 1})
if 'DIMENSIONS' not in doc.layers:
    doc.layers.new('DIMENSIONS', dxfattribs={'color': 5})
if 'TEXT' not in doc.layers:
    doc.layers.new('TEXT', dxfattribs={'color': 7})

`;
  }
}

// Run edge case tests
console.log('🧪 EDGE CASE TESTING FOR AUTOLISP TRANSLATION');
console.log('='.repeat(60));

let passedTests = 0;
let totalTests = edgeCases.length;

edgeCases.forEach(testCase => {
  console.log(`\n🔍 Test ${testCase.id}: ${testCase.name}`);
  console.log(`📝 Description: ${testCase.description}`);
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

console.log('\n📊 EDGE CASE TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total Edge Case Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${totalTests - passedTests} ❌`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

console.log('\n🎯 EDGE CASES TESTED:');
console.log('✓ Dimension text with symbols (Ø, R)');
console.log('✓ Large coordinate values');
console.log('✓ Decimal coordinates');
console.log('✓ Special characters in text');
console.log('✓ Mixed case commands');
console.log('✓ Extra whitespace handling');
console.log('✓ Zero and negative values');
console.log('✓ Complex polylines');
console.log('✓ Multiple dimension types');
console.log('✓ Very small coordinate values');
