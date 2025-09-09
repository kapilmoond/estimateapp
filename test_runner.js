// Manual test runner to verify AutoLISP system
// This simulates what the AutoLispTestingService would do

const testCases = [
  {
    id: 1,
    name: "Simple Foundation Plan",
    requirements: "Draw a rectangular foundation plan 12m x 8m with center dividing wall. Add dimensions and labels.",
    autolispCode: `; Foundation plan drawing
(layer "CONSTRUCTION")
(color 1)
(rectangle 0 0 12000 8000)
(line 6000 0 6000 8000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 12000 0 6000 -1000)
(dimension 0 0 0 8000 -1000 4000)
(text 6000 -1500 300 "12000mm")
(text -1500 4000 300 "8000mm")
(layer "TEXT")
(color 7)
(text 6000 4000 400 "FOUNDATION PLAN")`
  },
  {
    id: 2,
    name: "Circular Structure",
    requirements: "Create a circular water tank with 5m radius, include center point, radius dimension R5000mm, and title text.",
    autolispCode: `; Circular water tank
(layer "CONSTRUCTION")
(color 1)
(circle 5000 5000 5000)
(circle 5000 5000 50)
(line 4900 5000 5100 5000)
(line 5000 4900 5000 5100)
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
    name: "Arc and Curves",
    requirements: "Draw a curved driveway with 8m radius arc and straight sections.",
    autolispCode: `; Curved driveway
(layer "CONSTRUCTION")
(color 1)
(arc 8000 0 8000 0 90)
(line 0 0 8000 0)
(line 8000 8000 16000 8000)
(layer "DIMENSIONS")
(color 5)
(text 8000 4000 300 "R8000mm")
(layer "TEXT")
(color 7)
(text 8000 -1000 400 "DRIVEWAY PLAN")`
  },
  {
    id: 4,
    name: "Polyline Test",
    requirements: "Create a complex shape using polylines with multiple points.",
    autolispCode: `; Complex polyline shape
(layer "CONSTRUCTION")
(color 1)
(polyline 0 0 3000 0 3000 2000 1500 3000 0 2000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 3000 0 1500 -500)
(text 1500 -800 250 "3000mm")
(layer "TEXT")
(color 7)
(text 1500 1500 300 "COMPLEX SHAPE")`
  },
  {
    id: 5,
    name: "Multiple Layers",
    requirements: "Test multiple layer switching and color changes.",
    autolispCode: `; Multiple layers test
(layer "WALLS")
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
    id: 6,
    name: "Dimension Variations",
    requirements: "Test different dimension types and text formatting.",
    autolispCode: `; Dimension variations
(layer "CONSTRUCTION")
(color 1)
(rectangle 0 0 8000 5000)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 8000 0 4000 -1000)
(dimlinear 0 0 0 5000 -1000 2500 "5000mm")
(dimlinear 8000 0 8000 5000 9000 2500 "H=5000")
(text 4000 -1500 300 "8000mm")
(layer "TEXT")
(color 7)
(text 4000 2500 350 "DIMENSION TEST")`
  },
  {
    id: 7,
    name: "Mixed Geometry",
    requirements: "Combine rectangles, circles, lines, and arcs in one drawing.",
    autolispCode: `; Mixed geometry
(layer "CONSTRUCTION")
(color 1)
(rectangle 0 0 6000 4000)
(circle 3000 2000 1000)
(line 0 2000 6000 2000)
(arc 1500 0 1500 180 360)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 6000 0 3000 -800)
(text 3000 -1200 250 "6000mm")
(layer "TEXT")
(color 7)
(text 3000 3500 400 "MIXED GEOMETRY")`
  },
  {
    id: 8,
    name: "Text Positioning",
    requirements: "Test various text sizes and positions.",
    autolispCode: `; Text positioning test
(layer "CONSTRUCTION")
(color 1)
(rectangle 0 0 12000 8000)
(layer "TEXT")
(color 7)
(text 6000 7000 600 "MAIN TITLE")
(text 6000 6000 400 "Subtitle")
(text 6000 5000 300 "Normal Text")
(text 6000 4000 200 "Small Text")
(text 1000 1000 250 "Corner Label")
(text 11000 1000 250 "Other Corner")`
  },
  {
    id: 9,
    name: "Coordinate Edge Cases",
    requirements: "Test edge cases with coordinates including negative values and large numbers.",
    autolispCode: `; Coordinate edge cases
(layer "CONSTRUCTION")
(color 1)
(rectangle -1000 -500 15000 10000)
(line 0 0 14000 9500)
(circle 7000 4750 2500)
(layer "DIMENSIONS")
(color 5)
(dimension -1000 -500 15000 -500 7000 -1500)
(text 7000 -2000 300 "16000mm")
(layer "TEXT")
(color 7)
(text 7000 8000 400 "EDGE CASE TEST")`
  },
  {
    id: 10,
    name: "Complex Building",
    requirements: "Complete building with multiple rooms, doors, windows, and annotations.",
    autolispCode: `; Complex building
(layer "WALLS")
(color 1)
(rectangle 0 0 20000 15000)
(line 6667 0 6667 15000)
(line 13333 0 13333 15000)
(line 0 7500 20000 7500)
(layer "DOORS")
(color 2)
(rectangle 3000 0 4000 200)
(rectangle 9000 0 10000 200)
(rectangle 16000 0 17000 200)
(layer "WINDOWS")
(color 3)
(rectangle 2000 15000 4000 15200)
(rectangle 8000 15000 10000 15200)
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 20000 0 10000 -2000)
(dimension 0 0 0 15000 -2000 7500)
(text 10000 -2500 400 "20000mm")
(text -2500 7500 400 "15000mm")
(layer "TEXT")
(color 7)
(text 3333 3750 300 "ROOM 1")
(text 10000 3750 300 "ROOM 2")
(text 16667 3750 300 "ROOM 3")
(text 3333 11250 300 "ROOM 4")
(text 10000 11250 300 "ROOM 5")
(text 16667 11250 300 "ROOM 6")
(text 10000 16000 600 "6-ROOM BUILDING PLAN")`
  }
];

