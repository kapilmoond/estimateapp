# EZDXF DIMENSION & EXTENSION LINE TUTORIAL - PART 2
## Advanced Techniques and Complete Construction Examples

## 9. ANGULAR DIMENSIONS WITH EXTENSION LINES
```python
def create_angular_dimension_with_extensions(msp, center, start_angle, end_angle, radius=5000):
    """Create angular dimension with proper extension lines"""
    
    import math
    
    # Calculate arc points
    start_rad = math.radians(start_angle)
    end_rad = math.radians(end_angle)
    
    # Define the arc for angular measurement
    arc_start = [center[0] + radius * math.cos(start_rad), 
                 center[1] + radius * math.sin(start_rad)]
    arc_end = [center[0] + radius * math.cos(end_rad), 
               center[1] + radius * math.sin(end_rad)]
    
    # Create angular dimension
    angular_dim = msp.add_angular_dim_2l(
        base=center,
        line1=(center, arc_start),
        line2=(center, arc_end),
        dimstyle="STRUCTURAL",
        dxfattribs={'layer': '2-DIMENSIONS-ANGULAR'}
    )
    
    # CRITICAL: Render for extension line creation
    angular_dim.render()
    
    print(f"✅ Angular dimension: {end_angle - start_angle}° with extension lines")
    return angular_dim

# Example: Corner angle dimension
corner_center = [0, 0]
angle_dim = create_angular_dimension_with_extensions(msp, corner_center, 0, 90, 3000)
```

## 10. RADIAL DIMENSIONS FOR CIRCULAR ELEMENTS
```python
def create_radial_dimensions(msp, center, radius, dimension_type="radius"):
    """Create radial or diameter dimensions with proper formatting"""
    
    # Create circle for reference
    circle = msp.add_circle(center, radius, dxfattribs={"layer": "0-GEOMETRY"})
    
    # Calculate dimension point (45-degree angle for clarity)
    import math
    angle = math.radians(45)
    dim_point = [center[0] + radius * math.cos(angle),
                 center[1] + radius * math.sin(angle)]
    
    if dimension_type == "radius":
        # Radius dimension
        rad_dim = msp.add_radius_dim(
            center=center,
            radius=radius,
            angle=45,  # Angle in degrees for dimension placement
            dimstyle="STRUCTURAL",
            dxfattribs={'layer': '2-DIMENSIONS-RADIAL'}
        )
        rad_dim.render()
        print(f"✅ Radius dimension: R{radius}")
        return rad_dim
    
    else:  # diameter
        # Diameter dimension
        dia_dim = msp.add_diameter_dim(
            center=center,
            radius=radius,
            angle=45,
            dimstyle="STRUCTURAL", 
            dxfattribs={'layer': '2-DIMENSIONS-RADIAL'}
        )
        dia_dim.render()
        print(f"✅ Diameter dimension: Ø{radius * 2}")
        return dia_dim

# Example: Column with radius dimension
column_center = [3000, 3000]
column_radius = 200
radius_dim = create_radial_dimensions(msp, column_center, column_radius, "radius")
```

