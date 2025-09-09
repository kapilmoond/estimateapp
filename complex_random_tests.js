// Complex Random AutoLISP Tests
// These are much more challenging and realistic test cases

const complexRandomTests = [
  {
    id: 1,
    name: "Multi-Story Building Foundation",
    description: "Complex foundation with multiple levels, piles, and reinforcement details",
    autolisp: `; Multi-story building foundation plan
(layer "FOUNDATION")
(color 1)
(rectangle 0 0 25000 18000)
(rectangle 2000 2000 23000 16000)
(rectangle 4000 4000 21000 14000)

; Pile locations
(layer "PILES")
(color 2)
(circle 3000 3000 300)
(circle 8000 3000 300)
(circle 13000 3000 300)
(circle 18000 3000 300)
(circle 22000 3000 300)
(circle 3000 9000 300)
(circle 8000 9000 300)
(circle 13000 9000 300)
(circle 18000 9000 300)
(circle 22000 9000 300)
(circle 3000 15000 300)
(circle 8000 15000 300)
(circle 13000 15000 300)
(circle 18000 15000 300)
(circle 22000 15000 300)

; Reinforcement grid
(layer "REINFORCEMENT")
(color 3)
(line 0 6000 25000 6000)
(line 0 12000 25000 12000)
(line 6250 0 6250 18000)
(line 12500 0 12500 18000)
(line 18750 0 18750 18000)

; Dimensions
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 25000 0 12500 -2000)
(dimension 0 0 0 18000 -2000 9000)
(dimlinear 0 0 6250 0 3125 -1000 "6250mm")
(dimlinear 6250 0 12500 0 9375 -1000 "6250mm")
(dimlinear 12500 0 18750 0 15625 -1000 "6250mm")
(dimlinear 18750 0 25000 0 21875 -1000 "6250mm")

; Text annotations
(layer "TEXT")
(color 7)
(text 12500 20000 800 "MULTI-STORY BUILDING FOUNDATION")
(text 12500 19000 400 "SCALE 1:200")
(text 3000 2500 200 "Ø600mm PILE")
(text 8000 2500 200 "Ø600mm PILE")
(text 13000 2500 200 "Ø600mm PILE")
(text 18000 2500 200 "Ø600mm PILE")
(text 22000 2500 200 "Ø600mm PILE")
(text 1000 1000 300 "FOUNDATION LEVEL -3.0m")
(text 1000 500 300 "PILE CAP LEVEL -2.5m")
(text 26000 17000 250 "REINFORCEMENT:")
(text 26000 16500 200 "Main Bars: Ø20mm @ 150mm c/c")
(text 26000 16000 200 "Distribution: Ø12mm @ 200mm c/c")
(text 26000 15500 200 "Stirrups: Ø8mm @ 100mm c/c")`
  },
  {
    id: 2,
    name: "Industrial Complex Site Plan",
    description: "Large industrial site with multiple buildings, roads, and utilities",
    autolisp: `; Industrial complex site plan
(layer "BOUNDARY")
(color 1)
(rectangle 0 0 150000 100000)

; Main factory building
(layer "BUILDINGS")
(color 2)
(rectangle 20000 30000 80000 70000)
(rectangle 25000 35000 75000 65000)

; Office building
(rectangle 90000 40000 120000 60000)
(rectangle 95000 45000 115000 55000)

; Warehouse
(rectangle 30000 10000 70000 25000)
(rectangle 35000 15000 65000 20000)

; Security gate house
(rectangle 5000 45000 15000 55000)

; Roads and pathways
(layer "ROADS")
(color 6)
(polyline 0 50000 20000 50000 20000 30000 80000 30000 80000 70000 120000 70000 120000 60000 150000 60000)
(polyline 20000 50000 90000 50000)
(polyline 50000 30000 50000 10000)
(polyline 80000 50000 80000 70000)

; Parking areas
(layer "PARKING")
(color 4)
(rectangle 85000 25000 145000 40000)
(rectangle 10000 75000 40000 95000)

; Utility lines
(layer "UTILITIES")
(color 3)
(line 0 25000 150000 25000)
(line 0 75000 150000 75000)
(line 25000 0 25000 100000)
(line 125000 0 125000 100000)

; Landscaping
(layer "LANDSCAPE")
(color 3)
(circle 15000 15000 3000)
(circle 135000 15000 3000)
(circle 15000 85000 3000)
(circle 135000 85000 3000)
(circle 75000 85000 2000)

; Dimensions
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 150000 0 75000 -5000)
(dimension 0 0 0 100000 -5000 50000)
(dimlinear 20000 30000 80000 30000 50000 25000 "60000mm")
(dimlinear 20000 30000 20000 70000 15000 50000 "40000mm")
(dimlinear 90000 40000 120000 40000 105000 35000 "30000mm")
(dimlinear 90000 40000 90000 60000 85000 50000 "20000mm")

; Text annotations
(layer "TEXT")
(color 7)
(text 75000 105000 1200 "INDUSTRIAL COMPLEX SITE PLAN")
(text 75000 103000 600 "SCALE 1:1000")
(text 50000 50000 400 "MAIN FACTORY")
(text 50000 49000 300 "AREA: 2400 SQ.M")
(text 105000 50000 400 "OFFICE BUILDING")
(text 105000 49000 300 "AREA: 600 SQ.M")
(text 50000 17500 400 "WAREHOUSE")
(text 50000 16500 300 "AREA: 600 SQ.M")
(text 10000 50000 300 "SECURITY")
(text 115000 32500 300 "PARKING")
(text 115000 31500 250 "150 CARS")
(text 25000 85000 300 "PARKING")
(text 25000 84000 250 "80 CARS")
(text 15000 12000 250 "GARDEN")
(text 135000 12000 250 "GARDEN")
(text 15000 82000 250 "GARDEN")
(text 135000 82000 250 "GARDEN")
(text 75000 82000 250 "FOUNTAIN")
(text 2000 25000 200 "WATER LINE")
(text 2000 75000 200 "POWER LINE")
(text 25000 2000 200 "GAS LINE")
(text 125000 2000 200 "TELECOM")`
  },
  {
    id: 3,
    name: "Bridge Cross-Section Detail",
    description: "Detailed bridge cross-section with complex geometry and reinforcement",
    autolisp: `; Bridge cross-section detail
(layer "DECK")
(color 1)
(rectangle 0 8000 30000 9000)
(rectangle 1000 9000 29000 9200)

; Bridge girders
(layer "GIRDERS")
(color 2)
(rectangle 2000 6000 4000 8000)
(rectangle 7000 6000 9000 8000)
(rectangle 12000 6000 14000 8000)
(rectangle 17000 6000 19000 8000)
(rectangle 22000 6000 24000 8000)
(rectangle 26000 6000 28000 8000)

; Pier columns
(layer "PIERS")
(color 1)
(rectangle 7500 0 8500 6000)
(rectangle 13000 0 14000 6000)
(rectangle 21000 0 22000 6000)

; Pier footings
(rectangle 6000 -2000 10000 0)
(rectangle 11500 -2000 15500 0)
(rectangle 19500 -2000 23500 0)

; Reinforcement in deck
(layer "REINFORCEMENT")
(color 3)
(line 1000 8500 29000 8500)
(line 1000 8200 29000 8200)
(line 3000 8000 3000 9000)
(line 6000 8000 6000 9000)
(line 9000 8000 9000 9000)
(line 12000 8000 12000 9000)
(line 15000 8000 15000 9000)
(line 18000 8000 18000 9000)
(line 21000 8000 21000 9000)
(line 24000 8000 24000 9000)
(line 27000 8000 27000 9000)

; Reinforcement in girders
(circle 2500 7500 50)
(circle 3500 7500 50)
(circle 2500 6500 50)
(circle 3500 6500 50)
(circle 7500 7500 50)
(circle 8500 7500 50)
(circle 7500 6500 50)
(circle 8500 6500 50)
(circle 12500 7500 50)
(circle 13500 7500 50)
(circle 12500 6500 50)
(circle 13500 6500 50)

; Reinforcement in piers
(circle 7750 5500 50)
(circle 8250 5500 50)
(circle 7750 4500 50)
(circle 8250 4500 50)
(circle 7750 3500 50)
(circle 8250 3500 50)
(circle 7750 2500 50)
(circle 8250 2500 50)
(circle 7750 1500 50)
(circle 8250 1500 50)
(circle 7750 500 50)
(circle 8250 500 50)

; Dimensions
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 30000 0 15000 -1000)
(dimension 0 0 0 9200 -1000 4600)
(dimlinear 0 8000 0 9000 -500 8500 "1000mm")
(dimlinear 2000 6000 4000 6000 3000 5500 "2000mm")
(dimlinear 7000 6000 9000 6000 8000 5500 "2000mm")
(dimlinear 7500 0 8500 0 8000 -500 "1000mm")
(dimlinear 6000 -2000 10000 -2000 8000 -2500 "4000mm")

; Text annotations
(layer "TEXT")
(color 7)
(text 15000 11000 600 "BRIDGE CROSS-SECTION DETAIL")
(text 15000 10500 300 "SCALE 1:100")
(text 15000 8600 200 "R.C.C. DECK SLAB - 1000mm THICK")
(text 3000 7000 150 "GIRDER")
(text 3000 6700 120 "2000x2000")
(text 8000 7000 150 "GIRDER")
(text 8000 6700 120 "2000x2000")
(text 13000 7000 150 "GIRDER")
(text 13000 6700 120 "2000x2000")
(text 8000 3000 200 "PIER COLUMN")
(text 8000 2700 150 "1000x1000")
(text 8000 -1000 200 "PIER FOOTING")
(text 8000 -1300 150 "4000x2000")
(text 31000 8500 150 "MAIN REINFORCEMENT:")
(text 31000 8200 120 "Ø25mm @ 150mm c/c")
(text 31000 7900 150 "DISTRIBUTION BARS:")
(text 31000 7600 120 "Ø16mm @ 200mm c/c")
(text 31000 7300 150 "STIRRUPS:")
(text 31000 7000 120 "Ø10mm @ 100mm c/c")
(text 31000 6700 150 "CONCRETE GRADE:")
(text 31000 6400 120 "M40 FOR DECK")
(text 31000 6100 120 "M35 FOR GIRDERS")
(text 31000 5800 120 "M30 FOR PIERS")`
  }
];

