# Advanced EZDXF Construction Techniques

## Supplementary Guide for Complex Engineering Drawings

### 1. Advanced Structural Details

#### Steel Connection Details
```python
def create_steel_connection(msp, connection_type, position, size):
    """Create detailed steel connections"""
    if connection_type == "BOLTED":
        return create_bolted_connection(msp, position, size)
    elif connection_type == "WELDED":
        return create_welded_connection(msp, position, size)

def create_bolted_connection(msp, center, bolt_pattern):
    # Bolt circles
    for bolt_pos in bolt_pattern["positions"]:
        x, y = center[0] + bolt_pos[0], center[1] + bolt_pos[1]
        circle = msp.add_circle((x, y), bolt_pattern["diameter"]/2,
            dxfattribs={"layer": "0-STRUCTURAL-STEEL"})
        
        # Bolt annotation
        bolt_text = f"M{bolt_pattern['diameter']}"
        add_text_annotation(msp, bolt_text, (x, y-15), "NOTES")
```

#### Concrete Section Details
```python
def create_concrete_section(msp, section_type, dimensions, reinforcement):
    """Generate detailed concrete sections with reinforcement"""
    
    if section_type == "BEAM_SECTION":
        return create_beam_section(msp, dimensions, reinforcement)
    elif section_type == "COLUMN_SECTION":
        return create_column_section(msp, dimensions, reinforcement)

def create_beam_section(msp, dims, rebar):
    # Concrete outline
    width, height = dims["width"], dims["height"]
    cover = dims.get("cover", 25)  # 25mm default cover
    
    outline = [
        (0, 0), (width, 0), (width, height), (0, height), (0, 0)
    ]
    section = msp.add_lwpolyline(outline,
        dxfattribs={"layer": "0-STRUCTURAL-BEAMS", "closed": True})
    
    # Reinforcement bars
    bar_spacing = (width - 2*cover) / (rebar["bottom_bars"] - 1)
    for i in range(rebar["bottom_bars"]):
        x = cover + i * bar_spacing
        msp.add_circle((x, cover), rebar["bar_diameter"]/2,
            dxfattribs={"layer": "1-REINFORCEMENT-MAIN"})
    
    # Top bars
    if rebar.get("top_bars", 0) > 0:
        top_spacing = (width - 2*cover) / (rebar["top_bars"] - 1)
        for i in range(rebar["top_bars"]):
            x = cover + i * top_spacing
            msp.add_circle((x, height-cover), rebar["bar_diameter"]/2,
                dxfattribs={"layer": "1-REINFORCEMENT-MAIN"})
    
    # Stirrups
    stirrup_outline = [
        (cover, cover), (width-cover, cover), 
        (width-cover, height-cover), (cover, height-cover), (cover, cover)
    ]
    msp.add_lwpolyline(stirrup_outline,
        dxfattribs={"layer": "1-REINFORCEMENT-STIRRUPS"})
    
    return section
```

### 2. Professional Drawing Scales and Standards

#### Multi-Scale Drawing Management
```python
SCALE_FACTORS = {
    "1:1": 1,
    "1:5": 5,
    "1:10": 10,
    "1:20": 20,
    "1:25": 25,
    "1:50": 50,
    "1:100": 100,
    "1:200": 200,
    "1:500": 500,
    "1:1000": 1000
}

def setup_scale_dependent_elements(doc, scale):
    """Setup elements that depend on drawing scale"""
    scale_factor = SCALE_FACTORS.get(scale, 100)
    
    # Adjust dimension style
    if "STRUCTURAL" in doc.dimstyles:
        dimstyle = doc.dimstyles.get("STRUCTURAL")
        dimstyle.dxf.dimscale = scale_factor
        dimstyle.dxf.dimasz = 2.5 * scale_factor / 100  # Scale arrows
        dimstyle.dxf.dimtxt = 2.5 * scale_factor / 100  # Scale text
    
    # Adjust line type scale
    doc.header['$LTSCALE'] = scale_factor / 100
    
    return scale_factor
```

#### Drawing Sheet Layouts
```python
def create_sheet_layout(doc, sheet_size="A1", orientation="LANDSCAPE"):
    """Create professional sheet layout with title block"""
    
    SHEET_SIZES = {
        "A0": (841, 1189),
        "A1": (594, 841),
        "A2": (420, 594),
        "A3": (297, 420),
        "A4": (210, 297)
    }
    
    width, height = SHEET_SIZES[sheet_size]
    if orientation == "LANDSCAPE":
        width, height = height, width
    
    # Create paperspace layout
    layout = doc.layouts.new("SHEET1")
    
    # Drawing border
    border_margin = 10  # 10mm margin
    border_points = [
        (border_margin, border_margin),
        (width - border_margin, border_margin),
        (width - border_margin, height - border_margin),
        (border_margin, height - border_margin),
        (border_margin, border_margin)
    ]
    
    layout.add_lwpolyline(border_points,
        dxfattribs={"layer": "SHEET_BORDER"})
    
    # Title block (bottom right)
    create_title_block(layout, (width-200, border_margin), sheet_size)
    
    return layout
```