## 11. COMPREHENSIVE STRUCTURAL DRAWING WITH DIMENSIONS
```python
def create_complete_structural_plan():
    """Complete structural plan with all dimension types and extension lines"""
    
    # Grid system
    grid_spacing = 6000
    grid_lines_x = 5  # A through E
    grid_lines_y = 4  # 1 through 4
    
    # Create grid lines
    for i in range(grid_lines_x):
        x = i * grid_spacing
        grid_line = msp.add_line(
            (x, 0), (x, (grid_lines_y - 1) * grid_spacing),
            dxfattribs={"layer": "1-GRID", "color": 8}
        )
        
        # Grid labels
        label = chr(65 + i)  # A, B, C, D, E
        msp.add_text(
            label, height=500,
            dxfattribs={"layer": "1-GRID-LABELS"}
        ).set_placement((x, -1000), align="MIDDLE_CENTER")
    
    for j in range(grid_lines_y):
        y = j * grid_spacing
        grid_line = msp.add_line(
            (0, y), ((grid_lines_x - 1) * grid_spacing, y),
            dxfattribs={"layer": "1-GRID", "color": 8}
        )
        
        # Grid labels
        msp.add_text(
            str(j + 1), height=500,
            dxfattribs={"layer": "1-GRID-LABELS"}
        ).set_placement((-1000, y), align="MIDDLE_CENTER")
    
    # Columns at grid intersections
    column_size = 400
    columns = []
    for i in range(grid_lines_x):
        for j in range(grid_lines_y):
            x = i * grid_spacing
            y = j * grid_spacing
            
            # Square column
            col_points = [
                (x - column_size/2, y - column_size/2),
                (x + column_size/2, y - column_size/2),
                (x + column_size/2, y + column_size/2),
                (x - column_size/2, y + column_size/2),
                (x - column_size/2, y - column_size/2)
            ]
            
            column = msp.add_lwpolyline(
                col_points,
                dxfattribs={"layer": "0-STRUCTURAL-COLUMNS", "closed": True}
            )
            columns.append((x, y, column))
    
    # Beams connecting columns
    beam_width = 300
    beams = []
    
    # Horizontal beams
    for j in range(grid_lines_y):
        y = j * grid_spacing
        for i in range(grid_lines_x - 1):
            x1 = i * grid_spacing + column_size/2
            x2 = (i + 1) * grid_spacing - column_size/2
            
            beam_points = [
                (x1, y - beam_width/2),
                (x2, y - beam_width/2),
                (x2, y + beam_width/2),
                (x1, y + beam_width/2),
                (x1, y - beam_width/2)
            ]
            
            beam = msp.add_lwpolyline(
                beam_points,
                dxfattribs={"layer": "0-STRUCTURAL-BEAMS", "closed": True}
            )
            beams.append(beam)
    
    # Vertical beams
    for i in range(grid_lines_x):
        x = i * grid_spacing
        for j in range(grid_lines_y - 1):
            y1 = j * grid_spacing + column_size/2
            y2 = (j + 1) * grid_spacing - column_size/2
            
            beam_points = [
                (x - beam_width/2, y1),
                (x + beam_width/2, y1),
                (x + beam_width/2, y2),
                (x - beam_width/2, y2),
                (x - beam_width/2, y1)
            ]
            
            beam = msp.add_lwpolyline(
                beam_points,
                dxfattribs={"layer": "0-STRUCTURAL-BEAMS", "closed": True}
            )
            beams.append(beam)
    
    return columns, beams

def dimension_structural_plan():
    """Add comprehensive dimensions to structural plan"""
    
    # Overall dimensions (perimeter)
    total_width = 4 * grid_spacing
    total_height = 3 * grid_spacing
    
    # Bottom overall dimension
    dim_bottom = create_dimension_with_full_extension_lines(
        msp, [0, 0], [total_width, 0], -6000
    )
    
    # Left overall dimension
    dim_left = create_dimension_with_full_extension_lines(
        msp, [0, 0], [0, total_height], -6000
    )
    
    # Grid spacing dimensions (bottom)
    for i in range(4):
        x1 = i * grid_spacing
        x2 = (i + 1) * grid_spacing
        dim_grid = create_dimension_with_full_extension_lines(
            msp, [x1, 0], [x2, 0], -3000
        )
    
    # Grid spacing dimensions (left)
    for j in range(3):
        y1 = j * grid_spacing
        y2 = (j + 1) * grid_spacing
        dim_grid = create_dimension_with_full_extension_lines(
            msp, [0, y1], [0, y2], -3000
        )
    
    # Column dimensions
    col_center = [0, 0]
    col_dim_x = create_dimension_with_full_extension_lines(
        msp, [col_center[0] - column_size/2, col_center[1]], 
        [col_center[0] + column_size/2, col_center[1]], 3000
    )
    
    col_dim_y = create_dimension_with_full_extension_lines(
        msp, [col_center[0], col_center[1] - column_size/2], 
        [col_center[0], col_center[1] + column_size/2], 3000
    )
    
    print("✅ Complete structural plan dimensioned")

# Create complete example
columns, beams = create_complete_structural_plan()
dimension_structural_plan()
```