// Continue with more complex tests...
const moreComplexTests = [
  {
    id: 4,
    name: "Curved Highway Interchange",
    description: "Complex highway interchange with multiple curved ramps and bridges",
    autolisp: `; Highway interchange with curved ramps
(layer "MAINROAD")
(color 1)
(rectangle 0 15000 50000 18000)
(rectangle 22000 0 28000 50000)

; Curved ramps
(layer "RAMPS")
(color 2)
(arc 25000 15000 8000 0 90)
(arc 25000 18000 8000 270 360)
(arc 22000 18000 8000 90 180)
(arc 28000 15000 8000 180 270)

; Bridge structures
(layer "BRIDGES")
(color 3)
(rectangle 20000 16000 30000 17000)
(rectangle 24000 12000 26000 22000)

; Support columns
(layer "COLUMNS")
(color 1)
(circle 21000 16500 300)
(circle 23000 16500 300)
(circle 27000 16500 300)
(circle 29000 16500 300)
(circle 25000 13000 300)
(circle 25000 15000 300)
(circle 25000 19000 300)
(circle 25000 21000 300)

; Traffic islands
(layer "ISLANDS")
(color 4)
(circle 25000 16500 2000)
(polyline 20000 20000 22000 22000 28000 22000 30000 20000 28000 18000 22000 18000)

; Guardrails
(layer "GUARDRAILS")
(color 6)
(line 0 15000 50000 15000)
(line 0 18000 50000 18000)
(line 22000 0 22000 50000)
(line 28000 0 28000 50000)

; Dimensions
(layer "DIMENSIONS")
(color 5)
(dimension 0 0 50000 0 25000 -2000)
(dimension 0 0 0 50000 -2000 25000)
(dimlinear 22000 15000 28000 15000 25000 14000 "6000mm")
(dimlinear 0 15000 0 18000 -1000 16500 "3000mm")

; Text annotations
(layer "TEXT")
(color 7)
(text 25000 52000 800 "HIGHWAY INTERCHANGE PLAN")
(text 25000 51000 400 "SCALE 1:500")
(text 25000 16500 300 "CENTRAL ISLAND")
(text 10000 16500 250 "MAIN HIGHWAY")
(text 25000 5000 250 "CROSS HIGHWAY")
(text 35000 25000 200 "CURVED RAMP")
(text 15000 25000 200 "CURVED RAMP")
(text 35000 8000 200 "CURVED RAMP")
(text 15000 8000 200 "CURVED RAMP")
(text 25000 13500 150 "BRIDGE SUPPORT")
(text 21000 16000 150 "COLUMN")
(text 23000 16000 150 "COLUMN")
(text 27000 16000 150 "COLUMN")
(text 29000 16000 150 "COLUMN")`
  },
  {
    id: 5,
    name: "Stadium Structure Plan",
    description: "Large stadium with curved seating, field, and complex structural elements",
    autolisp: `; Stadium structure plan
(layer "FIELD")
(color 3)
(rectangle 20000 30000 80000 70000)
(arc 50000 50000 25000 0 360)

; Running track
(layer "TRACK")
(color 6)
(arc 50000 50000 30000 0 360)
(arc 50000 50000 28000 0 360)

; Seating tiers - Lower
(layer "SEATING_LOWER")
(color 1)
(arc 50000 50000 35000 0 360)
(arc 50000 50000 45000 0 360)

; Seating tiers - Upper
(layer "SEATING_UPPER")
(color 2)
(arc 50000 50000 50000 0 360)
(arc 50000 50000 60000 0 360)

; VIP boxes
(layer "VIP")
(color 4)
(rectangle 45000 15000 55000 20000)
(rectangle 45000 80000 55000 85000)
(rectangle 15000 45000 20000 55000)
(rectangle 80000 45000 85000 55000)

; Structural columns - Radial pattern
(layer "COLUMNS")
(color 1)
(circle 50000 20000 400)
(circle 65000 30000 400)
(circle 70000 50000 400)
(circle 65000 70000 400)
(circle 50000 80000 400)
(circle 35000 70000 400)
(circle 30000 50000 400)
(circle 35000 30000 400)
(circle 57000 25000 400)
(circle 67000 40000 400)
(circle 67000 60000 400)
(circle 57000 75000 400)
(circle 43000 75000 400)
(circle 33000 60000 400)
(circle 33000 40000 400)
(circle 43000 25000 400)

; Entrance gates
(layer "ENTRANCES")
(color 5)
(rectangle 48000 15000 52000 20000)
(rectangle 48000 80000 52000 85000)
(rectangle 15000 48000 20000 52000)
(rectangle 80000 48000 85000 52000)
(rectangle 40000 18000 44000 22000)
(rectangle 56000 18000 60000 22000)
(rectangle 40000 78000 44000 82000)
(rectangle 56000 78000 60000 82000)

; Roof structure
(layer "ROOF")
(color 7)
(arc 50000 50000 65000 0 360)
(arc 50000 50000 63000 0 360)

; Dimensions
(layer "DIMENSIONS")
(color 5)
(dimension 20000 50000 80000 50000 50000 45000)
(dimension 50000 20000 50000 80000 45000 50000)
(dimlinear 20000 50000 80000 50000 50000 15000 "60000mm")
(dimlinear 50000 20000 50000 80000 15000 50000 "60000mm")

; Text annotations
(layer "TEXT")
(color 7)
(text 50000 90000 1000 "STADIUM STRUCTURE PLAN")
(text 50000 88000 500 "SCALE 1:1000")
(text 50000 50000 400 "PLAYING FIELD")
(text 50000 48000 300 "105m x 68m")
(text 50000 40000 300 "RUNNING TRACK")
(text 50000 38000 250 "400m STANDARD")
(text 35000 35000 250 "LOWER SEATING")
(text 35000 33000 200 "15,000 CAPACITY")
(text 65000 65000 250 "UPPER SEATING")
(text 65000 63000 200 "25,000 CAPACITY")
(text 50000 17500 300 "MAIN ENTRANCE")
(text 50000 82500 300 "MAIN ENTRANCE")
(text 17500 50000 300 "SIDE ENTRANCE")
(text 82500 50000 300 "SIDE ENTRANCE")
(text 50000 12000 250 "VIP BOXES")
(text 50000 87000 250 "VIP BOXES")
(text 12000 50000 250 "VIP BOXES")
(text 87000 50000 250 "VIP BOXES")
(text 90000 85000 200 "STRUCTURAL DETAILS:")
(text 90000 84000 150 "Columns: Ø800mm RCC")
(text 90000 83500 150 "Roof: Steel Truss")
(text 90000 83000 150 "Foundation: Pile Foundation")
(text 90000 82500 150 "Seating: Precast Concrete")
(text 90000 82000 150 "Total Capacity: 40,000")`
  }
];

