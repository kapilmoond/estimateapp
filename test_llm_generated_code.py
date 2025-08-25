#!/usr/bin/env python3
"""
Test the LLM-generated code to identify dimension and text rendering issues
"""

import ezdxf
from ezdxf import units

# Professional document setup
doc = ezdxf.new("R2010", setup=True)
doc.units = units.MM
msp = doc.modelspace()

# Create standard layers for this simple test
layers = {
    "0-STRUCTURAL-TEST": {"color": 1, "lineweight": 50},
    "2-DIMENSIONS-LINEAR": {"color": 256, "lineweight": 18},
    "3-TEXT-ANNOTATIONS": {"color": 256, "lineweight": 18}
}

for name, props in layers.items():
    layer = doc.layers.add(name)
    layer.color = props["color"]
    layer.lineweight = props["lineweight"]

# Standard text styles
doc.styles.add("STANDARD").dxf.height = 2.5

# Dimension style for structural drawings
dimstyle = doc.dimstyles.add("STRUCTURAL")
dimstyle.dxf.dimtxt = 2.5  # Text height
dimstyle.dxf.dimasz = 2.5  # Arrow size
dimstyle.dxf.dimexo = 3.0  # Extension line offset
dimstyle.dxf.dimexe = 2.0  # Extension line extension

# Define the 1-meter line (1000mm)
start_point = (0, 0)
end_point = (1000, 0)

# Draw the 1-meter line
msp.add_line(start_point, end_point, dxfattribs={"layer": "0-STRUCTURAL-TEST"})

# Add dimension line with 500mm offset above the line
dimension = msp.add_linear_dim(
    base=(500, 500),  # Dimension line position (center)
    p1=start_point,   # First extension line
    p2=end_point,     # Second extension line
    dimstyle="STRUCTURAL",
    dxfattribs={"layer": "2-DIMENSIONS-LINEAR"}
)
dimension.render()

# Add descriptive text below the line
text_position = (500, -200)
msp.add_text(
    "1.0 m",
    dxfattribs={
        "layer": "3-TEXT-ANNOTATIONS",
        "style": "STANDARD",
        "height": 2.5
    }
).set_placement(text_position, align="CENTER")

# Additional annotation text
msp.add_text(
    "TEST LINE - 1000mm LENGTH",
    dxfattribs={
        "layer": "3-TEXT-ANNOTATIONS",
        "style": "STANDARD",
        "height": 2.0
    }
).set_placement((500, 200), align="CENTER")

# Save the drawing
doc.saveas("test_line_1m.dxf")

print("✅ DXF file created: test_line_1m.dxf")