console.log("🧪 MANUAL AUTOLISP TESTING SUITE");
console.log("=" .repeat(50));

testCases.forEach((testCase, index) => {
  console.log(`\n🔍 Test ${testCase.id}: ${testCase.name}`);
  console.log(`Requirements: ${testCase.requirements}`);
  console.log(`AutoLISP Code Length: ${testCase.autolispCode.length} characters`);
  
  // Analyze AutoLISP code for potential issues
  const lines = testCase.autolispCode.split('\n').filter(line => line.trim() && !line.trim().startsWith(';'));
  const commands = lines.map(line => {
    const match = line.trim().match(/\(\s*(\w+)/);
    return match ? match[1] : 'unknown';
  });
  
  console.log(`Commands found: ${[...new Set(commands)].join(', ')}`);
  
  // Check for potential issues
  const issues = [];
  
  // Check for coordinate parsing issues
  lines.forEach(line => {
    if (line.includes('Ø') || line.includes('R') && !line.includes('"')) {
      issues.push(`Potential coordinate parsing issue: ${line.trim()}`);
    }
  });
  
  // Check for unbalanced parentheses
  let parenCount = 0;
  for (const char of testCase.autolispCode) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
  }
  if (parenCount !== 0) {
    issues.push(`Unbalanced parentheses: ${parenCount}`);
  }
  
  if (issues.length > 0) {
    console.log(`⚠️ Potential Issues:`);
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log(`✅ No obvious issues detected`);
  }
});

console.log("\n📊 TESTING SUMMARY");
console.log("=" .repeat(50));
console.log(`Total test cases: ${testCases.length}`);
console.log(`Commands tested: layer, color, rectangle, line, circle, arc, polyline, dimension, dimlinear, text`);
console.log(`Features tested: Multiple layers, color changes, complex geometry, dimensions, text positioning`);
console.log(`Edge cases: Negative coordinates, large numbers, mixed geometry, complex buildings`);
