#!/usr/bin/env python3
"""
Fixed version of LLM-generated code with proper dimension and text rendering
"""

import ezdxf
from ezdxf import units

print("🔧 Testing LLM-Generated Code (Fixed Version)")
print("=" * 50)

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
    if name not in doc.layers:
        layer = doc.layers.add(name)
        layer.color = props["color"]
        # Note: lineweight might not be supported in all DXF versions

print("✅ Layers created successfully")

# FIXED: Proper text style creation with required 'font' parameter
try:
    if "STANDARD" not in doc.styles:
        style = doc.styles.add("STANDARD", font="arial.ttf")
        style.dxf.height = 2.5
    print("✅ Text style created successfully")
except Exception as e:
    print(f"⚠️ Text style creation issue: {e}")
    # Use default STANDARD style if it exists
    pass

# ENHANCED: Dimension style for structural drawings with comprehensive settings
try:
    if "STRUCTURAL" in doc.dimstyles:
        del doc.dimstyles["STRUCTURAL"]
    
    dimstyle = doc.dimstyles.add("STRUCTURAL")
    
    # Essential dimension style settings
    dimstyle.dxf.dimtxt = 2.5      # Text height
    dimstyle.dxf.dimasz = 2.5      # Arrow size
    dimstyle.dxf.dimexo = 3.0      # Extension line offset
    dimstyle.dxf.dimexe = 2.0      # Extension line extension
    
    # CRITICAL: These settings ensure proper rendering
    dimstyle.dxf.dimse1 = 0        # Show first extension line
    dimstyle.dxf.dimse2 = 0        # Show second extension line
    dimstyle.dxf.dimtad = 1        # Text above dimension line
    dimstyle.dxf.dimgap = 1.0      # Gap between text and dimension line
    
    # Measurement and display settings
    dimstyle.dxf.dimscale = 1.0    # Overall scale factor
    dimstyle.dxf.dimlfac = 1.0     # Linear measurement factor
    dimstyle.dxf.dimdec = 0        # Decimal places
    dimstyle.dxf.dimlunit = 2      # Linear unit format (decimal)
    
    print("✅ Enhanced dimension style created successfully")
except Exception as e:
    print(f"❌ Dimension style creation failed: {e}")

# Define the 1-meter line (1000mm)
start_point = (0, 0)
end_point = (1000, 0)

# Draw the 1-meter line
line = msp.add_line(start_point, end_point, dxfattribs={"layer": "0-STRUCTURAL-TEST"})
print(f"✅ Line created: {start_point} to {end_point}")

# ENHANCED: Add dimension line with proper configuration
try:
    dimension = msp.add_linear_dim(
        base=(500, 500),  # Dimension line position (center)
        p1=start_point,   # First extension line
        p2=end_point,     # Second extension line
        dimstyle="STRUCTURAL",
        dxfattribs={"layer": "2-DIMENSIONS-LINEAR"}
    )
    
    # CRITICAL: Must call render() to generate dimension geometry
    dimension.render()
    print("✅ Dimension created and rendered successfully")
    
except Exception as e:
    print(f"❌ Dimension creation failed: {e}")

# FIXED: Add descriptive text with proper syntax
try:
    text1 = msp.add_text(
        "1.0 m",
        dxfattribs={
            "layer": "3-TEXT-ANNOTATIONS",
            "height": 2.5
        }
    )
    text1.set_placement((500, -200), align="CENTER")
    print("✅ Text 1 created successfully")
    
except Exception as e:
    print(f"❌ Text 1 creation failed: {e}")

# FIXED: Additional annotation text
try:
    text2 = msp.add_text(
        "TEST LINE - 1000mm LENGTH",
        dxfattribs={
            "layer": "3-TEXT-ANNOTATIONS", 
            "height": 2.0
        }
    )
    text2.set_placement((500, 200), align="CENTER")
    print("✅ Text 2 created successfully")
    
except Exception as e:
    print(f"❌ Text 2 creation failed: {e}")

# Save the drawing
try:
    doc.saveas("test_line_1m_fixed.dxf")
    print("✅ DXF file saved: test_line_1m_fixed.dxf")
except Exception as e:
    print(f"❌ DXF save failed: {e}")

# Verify the created DXF file
try:
    verify_doc = ezdxf.readfile("test_line_1m_fixed.dxf")
    verify_msp = verify_doc.modelspace()
    
    entity_counts = {}
    for entity in verify_msp:
        entity_type = entity.dxftype()
        entity_counts[entity_type] = entity_counts.get(entity_type, 0) + 1
    
    print("\n📊 DXF VERIFICATION:")
    for entity_type, count in sorted(entity_counts.items()):
        print(f"   {entity_type}: {count}")
    
    dimension_count = entity_counts.get('DIMENSION', 0)
    text_count = entity_counts.get('TEXT', 0)
    
    print(f"\n📐 Dimensions: {dimension_count}")
    print(f"📝 Text entities: {text_count}")
    
    if dimension_count > 0:
        print("🎉 SUCCESS: Dimensions are being created!")
    else:
        print("❌ ISSUE: No dimensions found in DXF")
        
    if text_count > 0:
        print("🎉 SUCCESS: Text entities are being created!")
    else:
        print("❌ ISSUE: No text entities found in DXF")
        
except Exception as e:
    print(f"❌ DXF verification failed: {e}")

print("\n" + "=" * 50)