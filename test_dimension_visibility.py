#!/usr/bin/env python3
"""
Test script to verify dimension text visibility
This script generates a simple drawing with dimensions to test visibility
"""

import ezdxf

# Create document with setup=True for dimension styles
doc = ezdxf.new("R2010", setup=True)
msp = doc.modelspace()

# Ensure Standard text style exists and is properly configured
if "Standard" not in doc.styles:
    doc.styles.add("Standard", font="arial.ttf")
text_style = doc.styles.get("Standard")
text_style.dxf.height = 0  # Variable height
text_style.dxf.width = 1.0  # Width factor

# Create layers
doc.layers.add(name="CONSTRUCTION", color=7)
doc.layers.add(name="DIMENSIONS", color=1)

# Configure dimension style for VISIBLE text and arrows
dimstyle = doc.dimstyles.get("Standard")
# CRITICAL: Text visibility settings
dimstyle.dxf.dimtxt = 200        # Text height (LARGE for visibility)
dimstyle.dxf.dimasz = 80         # Arrow size
dimstyle.dxf.dimexe = 40         # Extension beyond dimension line
dimstyle.dxf.dimexo = 24          # Extension line offset
dimstyle.dxf.dimgap = 24         # Gap around text
# Text positioning and visibility
dimstyle.dxf.dimtad = 1          # Text above dimension line
dimstyle.dxf.dimjust = 0         # Center text horizontally
dimstyle.dxf.dimtih = 0          # Text inside horizontal
dimstyle.dxf.dimtoh = 0          # Text outside horizontal
# Colors for visibility
dimstyle.dxf.dimclrt = 1         # Text color (red)
dimstyle.dxf.dimclrd = 1         # Dimension line color (red)
dimstyle.dxf.dimclre = 1         # Extension line color (red)
# Arrow configuration
dimstyle.dxf.dimblk = ""         # Use default arrow blocks
dimstyle.dxf.dimblk1 = ""        # First arrow block
dimstyle.dxf.dimblk2 = ""        # Second arrow block
dimstyle.dxf.dimtsz = 0          # Use arrows (not ticks)
# Force text display
dimstyle.dxf.dimtxsty = "Standard"  # Use standard text style
dimstyle.dxf.dimscale = 1.0      # Overall scale factor

# CRITICAL: Force dimension text visibility
dimstyle.dxf.dimtfac = 1.0       # Text scale factor
dimstyle.dxf.dimlfac = 1.0       # Linear scale factor
dimstyle.dxf.dimrnd = 0          # Rounding value
dimstyle.dxf.dimdec = 0          # Decimal places
dimstyle.dxf.dimzin = 0          # Zero suppression

# Add drawing elements
msp.add_line((0, 0), (2000, 0), dxfattribs={"layer": "CONSTRUCTION"})

# Add dimensions
dim1 = msp.add_linear_dim(
    base=(1000, -300),
    p1=(0, 0),
    p2=(2000, 0),
    dimstyle="Standard",
    text="<>",
    dxfattribs={"layer": "DIMENSIONS"}
)
dim1.render()

# Add a test text to verify text style works
msp.add_text(
    "TEST TEXT 200 HEIGHT",
    height=200,
    dxfattribs={
        "layer": "DIMENSIONS",
        "color": 1,
        "style": "Standard"
    }
).set_placement((1000, 500))

# Save the drawing
doc.saveas("test_dimension_visibility.dxf")

print("Test drawing created: test_dimension_visibility.dxf")
print("Check if:")
print("1. Dimension text '2000' is visible")
print("2. Dimension arrows are visible")
print("3. Test text is visible")
print("4. All elements are in red color")
