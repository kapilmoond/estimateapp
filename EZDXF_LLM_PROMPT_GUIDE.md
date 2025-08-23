# EZDXF LLM Prompt Integration Guide

## Quick Reference for Professional DXF Generation

### MANDATORY SETUP (Always Include)
```python
import ezdxf
from ezdxf import units

# Professional document setup
doc = ezdxf.new("R2010", setup=True)
doc.units = units.MM
msp = doc.modelspace()

# Create standard construction layers
layers = {
    "0-STRUCTURAL-FOUNDATION": {"color": 1, "lineweight": 50},
    "0-STRUCTURAL-COLUMNS": {"color": 2, "lineweight": 35},
    "0-STRUCTURAL-BEAMS": {"color": 3, "lineweight": 35},
    "1-REINFORCEMENT-MAIN": {"color": 1, "lineweight": 25},
    "2-DIMENSIONS-LINEAR": {"color": 256, "lineweight": 18},
    "3-TEXT-ANNOTATIONS": {"color": 256, "lineweight": 18},
    "4-GRID-LINES": {"color": 8, "lineweight": 13}
}

for name, props in layers.items():
    layer = doc.layers.add(name)
    layer.color = props["color"]
    layer.lineweight = props["lineweight"]

# Text styles
doc.styles.add("TITLE").dxf.height = 5.0
doc.styles.add("STANDARD").dxf.height = 2.5
doc.styles.add("NOTES").dxf.height = 1.8

# Dimension style
dimstyle = doc.dimstyles.add("STRUCTURAL")
dimstyle.dxf.dimtxt = 2.5; dimstyle.dxf.dimasz = 2.5
```

### STRUCTURAL ELEMENTS

**Column:**
```python
def column(center, width, height):
    x, y = center; hw, hh = width/2, height/2
    points = [(x-hw,y-hh), (x+hw,y-hh), (x+hw,y+hh), (x-hw,y+hh), (x-hw,y-hh)]
    return msp.add_lwpolyline(points, dxfattribs={"layer": "0-STRUCTURAL-COLUMNS", "closed": True})
```

**Beam:**
```python
def beam(start, end, width):
    import math
    dx, dy = end[0]-start[0], end[1]-start[1]
    angle = math.atan2(dy, dx)
    px, py = -math.sin(angle)*width/2, math.cos(angle)*width/2
    points = [(start[0]+px,start[1]+py), (end[0]+px,end[1]+py), (end[0]-px,end[1]-py), (start[0]-px,start[1]-py)]
    return msp.add_lwpolyline(points, dxfattribs={"layer": "0-STRUCTURAL-BEAMS", "closed": True})
```

**Foundation:**
```python
def foundation(center, width, length):
    x, y = center; hw, hl = width/2, length/2
    points = [(x-hw,y-hl), (x+hw,y-hl), (x+hw,y+hl), (x-hw,y+hl), (x-hw,y-hl)]
    return msp.add_lwpolyline(points, dxfattribs={"layer": "0-STRUCTURAL-FOUNDATION", "closed": True})
```

### REINFORCEMENT
```python
# Main bars (parallel to beam)
for i in range(num_bars):
    offset = (i - num_bars/2) * 50  # 50mm spacing
    msp.add_line((start[0], start[1]+offset), (end[0], end[1]+offset), 
                dxfattribs={"layer": "1-REINFORCEMENT-MAIN"})

# Stirrups (perpendicular, every 200mm)
import math
length = math.sqrt((end[0]-start[0])**2 + (end[1]-start[1])**2)
for i in range(0, int(length), 200):
    t = i/length
    x = start[0] + t*(end[0]-start[0])
    y = start[1] + t*(end[1]-start[1])
    stirrup_pts = [(x-width/2, y-50), (x+width/2, y-50), (x+width/2, y+50), (x-width/2, y+50), (x-width/2, y-50)]
    msp.add_lwpolyline(stirrup_pts, dxfattribs={"layer": "1-REINFORCEMENT-STIRRUPS"})
```

