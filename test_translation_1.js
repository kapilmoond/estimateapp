// Test AutoLISP Translation
const autolispCode = `; Test 1: Simple Foundation Plan
; Setup layers and properties
(layer "CONSTRUCTION")
(color 1)
(linetype "CONTINUOUS")

; Main foundation outline 12m x 8m
(rectangle 0 0 12000 8000)

; Center dividing wall
(line 6000 0 6000 8000)

; Switch to dimensions layer
(layer "DIMENSIONS")
(color 5)

; Add dimensions
(dimension 0 0 12000 0 6000 -1000)
(dimension 0 0 0 8000 -1000 4000)
(text 6000 -1500 300 "12000mm")
(text -1500 4000 300 "8000mm")

; Add labels
(layer "TEXT")
(color 7)
(text 6000 4000 400 "FOUNDATION PLAN")
(text 3000 2000 250 "ROOM A")
(text 9000 2000 250 "ROOM B")`;

// This would be translated to Python as:
const expectedPython = `import ezdxf
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

# Set current layer to CONSTRUCTION
# Note: Layer should be created in setup if not exists
# Set current color to 1
# Note: Color will be applied to subsequent entities
# Set current linetype to CONTINUOUS
# Note: Linetype will be applied to subsequent entities
# Rectangle from (0, 0) to (12000, 8000)
points = [(0, 0), (12000, 0), (12000, 8000), (0, 8000)]
msp.add_lwpolyline(points, close=True)
# Line from (6000, 0) to (6000, 8000)
msp.add_line((6000, 0), (6000, 8000))
# Set current layer to DIMENSIONS
# Note: Layer should be created in setup if not exists
# Set current color to 5
# Note: Color will be applied to subsequent entities
# Linear dimension from (0, 0) to (12000, 0)
dim = msp.add_linear_dim(
    base=(6000, -1000),
    p1=(0, 0),
    p2=(12000, 0),
    dxfattribs={'layer': 'DIMENSIONS'}
)
dim.render()
# Linear dimension from (0, 0) to (0, 8000)
dim = msp.add_linear_dim(
    base=(-1000, 4000),
    p1=(0, 0),
    p2=(0, 8000),
    dxfattribs={'layer': 'DIMENSIONS'}
)
dim.render()
# Text "12000mm" at (6000, -1500) with height 300
msp.add_text("12000mm", dxfattribs={'insert': (6000, -1500), 'height': 300, 'layer': 'TEXT'})
# Text "8000mm" at (-1500, 4000) with height 300
msp.add_text("8000mm", dxfattribs={'insert': (-1500, 4000), 'height': 300, 'layer': 'TEXT'})
# Set current layer to TEXT
# Note: Layer should be created in setup if not exists
# Set current color to 7
# Note: Color will be applied to subsequent entities
# Text "FOUNDATION PLAN" at (6000, 4000) with height 400
msp.add_text("FOUNDATION PLAN", dxfattribs={'insert': (6000, 4000), 'height': 400, 'layer': 'TEXT'})
# Text "ROOM A" at (3000, 2000) with height 250
msp.add_text("ROOM A", dxfattribs={'insert': (3000, 2000), 'height': 250, 'layer': 'TEXT'})
# Text "ROOM B" at (9000, 2000) with height 250
msp.add_text("ROOM B", dxfattribs={'insert': (9000, 2000), 'height': 250, 'layer': 'TEXT'})

# Save the drawing
doc.saveas("technical_drawing.dxf")
`;

console.log("AutoLISP Code:");
console.log(autolispCode);
console.log("\nExpected Python Translation:");
console.log(expectedPython);
