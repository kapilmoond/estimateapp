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
    if name not in doc.layers:  # Check if layer exists first
        layer = doc.layers.add(name)
        layer.color = props["color"]
        layer.lineweight = props["lineweight"]

# FIXED: Standard text styles with required 'font' parameter
if "STANDARD" not in doc.styles:
    doc.styles.add("STANDARD", font="arial.ttf").dxf.height = 2.5

# ENHANCED: Dimension style for structural drawings with complete configuration
if "STRUCTURAL" in doc.dimstyles:
    del doc.dimstyles["STRUCTURAL"]

dimstyle = doc.dimstyles.add("STRUCTURAL")
dimstyle.dxf.dimtxt = 2.5  # Text height
dimstyle.dxf.dimasz = 2.5  # Arrow size
dimstyle.dxf.dimexo = 3.0  # Extension line offset
dimstyle.dxf.dimexe = 2.0  # Extension line extension

# CRITICAL ADDITIONS: These settings ensure proper dimension rendering
dimstyle.dxf.dimse1 = 0        # Show first extension line (0 = show)
dimstyle.dxf.dimse2 = 0        # Show second extension line (0 = show)
dimstyle.dxf.dimtad = 1        # Text above dimension line
dimstyle.dxf.dimgap = 1.0      # Gap between text and dimension line
dimstyle.dxf.dimscale = 1.0    # Overall scale factor
dimstyle.dxf.dimlfac = 1.0     # Linear measurement factor
dimstyle.dxf.dimdec = 0        # Decimal places for dimensions
dimstyle.dxf.dimlunit = 2      # Linear unit format (2 = decimal)

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
dimension.render()  # This was correct in the original

# FIXED: Add descriptive text with proper positioning method
msp.add_text(
    "1.0 m",
    dxfattribs={
        "layer": "3-TEXT-ANNOTATIONS",
        "height": 2.5,
        "insert": (500, -200),  # Direct position instead of set_placement
        "halign": 1,            # Center horizontal alignment
        "valign": 2             # Middle vertical alignment
    }
)

# FIXED: Additional annotation text with direct positioning
msp.add_text(
    "TEST LINE - 1000mm LENGTH",
    dxfattribs={
        "layer": "3-TEXT-ANNOTATIONS",
        "height": 2.0,
        "insert": (500, 200),   # Direct position
        "halign": 1             # Center alignment
    }
)

# Save the drawing
doc.saveas("test_line_1m_corrected.dxf")

print("✅ DXF file created with working dimensions and text!")
print("✅ File saved as: test_line_1m_corrected.dxf")