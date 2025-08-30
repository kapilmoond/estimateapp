#!/usr/bin/env python3
"""
Test script to verify dimension arrows and tick marks visibility
This script creates dimensions with both arrow and tick configurations
"""

import ezdxf

def create_arrow_dimension_test():
    """Create test drawing with arrow-style dimensions"""
    print("Creating arrow dimension test...")
    
    # Create document
    doc = ezdxf.new("R2010", setup=True)
    msp = doc.modelspace()
    
    # Create layers
    doc.layers.add(name="CONSTRUCTION", color=7)
    doc.layers.add(name="DIMENSIONS", color=1)
    
    # Configure dimension style for ARROWS
    dimstyle = doc.dimstyles.get("Standard")
    dimstyle.dxf.dimtxt = 250        # Extra large text
    dimstyle.dxf.dimasz = 100        # Large arrow size
    dimstyle.dxf.dimtsz = 0          # No tick marks (use arrows)
    dimstyle.dxf.dimexe = 50         # Extension beyond dimension line
    dimstyle.dxf.dimexo = 30         # Extension line offset
    dimstyle.dxf.dimgap = 30         # Gap around text
    dimstyle.dxf.dimtad = 1          # Text above dimension line
    dimstyle.dxf.dimjust = 0         # Center text
    dimstyle.dxf.dimclrt = 1         # Red text
    dimstyle.dxf.dimclrd = 1         # Red dimension lines
    dimstyle.dxf.dimclre = 1         # Red extension lines
    dimstyle.dxf.dimblk = ""         # Default arrow block
    dimstyle.dxf.dimblk1 = ""        # First arrow block
    dimstyle.dxf.dimblk2 = ""        # Second arrow block
    
    # Add test line
    msp.add_line((0, 0), (2000, 0), dxfattribs={"layer": "CONSTRUCTION"})
    
    # Add dimension with arrows
    dim1 = msp.add_linear_dim(
        base=(1000, -400),
        p1=(0, 0),
        p2=(2000, 0),
        dimstyle="Standard",
        text="<>",
        dxfattribs={"layer": "DIMENSIONS", "color": 1}
    )
    dim1.render()
    
    # Add label
    msp.add_text(
        "ARROW STYLE DIMENSION",
        height=150,
        dxfattribs={"layer": "DIMENSIONS", "color": 1}
    ).set_placement((1000, 600))
    
    # Save
    doc.saveas("test_arrow_dimensions.dxf")
    print("Arrow dimension test saved: test_arrow_dimensions.dxf")

def create_tick_dimension_test():
    """Create test drawing with tick-style dimensions (slashes)"""
    print("Creating tick dimension test...")
    
    # Create document
    doc = ezdxf.new("R2010", setup=True)
    msp = doc.modelspace()
    
    # Create layers
    doc.layers.add(name="CONSTRUCTION", color=7)
    doc.layers.add(name="DIMENSIONS", color=1)
    
    # Configure dimension style for TICK MARKS (slashes)
    dimstyle = doc.dimstyles.get("Standard")
    dimstyle.dxf.dimtxt = 250        # Extra large text
    dimstyle.dxf.dimasz = 0          # No arrows
    dimstyle.dxf.dimtsz = 100        # Large tick marks (slashes)
    dimstyle.dxf.dimexe = 50         # Extension beyond dimension line
    dimstyle.dxf.dimexo = 30         # Extension line offset
    dimstyle.dxf.dimgap = 30         # Gap around text
    dimstyle.dxf.dimtad = 1          # Text above dimension line
    dimstyle.dxf.dimjust = 0         # Center text
    dimstyle.dxf.dimclrt = 1         # Red text
    dimstyle.dxf.dimclrd = 1         # Red dimension lines
    dimstyle.dxf.dimclre = 1         # Red extension lines
    
    # Add test line
    msp.add_line((0, 0), (2000, 0), dxfattribs={"layer": "CONSTRUCTION"})
    
    # Add dimension with tick marks
    dim1 = msp.add_linear_dim(
        base=(1000, -400),
        p1=(0, 0),
        p2=(2000, 0),
        dimstyle="Standard",
        text="<>",
        dxfattribs={"layer": "DIMENSIONS", "color": 1}
    )
    dim1.render()
    
    # Add label
    msp.add_text(
        "TICK MARK STYLE DIMENSION",
        height=150,
        dxfattribs={"layer": "DIMENSIONS", "color": 1}
    ).set_placement((1000, 600))
    
    # Save
    doc.saveas("test_tick_dimensions.dxf")
    print("Tick dimension test saved: test_tick_dimensions.dxf")

