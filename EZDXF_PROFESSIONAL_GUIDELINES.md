# EZDXF Professional Guidelines for LLM-Driven DXF Generation

## Quick Reference for Professional Construction Drawings

### 1. Essential Setup
```python
import ezdxf
from ezdxf import units

# Create professional DXF document
doc = ezdxf.new("R2010", setup=True)
doc.units = units.MM
msp = doc.modelspace()

# Set document properties
doc.header['$MEASUREMENT'] = 1  # Metric
doc.header['$LUNITS'] = 2      # Decimal units
doc.header['$LUPREC'] = 2      # 2 decimal places
```

### 2. Standard Construction Layers
```python
CONSTRUCTION_LAYERS = {
    "0-STRUCTURAL-FOUNDATION": {"color": 1, "linetype": "CONTINUOUS", "lineweight": 50},
    "0-STRUCTURAL-COLUMNS": {"color": 2, "linetype": "CONTINUOUS", "lineweight": 35},
    "0-STRUCTURAL-BEAMS": {"color": 3, "linetype": "CONTINUOUS", "lineweight": 35},
    "0-STRUCTURAL-SLABS": {"color": 4, "linetype": "CONTINUOUS", "lineweight": 25},
    "1-REINFORCEMENT-MAIN": {"color": 1, "linetype": "CONTINUOUS", "lineweight": 25},
    "1-REINFORCEMENT-STIRRUPS": {"color": 9, "linetype": "CONTINUOUS", "lineweight": 18},
    "2-DIMENSIONS-LINEAR": {"color": 256, "linetype": "CONTINUOUS", "lineweight": 18},
    "3-TEXT-ANNOTATIONS": {"color": 256, "linetype": "CONTINUOUS", "lineweight": 18},
    "4-GRID-LINES": {"color": 8, "linetype": "CENTER", "lineweight": 13},
    "5-HIDDEN-LINES": {"color": 8, "linetype": "HIDDEN", "lineweight": 13},
    "6-HATCH-CONCRETE": {"color": 8, "linetype": "CONTINUOUS", "lineweight": 9},
}

def create_layers(doc):
    for name, props in CONSTRUCTION_LAYERS.items():
        if name not in doc.layers:
            layer = doc.layers.add(name)
            layer.color = props["color"]
            layer.linetype = props["linetype"]
            layer.lineweight = props["lineweight"]
```

### 3. Professional Text Styles
```python
def setup_text_styles(doc):
    # Title text (5mm)
    title = doc.styles.add("TITLE")
    title.dxf.font = "Arial.ttf"
    title.dxf.height = 5.0
    
    # Standard text (2.5mm)
    standard = doc.styles.add("STANDARD")
    standard.dxf.font = "Arial.ttf" 
    standard.dxf.height = 2.5
    
    # Notes text (1.8mm)
    notes = doc.styles.add("NOTES")
    notes.dxf.font = "Arial.ttf"
    notes.dxf.height = 1.8
```

### 4. Dimension Styles
```python
def setup_dimensions(doc):
    dimstyle = doc.dimstyles.add("STRUCTURAL")
    dimstyle.dxf.dimtxt = 2.5    # Text height
    dimstyle.dxf.dimasz = 2.5    # Arrow size
    dimstyle.dxf.dimexe = 1.25   # Extension line extension
    dimstyle.dxf.dimexo = 0.625  # Extension line offset
    dimstyle.dxf.dimgap = 0.625  # Text gap
    dimstyle.dxf.dimtad = 1      # Text above line
    dimstyle.dxf.dimdec = 0      # No decimals for whole numbers
```

### 5. Structural Elements

#### Columns
```python
def create_column(msp, center, width, height):
    x, y = center
    hw, hh = width/2, height/2
    points = [
        (x-hw, y-hh), (x+hw, y-hh), (x+hw, y+hh), 
        (x-hw, y+hh), (x-hw, y-hh)
    ]
    return msp.add_lwpolyline(points, 
        dxfattribs={"layer": "0-STRUCTURAL-COLUMNS", "closed": True})
```

#### Beams
```python
def create_beam(msp, start, end, width):
    import math
    dx, dy = end[0]-start[0], end[1]-start[1]
    length = math.sqrt(dx*dx + dy*dy)
    angle = math.atan2(dy, dx)
    
    # Perpendicular offset
    px = -math.sin(angle) * width/2
    py = math.cos(angle) * width/2
    
    points = [
        (start[0]+px, start[1]+py), (end[0]+px, end[1]+py),
        (end[0]-px, end[1]-py), (start[0]-px, start[1]-py)
    ]
    return msp.add_lwpolyline(points,
        dxfattribs={"layer": "0-STRUCTURAL-BEAMS", "closed": True})
```

#### Foundations
```python
def create_foundation(msp, center, width, length):
    x, y = center
    hw, hl = width/2, length/2
    points = [
        (x-hw, y-hl), (x+hw, y-hl), (x+hw, y+hl), 
        (x-hw, y+hl), (x-hw, y-hl)
    ]
    foundation = msp.add_lwpolyline(points,
        dxfattribs={"layer": "0-STRUCTURAL-FOUNDATION", "closed": True})
    
    # Add hatch pattern
    hatch = msp.add_hatch(dxfattribs={"layer": "6-HATCH-CONCRETE"})
    hatch.set_pattern_definition("ANSI31", scale=5.0, angle=45.0)
    edge_path = hatch.paths.add_edge_path()
    edge_path.add_lwpolyline(foundation)
    
    return foundation
```