### 3. Advanced Annotation Techniques

#### Comprehensive Labeling System
```python
def create_element_label(msp, element_type, position, properties):
    """Create comprehensive element labels"""
    
    if element_type == "BEAM":
        return create_beam_label(msp, position, properties)
    elif element_type == "COLUMN":
        return create_column_label(msp, position, properties)

def create_beam_label(msp, position, beam_props):
    # Multi-line label
    lines = [
        f"BEAM {beam_props['mark']}",
        f"{beam_props['width']}x{beam_props['height']}",
        f"C{beam_props['concrete_grade']}",
        f"Main: {beam_props['main_rebar']}",
        f"Stirrups: {beam_props['stirrups']}"
    ]
    
    x, y = position
    line_height = 3.0  # 3mm line spacing
    
    for i, line in enumerate(lines):
        text_y = y - i * line_height
        if i == 0:  # First line (beam mark) - bold/larger
            add_text_annotation(msp, line, (x, text_y), "STANDARD")
        else:
            add_text_annotation(msp, line, (x, text_y), "NOTES")
    
    # Leader line if needed
    leader_end = (x - 20, y)  # 20mm leader
    msp.add_line(leader_end, position,
        dxfattribs={"layer": "3-TEXT-ANNOTATIONS"})
    
    return lines
```

#### Construction Detail Callouts
```python
def create_detail_callout(msp, detail_number, scale, position, radius=15):
    """Create detail callout bubble"""
    
    # Circle for detail number
    circle = msp.add_circle(position, radius,
        dxfattribs={"layer": "3-TEXT-ANNOTATIONS"})
    
    # Detail number
    add_text_annotation(msp, str(detail_number), position, "STANDARD")
    
    # Scale below
    scale_pos = (position[0], position[1] - radius - 5)
    add_text_annotation(msp, f"SCALE {scale}", scale_pos, "NOTES")
    
    return circle

def create_section_marker(msp, section_id, start_point, end_point):
    """Create section cut markers"""
    
    # Section line
    section_line = msp.add_line(start_point, end_point,
        dxfattribs={"layer": "4-SECTION-LINES", "linetype": "PHANTOM2"})
    
    # Arrow heads at both ends
    arrow_size = 5.0
    
    # Calculate arrow directions
    import math
    dx = end_point[0] - start_point[0]
    dy = end_point[1] - start_point[1]
    angle = math.atan2(dy, dx)
    
    # Start arrow (pointing right)
    start_arrow_points = [
        start_point,
        (start_point[0] + arrow_size * math.cos(angle + 2.617), 
         start_point[1] + arrow_size * math.sin(angle + 2.617)),
        (start_point[0] + arrow_size * math.cos(angle - 2.617),
         start_point[1] + arrow_size * math.sin(angle - 2.617)),
        start_point
    ]
    
    msp.add_lwpolyline(start_arrow_points,
        dxfattribs={"layer": "4-SECTION-LINES", "closed": True})
    
    # Section labels
    label_offset = 10
    start_label_pos = (start_point[0], start_point[1] + label_offset)
    end_label_pos = (end_point[0], end_point[1] + label_offset)
    
    add_text_annotation(msp, section_id, start_label_pos, "STANDARD")
    add_text_annotation(msp, section_id, end_label_pos, "STANDARD")
    
    return section_line
```

### 4. Material Representation and Hatching

#### Advanced Hatching Patterns
```python
def apply_material_hatch(msp, boundary_entity, material_type):
    """Apply material-specific hatching patterns"""
    
    MATERIAL_PATTERNS = {
        "CONCRETE": {"pattern": "ANSI31", "scale": 10, "angle": 45},
        "STEEL": {"pattern": "STEEL", "scale": 5, "angle": 0},
        "EARTH": {"pattern": "EARTH", "scale": 15, "angle": 30},
        "INSULATION": {"pattern": "INSUL", "scale": 8, "angle": 0},
        "BRICK": {"pattern": "BRICK", "scale": 12, "angle": 0}
    }
    
    if material_type not in MATERIAL_PATTERNS:
        return None
    
    pattern_info = MATERIAL_PATTERNS[material_type]
    
    hatch = msp.add_hatch(
        dxfattribs={"layer": f"6-HATCH-{material_type}"}
    )
    
    hatch.set_pattern_definition(
        pattern_info["pattern"],
        scale=pattern_info["scale"],
        angle=pattern_info["angle"]
    )
    
    # Add boundary path
    edge_path = hatch.paths.add_edge_path()
    edge_path.add_lwpolyline(boundary_entity)
    
    return hatch
```

### 5. Construction Schedules and Tables