def create_combined_test():
    """Create test drawing with both styles for comparison"""
    print("Creating combined test...")
    
    # Create document
    doc = ezdxf.new("R2010", setup=True)
    msp = doc.modelspace()
    
    # Create layers
    doc.layers.add(name="CONSTRUCTION", color=7)
    doc.layers.add(name="DIMENSIONS", color=1)
    
    # Test line 1 - with arrows
    msp.add_line((0, 1000), (2000, 1000), dxfattribs={"layer": "CONSTRUCTION"})
    
    # Arrow style dimension
    dimstyle_arrow = doc.dimstyles.get("Standard")
    dimstyle_arrow.dxf.dimtxt = 250
    dimstyle_arrow.dxf.dimasz = 100      # Arrows
    dimstyle_arrow.dxf.dimtsz = 0        # No ticks
    dimstyle_arrow.dxf.dimtad = 1
    dimstyle_arrow.dxf.dimclrt = 1
    dimstyle_arrow.dxf.dimclrd = 1
    dimstyle_arrow.dxf.dimclre = 1
    
    dim1 = msp.add_linear_dim(
        base=(1000, 600),
        p1=(0, 1000),
        p2=(2000, 1000),
        dimstyle="Standard",
        text="<>",
        dxfattribs={"layer": "DIMENSIONS", "color": 1}
    )
    dim1.render()
    
    # Test line 2 - with tick marks
    msp.add_line((0, 0), (2000, 0), dxfattribs={"layer": "CONSTRUCTION"})
    
    # Create new dimension style for ticks
    tick_style = doc.dimstyles.add("TICK_STYLE")
    tick_style.dxf.dimtxt = 250
    tick_style.dxf.dimasz = 0            # No arrows
    tick_style.dxf.dimtsz = 100          # Tick marks
    tick_style.dxf.dimtad = 1
    tick_style.dxf.dimclrt = 1
    tick_style.dxf.dimclrd = 1
    tick_style.dxf.dimclre = 1
    tick_style.dxf.dimexe = 50
    tick_style.dxf.dimexo = 30
    tick_style.dxf.dimgap = 30
    
    dim2 = msp.add_linear_dim(
        base=(1000, -400),
        p1=(0, 0),
        p2=(2000, 0),
        dimstyle="TICK_STYLE",
        text="<>",
        dxfattribs={"layer": "DIMENSIONS", "color": 1}
    )
    dim2.render()
    
    # Add labels
    msp.add_text("ARROWS", height=150, dxfattribs={"layer": "DIMENSIONS", "color": 1}).set_placement((1000, 1400))
    msp.add_text("TICK MARKS", height=150, dxfattribs={"layer": "DIMENSIONS", "color": 1}).set_placement((1000, -800))
    
    # Save
    doc.saveas("test_combined_dimensions.dxf")
    print("Combined dimension test saved: test_combined_dimensions.dxf")

if __name__ == "__main__":
    print("Testing dimension visibility with arrows and tick marks...")
    print("=" * 60)
    
    create_arrow_dimension_test()
    create_tick_dimension_test() 
    create_combined_test()
    
    print("=" * 60)
    print("Test files created:")
    print("1. test_arrow_dimensions.dxf - Arrow style dimensions")
    print("2. test_tick_dimensions.dxf - Tick mark style dimensions")
    print("3. test_combined_dimensions.dxf - Both styles for comparison")
    print("")
    print("Check these files to see:")
    print("- Dimension text '2000' should be visible")
    print("- Either arrows or tick marks should be visible")
    print("- All elements should be in red color")
    print("- Text should be large and clear")