### 6. Reinforcement Details
```python
def add_reinforcement(msp, beam_start, beam_end, width, rebar_config):
    # Main reinforcement bars
    for i, bar_pos in enumerate(rebar_config["main_bars"]):
        offset_y = (i - len(rebar_config["main_bars"])/2) * 50  # 50mm spacing
        
        # Calculate parallel line to beam
        dx, dy = beam_end[0]-beam_start[0], beam_end[1]-beam_start[1]
        length = math.sqrt(dx*dx + dy*dy)
        
        # Offset start and end points
        start_rebar = (beam_start[0], beam_start[1] + offset_y)
        end_rebar = (beam_end[0], beam_end[1] + offset_y)
        
        msp.add_line(start_rebar, end_rebar,
            dxfattribs={"layer": "1-REINFORCEMENT-MAIN"})
    
    # Stirrups at regular intervals
    spacing = rebar_config.get("stirrup_spacing", 200)  # 200mm default
    for i in range(0, int(length), spacing):
        t = i / length
        stirrup_x = beam_start[0] + t * (beam_end[0] - beam_start[0])
        stirrup_y = beam_start[1] + t * (beam_end[1] - beam_start[1])
        
        # Create stirrup rectangle
        stirrup_points = [
            (stirrup_x - width/2, stirrup_y - 50),
            (stirrup_x + width/2, stirrup_y - 50),
            (stirrup_x + width/2, stirrup_y + 50),
            (stirrup_x - width/2, stirrup_y + 50),
            (stirrup_x - width/2, stirrup_y - 50)
        ]
        msp.add_lwpolyline(stirrup_points,
            dxfattribs={"layer": "1-REINFORCEMENT-STIRRUPS"})
```

### 7. Dimensions and Annotations
```python
def add_dimensions(msp, start, end, offset=5000):
    dim = msp.add_linear_dim(
        base=(start[0], start[1] + offset),
        p1=start, p2=end,
        dimstyle="STRUCTURAL",
        dxfattribs={"layer": "2-DIMENSIONS-LINEAR"}
    )
    dim.render()
    return dim

def add_text_annotation(msp, text, position, style="STANDARD"):
    return msp.add_text(text, 
        dxfattribs={"layer": "3-TEXT-ANNOTATIONS", "style": style}
    ).set_placement(position)
```

### 8. Grid System
```python
def create_grid(msp, x_spacing, y_spacing, x_count, y_count):
    # Vertical lines (A, B, C...)
    for i in range(x_count):
        x = i * x_spacing
        msp.add_line((x, 0), (x, (y_count-1) * y_spacing),
            dxfattribs={"layer": "4-GRID-LINES", "linetype": "CENTER"})
        
        # Grid label
        label = chr(65 + i)  # A, B, C...
        add_text_annotation(msp, label, (x, -2500), "STANDARD")
    
    # Horizontal lines (1, 2, 3...)
    for i in range(y_count):
        y = i * y_spacing
        msp.add_line((0, y), ((x_count-1) * x_spacing, y),
            dxfattribs={"layer": "4-GRID-LINES", "linetype": "CENTER"})
        
        # Grid label
        add_text_annotation(msp, str(i+1), (-2500, y), "STANDARD")
```

### 9. Complete Drawing Template
```python
def create_professional_drawing(title, elements, grid_config=None):
    # Setup document
    doc = ezdxf.new("R2010", setup=True)
    doc.units = units.MM
    msp = doc.modelspace()
    
    # Setup styles and layers
    create_layers(doc)
    setup_text_styles(doc)
    setup_dimensions(doc)
    
    # Create grid if specified
    if grid_config:
        create_grid(msp, **grid_config)
    
    # Add structural elements
    for element in elements:
        if element["type"] == "COLUMN":
            create_column(msp, element["center"], element["width"], element["height"])
        elif element["type"] == "BEAM":
            beam = create_beam(msp, element["start"], element["end"], element["width"])
            if "reinforcement" in element:
                add_reinforcement(msp, element["start"], element["end"], 
                                element["width"], element["reinforcement"])
        elif element["type"] == "FOUNDATION":
            create_foundation(msp, element["center"], element["width"], element["length"])
        
        # Add dimensions
        if "dimensions" in element and element["dimensions"]:
            if element["type"] in ["BEAM"]:
                add_dimensions(msp, element["start"], element["end"])
    
    # Add title block
    add_text_annotation(msp, title, (10000, 200000), "TITLE")
    
    return doc

# Usage example:
def generate_beam_elevation():
    elements = [
        {
            "type": "BEAM",
            "start": (0, 0),
            "end": (6000, 0),  # 6m beam
            "width": 300,      # 300mm width
            "reinforcement": {
                "main_bars": ["T20", "T20", "T16", "T16"],  # 4 bars
                "stirrup_spacing": 200  # 200mm spacing
            },
            "dimensions": True
        }
    ]
    
    return create_professional_drawing("RC BEAM ELEVATION 1:50", elements)
```

### 10. Best Practices Checklist

**ALWAYS INCLUDE:**
1. ✅ Proper layer organization with standard naming
2. ✅ Appropriate text styles (Title 5mm, Standard 2.5mm, Notes 1.8mm)
3. ✅ Professional dimension styles with consistent formatting
4. ✅ Grid system for structural drawings
5. ✅ Reinforcement details for concrete elements
6. ✅ Material hatching (concrete, steel, earth)
7. ✅ Complete dimensioning with offset spacing
8. ✅ Technical annotations and labels
9. ✅ Title block with drawing information
10. ✅ Line weights according to element importance

**AVOID:**
- ❌ Using only layer "0" for all elements
- ❌ Inconsistent text heights
- ❌ Missing dimensions or annotations
- ❌ Elements without proper layer assignment
- ❌ Incomplete reinforcement details
- ❌ Poor line weight hierarchy

This guide ensures LLM-generated DXF files meet professional construction drawing standards with complete structural details, proper formatting, and industry-standard conventions.