## 12. REINFORCEMENT DETAILING WITH DIMENSIONS
```python
def create_reinforcement_details():
    """Create detailed reinforcement with proper dimensioning"""
    
    # Beam cross-section for reinforcement detail
    beam_width = 300
    beam_height = 600
    cover = 40  # Concrete cover
    
    # Beam outline
    beam_outline = [
        (0, 0), (beam_width, 0),
        (beam_width, beam_height), (0, beam_height), (0, 0)
    ]
    
    beam_section = msp.add_lwpolyline(
        beam_outline,
        dxfattribs={"layer": "0-CONCRETE", "closed": True}
    )
    
    # Add hatching for concrete
    hatch = msp.add_hatch(color=8)
    hatch.paths.add_polyline_path(beam_outline, is_closed=True)
    hatch.set_pattern_fill("ANSI31", scale=0.5)
    
    # Reinforcement bars
    rebar_diameter = 20
    bar_spacing = 60
    
    # Bottom reinforcement (tension)
    bottom_bars = []
    num_bottom_bars = 4
    bar_start_x = cover + rebar_diameter/2
    bar_spacing_actual = (beam_width - 2*cover - rebar_diameter) / (num_bottom_bars - 1)
    
    for i in range(num_bottom_bars):
        x = bar_start_x + i * bar_spacing_actual
        y = cover + rebar_diameter/2
        
        bar = msp.add_circle(
            (x, y), rebar_diameter/2,
            dxfattribs={"layer": "0-REINFORCEMENT"}
        )
        bottom_bars.append((x, y))
    
    # Top reinforcement (compression)
    top_bars = []
    num_top_bars = 2
    top_bar_spacing = (beam_width - 2*cover - rebar_diameter) / (num_top_bars - 1)
    
    for i in range(num_top_bars):
        x = bar_start_x + i * top_bar_spacing
        y = beam_height - cover - rebar_diameter/2
        
        bar = msp.add_circle(
            (x, y), rebar_diameter/2,
            dxfattribs={"layer": "0-REINFORCEMENT"}
        )
        top_bars.append((x, y))
    
    # Stirrups (ties)
    stirrup_spacing = 150
    stirrup_positions = range(0, beam_width + 1, stirrup_spacing)
    
    for x_pos in stirrup_positions:
        if x_pos <= beam_width:
            stirrup_outline = [
                (cover, cover),
                (beam_width - cover, cover),
                (beam_width - cover, beam_height - cover),
                (cover, beam_height - cover),
                (cover, cover)
            ]
            
            stirrup = msp.add_lwpolyline(
                stirrup_outline,
                dxfattribs={"layer": "0-STIRRUPS", "lineweight": 13}
            )
    
    # Dimension the reinforcement details
    
    # Overall beam dimensions
    beam_width_dim = create_dimension_with_full_extension_lines(
        msp, [0, 0], [beam_width, 0], -2000
    )
    
    beam_height_dim = create_dimension_with_full_extension_lines(
        msp, [0, 0], [0, beam_height], -2000
    )
    
    # Cover dimensions
    cover_bottom_dim = create_dimension_with_full_extension_lines(
        msp, [0, 0], [0, cover], -1000
    )
    
    cover_side_dim = create_dimension_with_full_extension_lines(
        msp, [0, 0], [cover, 0], -1000
    )
    
    # Bar spacing dimensions
    if len(bottom_bars) > 1:
        bar_spacing_dim = create_dimension_with_full_extension_lines(
            msp, [bottom_bars[0][0], bottom_bars[0][1]], 
            [bottom_bars[1][0], bottom_bars[1][1]], 1000
        )
    
    # Add reinforcement labels
    msp.add_text(
        f"4-Ø{rebar_diameter} BOTTOM", height=100,
        dxfattribs={"layer": "2-TEXT-REINFORCEMENT"}
    ).set_placement((beam_width/2, -500), align="MIDDLE_CENTER")
    
    msp.add_text(
        f"2-Ø{rebar_diameter} TOP", height=100,
        dxfattribs={"layer": "2-TEXT-REINFORCEMENT"}
    ).set_placement((beam_width/2, beam_height + 500), align="MIDDLE_CENTER")
    
    msp.add_text(
        f"Ø8@{stirrup_spacing} STIRRUPS", height=100,
        dxfattribs={"layer": "2-TEXT-REINFORCEMENT"}
    ).set_placement((beam_width + 1000, beam_height/2), align="MIDDLE_LEFT")
    
    print("✅ Reinforcement details with dimensions created")
    
    return beam_section, bottom_bars, top_bars

# Create reinforcement details
rebar_details = create_reinforcement_details()
```