console.log('🧪 COMPLEX RANDOM AUTOLISP TESTING SUITE');
console.log('='.repeat(70));
console.log('Testing with highly complex, realistic architectural and engineering drawings');

// Combine all complex tests
const allComplexTests = [...complexRandomTests, ...moreComplexTests];

allComplexTests.forEach((testCase, index) => {
  console.log(`\n🔍 Complex Test ${testCase.id}: ${testCase.name}`);
  console.log(`📝 Description: ${testCase.description}`);
  console.log('-'.repeat(50));
  
  // Analyze complexity
  const lines = testCase.autolisp.split('\n').filter(line => line.trim() && !line.trim().startsWith(';'));
  const commands = lines.map(line => {
    const match = line.trim().match(/\(\s*(\w+)/);
    return match ? match[1] : 'unknown';
  });
  
  const uniqueCommands = [...new Set(commands)];
  const layerCount = commands.filter(cmd => cmd === 'layer').length;
  const geometryCount = commands.filter(cmd => ['rectangle', 'circle', 'arc', 'line', 'polyline'].includes(cmd)).length;
  const dimensionCount = commands.filter(cmd => ['dimension', 'dimlinear'].includes(cmd)).length;
  const textCount = commands.filter(cmd => cmd === 'text').length;
  
  console.log(`📊 Complexity Analysis:`);
  console.log(`  Total Commands: ${lines.length}`);
  console.log(`  Unique Command Types: ${uniqueCommands.length} (${uniqueCommands.join(', ')})`);
  console.log(`  Layers: ${layerCount}`);
  console.log(`  Geometry Elements: ${geometryCount}`);
  console.log(`  Dimensions: ${dimensionCount}`);
  console.log(`  Text Elements: ${textCount}`);
  
  // Check for potential issues
  const issues = [];
  
  // Check for very large coordinates
  const coords = testCase.autolisp.match(/\b\d{5,}\b/g);
  if (coords && coords.length > 0) {
    console.log(`  Large Coordinates Found: ${coords.slice(0, 5).join(', ')}${coords.length > 5 ? '...' : ''}`);
  }
  
  // Check for complex geometry
  const arcs = commands.filter(cmd => cmd === 'arc').length;
  const polylines = commands.filter(cmd => cmd === 'polyline').length;
  if (arcs > 5 || polylines > 3) {
    console.log(`  Complex Geometry: ${arcs} arcs, ${polylines} polylines`);
  }
  
  // Check for dimension text with symbols
  const dimensionTexts = testCase.autolisp.match(/dimlinear[^)]*"[^"]*"/g);
  if (dimensionTexts) {
    console.log(`  Custom Dimension Texts: ${dimensionTexts.length}`);
  }
  
  console.log(`✅ Complex test case prepared for translation testing`);
});

console.log('\n📊 COMPLEX TESTING SUMMARY');
console.log('='.repeat(70));
console.log(`Total Complex Tests: ${allComplexTests.length}`);
console.log(`Drawing Types: Multi-story foundation, Industrial site, Bridge detail, Highway interchange, Stadium`);
console.log(`Features Tested: Large coordinates, Complex geometry, Multiple layers, Curved elements, Detailed annotations`);
console.log(`Stress Tests: High command count, Complex polylines, Multiple arcs, Extensive dimensioning, Professional annotations`);
console.log('\n🎯 These tests will reveal any remaining issues in the AutoLISP translation system');
console.log('Run these through the actual translator to identify and fix all bugs!');
