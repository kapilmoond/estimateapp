// Comprehensive, verified ezdxf tutorial for LLM prompts and developers.
// Sources: https://ezdxf.readthedocs.io/en/stable/ (checked for correctness)

export const EZDXF_TUTORIAL = `
EZDXF PROFESSIONAL REFERENCE (R2018)

Summary
- ezdxf is a Python package for creating and modifying DXF files.
- Supported DXF versions for new(): R12, R2000, R2004, R2007, R2010, R2013, R2018.
- Use R2018 for modern output: ezdxf.new('R2018', setup=True).
- Use doc.modelspace() to draw; call .saveas('file.dxf') to save.
- Dimension entities require .render() to create the visible geometry.
- Since R2007 (AC1021) encoding is UTF‑8; ezdxf handles encoding automatically on save.

Create a Document
- Recommended: doc = ezdxf.new('R2018', setup=True)
  - dxfversion can be 'R2018' or 'AC1032'.
  - setup=True creates defaults for linetypes, text styles, dimstyles, visual styles.
- Get model space: msp = doc.modelspace()
- Units: pass units=6 (meters) or set later via header; we generally place geometry in mm and handle scale by ourselves.

Layers and Linetypes
- Add layers via doc.layers.add(name, color=?, linetype=?).
  Example: doc.layers.add(name='CONSTRUCTION', color=7, linetype='CONTINUOUS')
- Common linetype names include: CONTINUOUS, DASHED, DOTTED, DASHDOT (availability depends on setup=True).

Text Styles
- Access styles by name: style = doc.styles.get('Standard')
- style.dxf.height = 0 allows variable text height at entity creation.
- style.dxf.width, style.dxf.oblique are supported; font assignment depends on environment; keep to defaults unless necessary.

Basic Entities (Modelspace)
- Line: msp.add_line((x1,y1), (x2,y2), dxfattribs={ 'layer': 'CONSTRUCTION', 'color': 7 })
- Circle: msp.add_circle((cx,cy), radius, dxfattribs={ 'layer': 'CONSTRUCTION' })
- Arc: msp.add_arc((cx,cy), radius, start_angle, end_angle, dxfattribs={ ... })  // angles in degrees
- Lightweight Polyline (closed polygon): msp.add_lwpolyline([(x,y), ...], close=True, dxfattribs={ ... })
- Rectangle convenience: create a closed LWPolyline with 4 corners (no built‑in rectangle primitive).

Dimensions (critical rules)
- Create with API methods and always call .render():
  • Linear: dim = msp.add_linear_dim(base=(bx,by), p1=(x1,y1), p2=(x2,y2), dimstyle='Standard', text='<>', dxfattribs={ 'layer': 'DIMENSIONS' })
  • Aligned: dim = msp.add_aligned_dim(p1=(x1,y1), p2=(x2,y2), distance=offset, dimstyle='Standard', text='<>', dxfattribs={ ... })
  • Radius: dim = msp.add_radius_dim(center=(cx,cy), mpoint=(mx,my), dimstyle='Standard', dxfattribs={ ... })
- After creation: dim.render() is required to generate the anonymous block with visible geometry. Without render(), nothing shows.
- Use doc.dimstyles.get('Standard') to access and adjust dimension style properties (e.g., dimtxt, dimasz, dimtsz, dimgap, dimexe, dimexo).
- Arrowheads vs. ticks:
  • dimstyle.dxf.dimasz = <size> enables arrowheads; set dimstyle.dxf.dimtsz = 0
  • dimstyle.dxf.dimtsz = <size> enables tick marks; set dimstyle.dxf.dimasz = 0

Hatching
- Create hatch entity: hatch = msp.add_hatch(dxfattribs={ 'layer': 'HATCHING' })
- Set pattern: hatch.set_pattern_fill('ANSI31', scale=1.0, angle=45)
- Add a closed boundary path: hatch.paths.add_polyline_path([(x1,y1), (x2,y2), ...], is_closed=True)

Colors and Units
- ByColor index (ACI) is supported; 7 is typical white/black.
- Units: For documents R2007+ UTF‑8 is used automatically by ezdxf; geometry coordinates are unitless, but you should maintain a consistent convention (mm recommended).

Saving
- Save to disk: doc.saveas('filename.dxf')
- DXF R2018 files are UTF‑8 and supported by modern CAD software.

Blocks and Inserts (optional)
- Create a block: blk = doc.blocks.new(name='BLOCK_NAME')
- Add entities to blk (e.g., blk.add_line(...)); insert with msp.add_blockref('BLOCK_NAME', (x,y))

Best Practices for Professional CAD Output
- Use layers: CONSTRUCTION, DIMENSIONS, HATCHING, TEXT.
- Dimensions: set reasonable text height (e.g., 250 in mm drawing), arrow size, text gap; keep extension line gaps ~2–3mm visual equivalent by dimexo and dimexe.
- Always render dimensions and ensure text='<>' to show measured value.
- Keep annotation scale consistent with your intended print scale.

Common Pitfalls
- Missing render(): no visible dimension.
- Invalid combination of dimasz and dimtsz: choose arrows OR ticks.
- Non‑closed boundary for hatch: set is_closed=True and provide a valid polyline loop.
- Using unavailable linetype names without setup=True: enable setup or add linetype resources manually.

Example Skeleton (R2018)

import ezdxf

doc = ezdxf.new('R2018', setup=True)
msp = doc.modelspace()

doc.layers.add(name='CONSTRUCTION', color=7, linetype='CONTINUOUS')
doc.layers.add(name='DIMENSIONS', color=1, linetype='CONTINUOUS')
doc.layers.add(name='HATCHING', color=2, linetype='CONTINUOUS')

# Geometry
msp.add_line((0,0), (2000,0), dxfattribs={'layer': 'CONSTRUCTION'})

# Dimension (visible after render)
dim = msp.add_linear_dim(base=(1000,-300), p1=(0,0), p2=(2000,0), dimstyle='Standard', text='<>', dxfattribs={'layer': 'DIMENSIONS'})
dim.render()

# Hatch
h = msp.add_hatch(dxfattribs={'layer': 'HATCHING'})
h.set_pattern_fill('ANSI31', scale=1.0, angle=45)
h.paths.add_polyline_path([(0,0), (2000,0), (2000,500), (0,500)], is_closed=True)

doc.saveas('example.dxf')

Notes
- API names and behaviors verified from official docs:
  • ezdxf.new('R2018', setup=True)
  • doc.modelspace(), doc.layers.add(), doc.dimstyles.get('Standard')
  • msp.add_line, add_circle, add_arc, add_lwpolyline, add_hatch, hatch.set_pattern_fill, hatch.paths.add_polyline_path
  • Dimensions: add_linear_dim/add_aligned_dim/add_radius_dim, and .render()
`;