## 13. ADVANCED DIMENSION OVERRIDE TECHNIQUES
```python
def create_custom_dimension_overrides():
    """Demonstrate advanced dimension customization with overrides"""
    
    # Create element to dimension
    element_start = [10000, 0]
    element_end = [13500, 0]
    
    # Standard dimension
    standard_dim = msp.add_linear_dim(
        base=[11750, 2000],
        p1=element_start,
        p2=element_end,
        dimstyle="STRUCTURAL",
        dxfattribs={'layer': '2-DIMENSIONS-LINEAR'}
    )
    standard_dim.render()
    
    # Custom dimension with overrides
    custom_dim = msp.add_linear_dim(
        base=[11750, 4000],
        p1=element_start,
        p2=element_end,
        dimstyle="STRUCTURAL",
        dxfattribs={'layer': '2-DIMENSIONS-LINEAR'}
    )
    
    # Apply custom overrides
    overrides = custom_dim.override()
    
    # Custom text and formatting
    overrides["dimtxt"] = 3.5          # Larger text
    overrides["dimclrt"] = 1           # Red text color
    overrides["dimasz"] = 4.0          # Larger arrows
    overrides["dimexe"] = 2.0          # Longer extension lines
    overrides["dimexo"] = 1.0          # Different offset
    overrides["dimgap"] = 1.0          # Text gap
    overrides["dimtad"] = 1            # Text above line
    
    # Custom dimension text (override measurement)
    custom_dim.dxf.text = "3500 TYP."  # Custom text instead of measurement
    
    custom_dim.render()
    
    # Dimension with tolerance
    tolerance_dim = msp.add_linear_dim(
        base=[11750, 6000],
        p1=element_start,
        p2=element_end,
        dimstyle="STRUCTURAL",
        dxfattribs={'layer': '2-DIMENSIONS-LINEAR'}
    )
    
    # Add tolerance settings
    tol_overrides = tolerance_dim.override()
    tol_overrides["dimtol"] = 1        # Enable tolerance
    tol_overrides["dimtp"] = 5         # Plus tolerance
    tol_overrides["dimtm"] = 5         # Minus tolerance
    tol_overrides["dimtfac"] = 0.7     # Tolerance text scale
    
    tolerance_dim.render()
    
    print("✅ Custom dimension overrides applied")
    
    return standard_dim, custom_dim, tolerance_dim

# Create custom dimensions
custom_dims = create_custom_dimension_overrides()
```

## 14. DIMENSION CHAIN CREATION
```python
def create_dimension_chain(points, offset_distance=5000, chain_type="horizontal"):
    """Create a chain of dimensions for multiple points"""
    
    dimensions = []
    
    if chain_type == "horizontal":
        # Individual dimensions
        for i in range(len(points) - 1):
            dim = create_dimension_with_full_extension_lines(
                msp, points[i], points[i+1], offset_distance
            )
            dimensions.append(dim)
        
        # Overall dimension
        overall_dim = create_dimension_with_full_extension_lines(
            msp, points[0], points[-1], offset_distance + 2000
        )
        dimensions.append(overall_dim)
    
    elif chain_type == "vertical":
        # Vertical dimension chain
        for i in range(len(points) - 1):
            # Swap x and y for vertical dimensions
            p1 = [points[i][1], points[i][0]]
            p2 = [points[i+1][1], points[i+1][0]]
            dim = create_dimension_with_full_extension_lines(
                msp, p1, p2, offset_distance
            )
            dimensions.append(dim)
        
        # Overall vertical dimension
        p1_overall = [points[0][1], points[0][0]]
        p2_overall = [points[-1][1], points[-1][0]]
        overall_dim = create_dimension_with_full_extension_lines(
            msp, p1_overall, p2_overall, offset_distance + 2000
        )
        dimensions.append(overall_dim)
    
    print(f"✅ Dimension chain created: {len(dimensions)} dimensions")
    return dimensions

# Example: Door and window openings
opening_points = [
    [0, 0],      # Wall start
    [1500, 0],   # First opening start
    [2400, 0],   # First opening end  
    [4000, 0],   # Second opening start
    [5200, 0],   # Second opening end
    [8000, 0]    # Wall end
]

dimension_chain = create_dimension_chain(opening_points, 4000, "horizontal")
```