### DIMENSIONS & TEXT
```python
# Linear dimension
dim = msp.add_linear_dim(
    base=(start[0], start[1] + 5000),  # 5000mm offset above
    p1=start, p2=end, dimstyle="STRUCTURAL",
    dxfattribs={"layer": "2-DIMENSIONS-LINEAR"})
dim.render()

# Text annotation
msp.add_text("TEXT HERE", dxfattribs={"layer": "3-TEXT-ANNOTATIONS", "style": "STANDARD"}).set_placement(position)
```

### GRID SYSTEM
```python
# Vertical lines (A,B,C...)
for i in range(x_count):
    x = i * x_spacing
    msp.add_line((x,0), (x, (y_count-1)*y_spacing), dxfattribs={"layer": "4-GRID-LINES", "linetype": "CENTER"})
    msp.add_text(chr(65+i), dxfattribs={"layer": "3-TEXT-ANNOTATIONS"}).set_placement((x, -2500))

# Horizontal lines (1,2,3...)
for i in range(y_count):
    y = i * y_spacing
    msp.add_line((0,y), ((x_count-1)*x_spacing, y), dxfattribs={"layer": "4-GRID-LINES", "linetype": "CENTER"})
    msp.add_text(str(i+1), dxfattribs={"layer": "3-TEXT-ANNOTATIONS"}).set_placement((-2500, y))
```

### COMPLETE DRAWING PATTERN
```python
# 1. Setup (layers, styles, dimensions)
# 2. Grid system (if structural)
# 3. Main structural elements (foundations, columns, beams, slabs)
# 4. Reinforcement details (bars, stirrups, mesh)
# 5. Dimensions (linear, angular, radial as needed)
# 6. Annotations and labels
# 7. Title block
# 8. Save: doc.saveas("drawing.dxf")
```

### CONSTRUCTION UNITS (ALWAYS METRIC)
- Dimensions in millimeters (mm)
- Text heights: Title=5mm, Standard=2.5mm, Notes=1.8mm
- Standard concrete cover: 25-50mm
- Rebar spacing: 100-200mm typical
- Grid spacing: 3000-9000mm typical

### QUALITY CHECKLIST
✅ All entities on proper layers (not layer "0")
✅ Consistent text styles and heights
✅ Complete dimension chains
✅ Grid system for structural drawings
✅ Reinforcement details for concrete elements
✅ Professional layer naming (0-STRUCTURAL-*, 1-REINFORCEMENT-*, etc.)
✅ Title block with drawing information
✅ Appropriate line weights by element importance

### EXAMPLE: COMPLETE BEAM ELEVATION
```python
import ezdxf, math
doc = ezdxf.new("R2010", setup=True); msp = doc.modelspace()

# Setup layers and styles (use code above)

# 6m beam with reinforcement
start, end = (0, 0), (6000, 0)
width = 300

# Main beam
beam_pts = [(0, -150), (6000, -150), (6000, 150), (0, 150), (0, -150)]
msp.add_lwpolyline(beam_pts, dxfattribs={"layer": "0-STRUCTURAL-BEAMS", "closed": True})

# Main reinforcement (4 bars)
for i in range(4):
    y_offset = -100 + (i%2)*50  # Bottom and top layers
    x_start, x_end = (50, y_offset), (5950, y_offset)
    msp.add_line(x_start, x_end, dxfattribs={"layer": "1-REINFORCEMENT-MAIN"})

# Stirrups every 200mm
for x in range(200, 6000, 200):
    stirrup = [(x, -130), (x, 130)]
    msp.add_line(stirrup[0], stirrup[1], dxfattribs={"layer": "1-REINFORCEMENT-STIRRUPS"})

# Dimensions
dim = msp.add_linear_dim(base=(0, 300), p1=(0,0), p2=(6000,0), dimstyle="STRUCTURAL")
dim.render()

# Labels
msp.add_text("BEAM B1 - 300x300", dxfattribs={"style": "TITLE"}).set_placement((3000, 500))
msp.add_text("4T20 + T10@200", dxfattribs={"style": "STANDARD"}).set_placement((3000, 400))

doc.saveas("beam_elevation.dxf")
```

**ALWAYS prioritize completeness, professional standards, and construction industry conventions.**