#### Reinforcement Schedule
```python
def create_reinforcement_schedule(msp, position, rebar_data):
    """Create detailed reinforcement schedule table"""
    
    headers = ["Mark", "Dia.", "Shape", "Length", "No.", "Total Length", "Weight"]
    col_widths = [15, 15, 20, 20, 10, 25, 20]  # mm
    row_height = 8  # mm
    
    x_start, y_start = position
    
    # Table border
    total_width = sum(col_widths)
    total_height = (len(rebar_data) + 1) * row_height
    
    table_border = [
        (x_start, y_start),
        (x_start + total_width, y_start),
        (x_start + total_width, y_start + total_height),
        (x_start, y_start + total_height),
        (x_start, y_start)
    ]
    
    msp.add_lwpolyline(table_border,
        dxfattribs={"layer": "3-TEXT-ANNOTATIONS"})
    
    # Column headers
    x_current = x_start
    for i, (header, width) in enumerate(zip(headers, col_widths)):
        # Vertical separator
        if i > 0:
            msp.add_line(
                (x_current, y_start),
                (x_current, y_start + total_height),
                dxfattribs={"layer": "3-TEXT-ANNOTATIONS"}
            )
        
        # Header text
        text_x = x_current + width / 2
        text_y = y_start + total_height - row_height / 2
        add_text_annotation(msp, header, (text_x, text_y), "NOTES")
        
        x_current += width
    
    # Horizontal separator after header
    msp.add_line(
        (x_start, y_start + total_height - row_height),
        (x_start + total_width, y_start + total_height - row_height),
        dxfattribs={"layer": "3-TEXT-ANNOTATIONS"}
    )
    
    # Data rows
    for row_idx, rebar in enumerate(rebar_data):
        y_row = y_start + total_height - (row_idx + 2) * row_height
        x_current = x_start
        
        # Row separator
        if row_idx > 0:
            msp.add_line(
                (x_start, y_row + row_height),
                (x_start + total_width, y_row + row_height),
                dxfattribs={"layer": "3-TEXT-ANNOTATIONS"}
            )
        
        # Data cells
        row_data = [
            rebar["mark"], f"T{rebar['diameter']}", rebar["shape"],
            f"{rebar['length']:.0f}", str(rebar["number"]),
            f"{rebar['total_length']:.0f}", f"{rebar['weight']:.1f}"
        ]
        
        for col_idx, (data, width) in enumerate(zip(row_data, col_widths)):
            text_x = x_current + width / 2
            text_y = y_row + row_height / 2
            add_text_annotation(msp, data, (text_x, text_y), "NOTES")
            x_current += width
    
    return table_border
```

### 6. Quality Control and Standards Compliance

#### Drawing Validation Rules
```python
def validate_construction_drawing(doc):
    """Comprehensive validation for construction drawings"""
    
    issues = []
    msp = doc.modelspace()
    
    # Check for required layers
    required_layers = [
        "0-STRUCTURAL-FOUNDATION", "0-STRUCTURAL-COLUMNS", 
        "0-STRUCTURAL-BEAMS", "2-DIMENSIONS-LINEAR", "3-TEXT-ANNOTATIONS"
    ]
    
    for layer_name in required_layers:
        if layer_name not in doc.layers:
            issues.append(f"Missing required layer: {layer_name}")
    
    # Check entity distribution across layers
    layer_usage = {}
    for entity in msp:
        layer = entity.dxf.layer
        layer_usage[layer] = layer_usage.get(layer, 0) + 1
    
    if layer_usage.get("0", 0) > len(msp) * 0.1:  # More than 10% on layer 0
        issues.append("Too many entities on default layer '0'")
    
    # Check for dimensions
    has_dimensions = any(entity.dxftype() == "DIMENSION" for entity in msp)
    if not has_dimensions:
        issues.append("No dimensions found in drawing")
    
    # Check text sizes
    for entity in msp:
        if entity.dxftype() in ["TEXT", "MTEXT"]:
            if hasattr(entity.dxf, 'height') and entity.dxf.height < 1.8:
                issues.append(f"Text height too small: {entity.dxf.height}mm")
    
    return issues

def apply_iso_standards(doc):
    """Apply ISO drawing standards"""
    
    # ISO 128 line types
    iso_line_weights = {
        "THICK": 0.7,      # Cutting planes, contours
        "MEDIUM": 0.5,     # Visible edges
        "THIN": 0.25,      # Hidden lines, dimensions
        "EXTRA_THIN": 0.18 # Construction lines
    }
    
    # Apply to layers
    layer_weights = {
        "0-STRUCTURAL": "THICK",
        "1-REINFORCEMENT": "MEDIUM", 
        "2-DIMENSIONS": "THIN",
        "3-TEXT": "THIN",
        "4-GRID": "THIN",
        "5-CONSTRUCTION": "EXTRA_THIN"
    }
    
    for layer in doc.layers:
        for pattern, weight_type in layer_weights.items():
            if layer.dxf.name.startswith(pattern):
                layer.lineweight = int(iso_line_weights[weight_type] * 100)
                break
```

This advanced guide provides LLMs with sophisticated construction drawing techniques, ensuring professional-quality DXF files that meet industry standards for complex engineering projects.