## 15. FINAL COMPLETE EXAMPLE WITH ALL TECHNIQUES
```python
def create_master_structural_drawing():
    """Master example combining all dimension and extension line techniques"""
    
    print("Creating master structural drawing with complete dimensioning...")
    
    # 1. Setup layers and styles (already done above)
    
    # 2. Create main structural elements
    columns_data, beams_data = create_complete_structural_plan()
    
    # 3. Add detailed sections
    rebar_section = create_reinforcement_details()
    
    # 4. Add comprehensive dimensioning
    dimension_structural_plan()
    
    # 5. Add custom dimensions with overrides
    custom_examples = create_custom_dimension_overrides()
    
    # 6. Add dimension chains for complex elements
    facade_points = [
        [15000, 0], [17000, 0], [19000, 0], [21000, 0], [23000, 0]
    ]
    facade_dims = create_dimension_chain(facade_points, 5000)
    
    # 7. Add angular dimensions for corners
    corner_angles = [
        ([25000, 0], 0, 90),
        ([25000, 5000], 90, 180),
        ([20000, 5000], 180, 270),
        ([20000, 0], 270, 360)
    ]
    
    for center, start_angle, end_angle in corner_angles:
        angle_dim = create_angular_dimension_with_extensions(
            msp, center, start_angle, end_angle, 2000
        )
    
    # 8. Add radial dimensions for circular elements
    circular_elements = [
        ([27000, 2500], 500, "radius"),
        ([29000, 2500], 300, "diameter")
    ]
    
    for center, radius, dim_type in circular_elements:
        radial_dim = create_radial_dimensions(msp, center, radius, dim_type)
    
    # 9. Add title block and drawing information
    title_block_corner = [30000, -3000]
    title_block = msp.add_lwpolyline([
        title_block_corner,
        (title_block_corner[0] + 8000, title_block_corner[1]),
        (title_block_corner[0] + 8000, title_block_corner[1] + 2000),
        (title_block_corner[0], title_block_corner[1] + 2000),
        title_block_corner
    ], dxfattribs={"layer": "0-TITLE-BLOCK", "closed": True})
    
    # Add title text
    msp.add_text(
        "STRUCTURAL PLAN - GROUND FLOOR", height=300,
        dxfattribs={"layer": "0-TITLE-TEXT"}
    ).set_placement((title_block_corner[0] + 4000, title_block_corner[1] + 1500), 
                   align="MIDDLE_CENTER")
    
    msp.add_text(
        "SCALE: 1:100", height=200,
        dxfattribs={"layer": "0-TITLE-TEXT"}
    ).set_placement((title_block_corner[0] + 4000, title_block_corner[1] + 1000), 
                   align="MIDDLE_CENTER")
    
    msp.add_text(
        "ALL DIMENSIONS IN MILLIMETERS", height=150,
        dxfattribs={"layer": "0-TITLE-TEXT"}
    ).set_placement((title_block_corner[0] + 4000, title_block_corner[1] + 500), 
                   align="MIDDLE_CENTER")
    
    print("✅ Master structural drawing completed")
    
    # 10. Final verification
    verify_dimension_setup(doc, msp)
    
    return True

# Create the master example
master_drawing = create_master_structural_drawing()

# Save final DXF
doc.saveas("MASTER_STRUCTURAL_PLAN_WITH_DIMENSIONS.dxf")
print("🎉 COMPLETE! Master structural plan saved with all dimension types and extension lines")
```

## 16. TROUBLESHOOTING COMMON ISSUES

### Extension Lines Not Visible
**Problem**: Extension lines appear missing or incomplete
**Solutions**:
1. Check `dimexe` value (must be > 0)
2. Verify `dimexo` offset is appropriate
3. Ensure `dimse1` and `dimse2` are set to 0 (show lines)
4. Always call `dimension.render()` after creation
5. Check layer visibility and color settings

### Dimension Text Overlapping Extension Lines
**Problem**: Text placement interferes with extension line visibility
**Solutions**:
1. Increase `dimgap` value for text clearance
2. Set `dimtad` to 1 (text above line)
3. Adjust `dimtvp` for vertical text position
4. Use appropriate `dimtxt` size for drawing scale

### Inconsistent Extension Line Lengths
**Problem**: Extension lines have varying lengths
**Solutions**:
1. Use consistent `offset_distance` in dimension creation
2. Set fixed `dimexe` value in dimension style
3. Avoid using `dimfxlon` unless specifically needed
4. Ensure proper base point calculation for dimension line

This completes the comprehensive 500+ line ezdxf tutorial covering all aspects of dimension and extension line creation, addressing the specific issues mentioned in your request.