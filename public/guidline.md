Part 1: ezdxf Core Concepts and Best Practices for AI Agents
This document outlines the fundamental principles and best practices for an AI agent to programmatically generate complex 2D CAD drawings using the ezdxf Python library.
The Golden Rule: Structured Data is Key
The single most important factor for success is the structure of the data the LLM provides to the AI coding agent. The agent should be trained to request or expect data in a predictable, structured format (like JSON). A prompt should not be "draw a house," but rather "generate the JSON data for a house composed of lines, polylines, and blocks."
An ideal JSON structure would look like this:
code
JSON
{
  "dxf_version": "R2018",
  "layers": [
    {"name": "WALLS", "color": 1, "linetype": "SOLID"},
    {"name": "WINDOWS", "color": 4, "linetype": "DASHED"},
    {"name": "ROOF", "color": 3, "linetype": "SOLID"}
  ],
  "blocks": [
    {
      "name": "STANDARD_WINDOW",
      "base_point": [0, 0],
      "entities": [
        {"type": "LWPOLYLINE", "points": [[0,0], [1,0], [1,1], [0,1]], "closed": true},
        {"type": "LINE", "start": [0.5, 0], "end": [0.5, 1]}
      ]
    }
  ],
  "entities": [
    {
      "type": "LINE",
      "layer": "WALLS",
      "start": [0, 0],
      "end": [50, 0]
    },
    {
      "type": "BLOCK",
      "name": "STANDARD_WINDOW",
      "layer": "WINDOWS",
      "insert": [10, 2]
    }
  ]
}
Why this is better:
Unambiguous: The agent doesn't have to guess intentions.
Modular: It separates geometry from organization (layers, blocks).
Scalable: It's easy to add new entity types, attributes, and complex structures.
1. Document Lifecycle
Every ezdxf script follows a simple, three-step lifecycle.
Step 1: Create or Load a Drawing
For a new drawing: Use ezdxf.new(). The agent should always specify a DXF version. R2018 is the latest and a safe default.
To load an existing drawing: Use ezdxf.readfile("path/to/file.dxf"). This is less common for generation tasks but crucial for modification.
code
Python
import ezdxf

# Best practice: always specify DXF version
try:
    doc = ezdxf.new("R2018", setup=True)
except IOError:
    print("Failed to create new DXF document.")
Step 2: Access a Layout and Add Entities
Entities (lines, circles, etc.) are not added directly to the document. They are added to a layout: Modelspace or a Paperspace.
Modelspace (doc.modelspace()): This is where the actual geometry of the drawing lives. For 2D drawings, the agent should almost exclusively work in modelspace.
Paperspace (doc.layout()): This is for printing and presentation, containing viewports of the modelspace. The agent should generally avoid this unless specifically asked to create print layouts.
code
Python
# Get the modelspace
msp = doc.modelspace()

# Add an entity (example)
msp.add_line(start=(0, 0), end=(10, 5))
Step 3: Save the Document
Use doc.saveas("filename.dxf"). The agent must ensure the filename is valid.
Implement error handling in case the file path is not writable.
code
Python
try:
    doc.saveas("my_drawing.dxf")
    print("Drawing saved successfully.")
except IOError:
    print(f"Could not save drawing to 'my_drawing.dxf'. Check permissions.")
2. Fundamental Drawing Attributes (The "Metadata")
A "smart" drawing isn't just lines; it's organized. The agent must understand how to use Layers, Colors, and Linetypes.
Layers
Purpose: The primary method for organizing a drawing. Think of them as transparent overlays.
How to use:
Create a new layer if it doesn't exist: doc.layers.new("MyLayer").
Set its properties (color, linetype).
When adding an entity, assign it to the layer in the dxfattribs dictionary.
code
Python
# Create a new layer named "GEOMETRY" with color 7 (white/black)
if "GEOMETRY" not in doc.layers:
    my_layer = doc.layers.new("GEOMETRY", dxfattribs={'color': 7, 'linetype': 'SOLID'})

# Add a line to this layer
msp.add_line(start=(0, 0), end=(10, 0), dxfattribs={'layer': 'GEOMETRY'})
Colors
ACI (AutoCAD Color Index): The standard. It's an integer from 1 to 255.
Common ACI Colors: 1 (red), 2 (yellow), 3 (green), 4 (cyan), 5 (blue), 6 (magenta), 7 (white/black).
Best Practice: Set color on the layer, not the entity itself. Entities should have their color set to 256 or ezdxf.const.BYLAYER. This makes the drawing much easier to manage. If the agent sets a color directly on an entity, it should have a very specific reason.
code
Python
# Good: Control color via layer
doc.layers.new("WALLS", dxfattribs={'color': 1}) # Red
msp.add_line(..., dxfattribs={'layer': 'WALLS'}) # Line will be red

# Bad (unless necessary): Override layer color
msp.add_line(..., dxfattribs={'layer': 'WALLS', 'color': 5}) # This line will be blue, ignoring layer color
Linetypes
Purpose: Define patterns for lines (e.g., dashed, dotted, center).
How to use: ezdxf documents have common linetypes pre-loaded (SOLID, DASHED, DOTTED, etc.). Like colors, linetypes are best managed via layers.
code
Python
# Create a layer for center lines
doc.layers.new("CENTERLINES", dxfattribs={'color': 2, 'linetype': 'CENTER'})

# All entities on this layer will use the CENTER linetype
msp.add_circle(..., dxfattribs={'layer': 'CENTERLINES'})
Part 2: ezdxf Geometric Entities for AI Agents
This section details how to create common 2D geometric entities. The agent's primary goal should be to choose the most efficient entity for a given task. For example, a closed shape like a rectangle should be a single LWPOLYLINE, not four separate LINEs.
3. Simple Entities
These are the basic building blocks of any drawing.
LINE
Purpose: Represents a straight line segment between two points.
ezdxf Method: msp.add_line(start, end, dxfattribs={})
Required Data: start and end coordinates as 2D or 3D tuples (e.g., (x, y)).
Agent Logic: Use for simple, non-connected straight lines. If multiple lines form a closed shape, an LWPOLYLINE is almost always a better choice.
code
Python
# From structured data:
# { "type": "LINE", "layer": "GEOMETRY", "start": [10, 10], "end": [50, 30] }

msp.add_line(start=(10, 10), end=(50, 30), dxfattribs={'layer': 'GEOMETRY'})
CIRCLE
Purpose: Represents a perfect circle.
ezdxf Method: msp.add_circle(center, radius, dxfattribs={})
Required Data: center coordinate and a radius value.
Agent Logic: Straightforward. Use for any circular feature.
code
Python
# From structured data:
# { "type": "CIRCLE", "layer": "CIRCLES", "center": [100, 100], "radius": 25 }

msp.add_circle(center=(100, 100), radius=25, dxfattribs={'layer': 'CIRCLES'})
ARC
Purpose: Represents a portion of a circle's circumference.
ezdxf Method: msp.add_arc(center, radius, start_angle, end_angle, dxfattribs={})
Required Data: center coordinate, radius, start_angle, and end_angle.
Agent Logic: Angles are always in degrees. The arc is drawn counter-clockwise from the start angle to the end angle. This is a common point of confusion; the agent must be certain about the angle conventions.
code
Python
# From structured data:
# { "type": "ARC", "layer": "ARCS", "center": [200, 100], "radius": 40, "start_angle": 45, "end_angle": 180 }

msp.add_arc(
    center=(200, 100),
    radius=40,
    start_angle=45,
    end_angle=180,
    dxfattribs={'layer': 'ARCS'}
)
4. The Most Important Entity: LWPOLYLINE
The LWPOLYLINE (Lightweight Polyline) is the most versatile and efficient entity for 2D drawings. It represents a single object composed of connected line segments and arcs.
Purpose: To create any shape made of straight lines and arcs, such as rectangles, polygons, and complex outlines.
Why it's better than LINEs:
Single Object: A rectangle is one object to select, move, or delete, not four.
Fillable: Closed LWPOLYLINEs can be filled with a HATCH.
Efficient: DXF files are smaller and faster to process.
ezdxf Method: msp.add_lwpolyline(points, format="xy", close=False, dxfattribs={})
Required Data: A list of points. Each point can have up to 5 values: (x, y, start_width, end_width, bulge).
x, y: The coordinates. This is the minimum required.
start_width, end_width: For creating tapered segments. Often zero.
bulge: A value that defines an arc segment. A positive bulge is a counter-clockwise arc, negative is clockwise. A bulge of 0 (the default) is a straight line. The agent must be trained to calculate the bulge value if arcs are needed.
Agent Logic for LWPOLYLINE
Identify Polylines: When the LLM is asked for a "rectangle," "square," "triangle," or any closed shape, the agent should request the vertices for an LWPOLYLINE.
Handle the closed Flag: If the shape is closed (like a polygon), the agent should set close=True. This automatically draws the segment from the last vertex to the first. The first vertex should NOT be repeated at the end of the point list.
Bulges for Arcs: This is an advanced topic. For now, the agent can focus on straight-line polylines, where the bulge value is always 0. The points data would just be a list of (x, y) tuples.
code
Python
# --- Example 1: A simple open polyline ---
# From structured data:
# { "type": "LWPOLYLINE", "layer": "PATHS", "points": [[0,0], [10,10], [20,0]], "closed": false }

points = [(0, 0), (10, 10), (20, 0)]
msp.add_lwpolyline(points, dxfattribs={'layer': 'PATHS'})


# --- Example 2: A closed rectangle (BEST PRACTICE) ---
# From structured data:
# { "type": "RECTANGLE", "layer": "BOUNDARIES", "corner1": [50,50], "corner2": [100, 80] }

# The agent should translate this high-level request into a polyline
c1 = (50, 50)
c2 = (100, 80)
points = [c1, (c2[0], c1[1]), c2, (c1[0], c2[1])]
msp.add_lwpolyline(points, close=True, dxfattribs={'layer': 'BOUNDARIES'})

# This is much better than creating four separate LINE entities.
5. Fills and Annotations
HATCH
Purpose: To fill a closed area with a pattern (e.g., solid fill, lines, bricks).
ezdxf Method: hatch = msp.add_hatch() followed by hatch.paths.add_polyline_path(...)
Required Data: A defined, closed boundary.
Agent Logic: This is a multi-step process and requires careful boundary management.
Identify the Boundary: The agent needs to know which LWPOLYLINE or set of LINEs forms the boundary to be filled. The boundary must be perfectly closed.
Create the Hatch: msp.add_hatch() creates the hatch entity.
Define the Pattern: Set the pattern name and scale in hatch.set_pattern_fill(). SOLID is the most common for solid fills.
Append the Boundary Path: Use hatch.paths.add_polyline_path() and provide the vertices of the boundary polyline.
code
Python
# Create a closed LWPOLYLINE first (as shown in the rectangle example)
rect_points = [(50, 50), (100, 50), (100, 80), (50, 80)]
boundary = msp.add_lwpolyline(rect_points, close=True, dxfattribs={'layer': 'BOUNDARIES'})

# Now, create the hatch
hatch = msp.add_hatch(color=3, dxfattribs={'layer': 'FILLS'}) # Green fill
hatch.set_pattern_fill('SOLID')

# Add the boundary path to the hatch
# The `is_closed` flag is important!
hatch.paths.add_polyline_path(boundary.get_points(format='xyb'), is_closed=True)
TEXT / MTEXT
Purpose: For single-line (TEXT) or multi-line (MTEXT) annotations.
ezdxf Methods: msp.add_text() and msp.add_mtext()
Required Data: The text content, an insert point, and a height.
Agent Logic: For simple labels, add_text is sufficient. For paragraphs or text that needs to wrap, add_mtext is better. The agent should also manage text styles (doc.styles.new()) for font, etc., but can start with the default.
code
Python
# From structured data:
# { "type": "TEXT", "content": "My Label", "insert": [10, 5], "height": 2.5, "layer": "TEXT" }

msp.add_text(
    "My Label",
    dxfattribs={
        'insert': (10, 5),
        'height': 2.5,
        'layer': 'TEXT'
    }
).set_placement(align=ezdxf.const.MIDDLE_CENTER) # Optional: set alignment

# For multi-line text
msp.add_mtext(
    "This is a multi-line\ntext block for notes.",
    dxfattribs={'insert': (120, 50), 'layer': 'TEXT'}
)
Part 3: Blocks, Reusability, and Efficiency
If the agent is to create anything beyond the most basic drawings, it must understand Blocks. A Block is a collection of entities grouped together to form a single, reusable object.
The Core Analogy:
Without Blocks: To draw 100 identical screws, you would add 100 separate sets of lines and arcs to the modelspace. The file would be large, and changing the screw design would require editing all 100 individually.
With Blocks: You define the "screw" geometry once as a Block Definition. Then, you insert 100 Block References into the modelspace. The file is tiny, and to change all 100 screws, you only need to edit the single block definition.
This is the key to efficiency and is standard practice in all professional CAD work.
6. The Two-Step Block Process
Working with blocks is always a two-step process. The agent must internalize this.
Step 1: Create the Block Definition
A Block Definition is the "blueprint" or "template." It exists in the document's block definition table but is not visible in the modelspace.
ezdxf Method: doc.blocks.new(name, base_point)
Parameters:
name: A unique string identifier for the block (e.g., "SCREW_M4", "WINDOW_TYPE_A"). The agent must ensure this name is not duplicated.
base_point: A (x, y) tuple that serves as the "handle" for the block. When you insert the block at a coordinate, the base point is what aligns with that coordinate. (0, 0) is the most common and predictable choice.
Agent Logic:
Recognize repetitive elements in the user's request.
Create a new block definition using doc.blocks.new().
Crucially, add the entities (lines, circles, etc.) to the block definition itself, not to the modelspace. The geometry should be drawn relative to the block's base_point.
code
Python
# --- Example: Defining a simple "Window" block ---
# This code creates the blueprint, but does not draw anything visible yet.

# Check if block already exists to prevent errors
if "WINDOW" not in doc.blocks:
    # Create a new block definition named "WINDOW" with its base point at (0, 0)
    window_block = doc.blocks.new(name="WINDOW", base_point=(0, 0))

    # Add geometry to the block definition.
    # These coordinates are relative to the base_point.
    # A simple 1x1 unit window frame.
    frame_points = [(0, 0), (1, 0), (1, 1), (0, 1)]
    window_block.add_lwpolyline(frame_points, close=True)
    # A line for the glass pane
    window_block.add_line((0.5, 0), (0.5, 1))
Step 2: Insert Block References
A Block Reference is a visible instance of a block definition placed into a layout (almost always the modelspace). You can insert a reference as many times as you need.
ezdxf Method: msp.add_blockref(name, insert, dxfattribs={})
Parameters:
name: The name of the block definition to insert.
insert: The (x, y) coordinate in the modelspace where the block's base_point will be placed.
Powerful Attributes (dxfattribs):
rotation: Rotates the block reference (in degrees).
xscale, yscale: Stretches or shrinks the block reference.
layer: All entities within the block reference can be placed on a specific layer.
code
Python
# --- Example: Inserting the "WINDOW" block multiple times ---

# Place a window at coordinate (10, 5)
msp.add_blockref("WINDOW", insert=(10, 5), dxfattribs={'layer': 'WINDOWS'})

# Place another window at (30, 5), but make it twice as wide (xscale=2)
# and rotate it by 90 degrees.
msp.add_blockref(
    "WINDOW",
    insert=(30, 5),
    dxfattribs={
        'layer': 'WINDOWS',
        'rotation': 90,
        'xscale': 2,
    }
)
7. Agent Logic and Data Structure for Blocks
The agent should be designed to think in terms of blocks from the outset.
When to Use Blocks:
The agent should be triggered to use blocks whenever it detects:
Repetition: "add ten chairs," "place screws in all four corners."
Standard Components: "add a door," "use a standard title block."
Complex, Reusable Objects: "draw a circuit diagram with multiple transistors." A "transistor" would be a perfect block.
Ideal Data Structure:
To facilitate this, the LLM should be prompted to provide a data structure that separates definitions from placements. This mirrors the ezdxf process perfectly.
code
JSON
{
  "dxf_version": "R2018",
  "layers": [
    {"name": "WALLS", "color": 1},
    {"name": "WINDOWS", "color": 4}
  ],
  "block_definitions": [
    {
      "name": "WINDOW_1x1",
      "base_point": [0, 0],
      "entities": [
        {
          "type": "LWPOLYLINE",
          "points": [[0,0], [1,0], [1,1], [0,1]],
          "closed": true
        },
        {"type": "LINE", "start": [0.5, 0], "end": [0.5, 1]}
      ]
    }
  ],
  "entity_placements": [
    {
      "type": "LWPOLYLINE",
      "layer": "WALLS",
      "points": [[0,0], [50,0], [50,30], [0,30]],
      "closed": true
    },
    {
      "type": "BLOCK_REFERENCE",
      "name": "WINDOW_1x1",
      "layer": "WINDOWS",
      "insert": [10, 30],
      "rotation": 90
    },
    {
      "type": "BLOCK_REFERENCE",
      "name": "WINDOW_1x1",
      "layer": "WINDOWS",
      "insert": [25, 30],
      "rotation": 90
    }
  ]
}
By structuring the data this way, the agent's task becomes a clear, two-pass process:
Iterate through block_definitions and create all the necessary block blueprints.
Iterate through entity_placements and add all the block references and other top-level entities to the modelspace.
Part 4: Dimensions, Layouts, and Advanced Concepts
This section covers the final steps for creating production-ready drawings. These elements add the necessary context and formatting for a drawing to be understood and printed.
8. Dimensions
Dimensions are complex entities that display measurements. They are associative, meaning they can link to specific geometry, but for a generation task, it's simpler to create them based on explicit coordinates.
Purpose: To show length, distance, angle, or radius measurements on a drawing.
Dimension Styles: The appearance of dimensions (arrowheads, text size, colors) is controlled by a DimStyle. ezdxf creates a default style called "EZDXF" which is sufficient for most basic tasks. The agent should be aware that it can create new styles (doc.dimstyles.new()) for more control, but it's an advanced feature.
ezdxf Method (Linear): msp.add_linear_dim(base, p1, p2, angle=0, dxfattribs={}) is the most common type, used for horizontal and vertical measurements.
Key Parameters:
p1, p2: These are the two points in the modelspace that are being measured. These are the extension line definition points.
base: This is the coordinate where the dimension line itself will be placed. The location of this point determines how far away the dimension line is from the object it's measuring.
angle: The rotation angle of the dimension. 0 for horizontal, 90 for vertical.
Agent Logic for Dimensions
Identify Measurement Request: The user asks to "show the length of the wall" or "add a dimension to the side of the box."
Determine Key Points: The agent needs to identify the two points to measure (p1, p2) and a location for the dimension line (base).
Use the Correct Angle: For a horizontal distance, use angle=0. For a vertical distance, use angle=90.
code
Python
# --- Example: Adding a horizontal and vertical dimension to a rectangle ---
# Assume a rectangle exists with corners at (10, 10) and (60, 40)

# 1. Horizontal Dimension (measuring the length along the bottom edge)
p1 = (10, 10)  # First point to measure
p2 = (60, 10)  # Second point to measure
base = (35, 0) # Location of the dimension line (below the shape)
dim = msp.add_linear_dim(base=base, p1=p1, p2=p2, angle=0)


# 2. Vertical Dimension (measuring the height along the right edge)
p1 = (60, 10)  # First point to measure
p2 = (60, 40)  # Second point to measure
base = (70, 25) # Location of the dimension line (to the right of the shape)
dim = msp.add_linear_dim(base=base, p1=p1, p2=p2, angle=90)

# The agent can use the default "EZDXF" dimstyle or create its own.
# To render the dimension with the calculated measurement:
dim.render()
9. Paperspace Layouts and Viewports
So far, the agent has worked exclusively in Modelspace. This is where the actual 1:1 scale geometry lives. Paperspace is a separate area used to prepare a final drawing sheet for printing.
Paperspace Layout: A sheet of "paper" of a defined size.
Viewport: A "window" on the paperspace sheet that looks into the modelspace. You can control the view (pan, zoom/scale) within each viewport.
Title Block: Typically a block containing drawing information (title, date, scale), inserted into the paperspace.
Agent Logic for Layouts
This is a secondary task and should only be performed if the user explicitly asks for a "print layout," "drawing sheet," or "title block."
Create a New Layout: layout = doc.new_layout("My Layout").
Define Paper Size: Set paper size and orientation (this is often handled by the print settings, but can be set in ezdxf).
Insert Title Block (as a Block Reference): The agent should have a predefined "TITLE_BLOCK" block definition. This is inserted into the paperspace layout at (0, 0).
Add a Viewport: Use layout.add_viewport(). This is the crucial step. The agent needs to define:
center: The center of the viewport on the paper.
size: The width and height of the viewport on the paper.
view_center_point: The coordinate in modelspace that the viewport should be centered on.
view_height: The height of the modelspace area visible in the viewport. This controls the scale. scale = paper_height / view_height.
code
Python
# --- Example: Creating a simple A4 layout with one viewport ---

# (Prerequisite: A "TITLE_BLOCK_A4" block should be defined)
# (Prerequisite: Geometry should already exist in modelspace)

# 1. Create a new paperspace layout
layout = doc.new_layout("A4_Layout")

# 2. Add the title block (assuming it's defined)
layout.add_blockref("TITLE_BLOCK_A4", insert=(0, 0))

# 3. Add a viewport looking at the modelspace geometry
# Let's say our drawing in modelspace is centered around (50, 50)
msp_center_point = (50, 50)

# We want the viewport to be 200mm wide and 150mm high on the paper
# and centered on the page at (148.5, 105) (center of A4 landscape)
layout.add_viewport(
    center=(148.5, 105),       # Center on paper (in mm)
    size=(200, 150),           # Size on paper (in mm)
    view_center_point=msp_center_point, # What to look at in modelspace
    view_height=75             # This determines the zoom/scale
)
11. The Agent's Grand Strategy: A Summary
To generate a complete and correct DXF file, the AI agent should follow a structured, multi-pass approach.
Phase 1: Parse and Define
Receive the user's prompt.
Query the LLM to convert the natural language prompt into the structured JSON format described previously.
Pass 1 (Setup): Create the ezdxf document. Iterate through the layers, text_styles, and dim_styles sections of the JSON and create all of them. This prepares the "metadata" of the drawing.
Pass 2 (Definitions): Iterate through the block_definitions section and create every block. This populates the document with reusable components before they are used.
Phase 2: Generate Geometry
Pass 3 (Placement): Iterate through the entity_placements (or entities) section. Add all entities (LINE, LWPOLYLINE, etc.) and, critically, all BLOCK_REFERENCEs to the modelspace. At this point, the main drawing geometry is complete.
Phase 3: Finalize and Format (Optional)
Pass 4 (Dimensions): If the JSON contains dimension information, add all dimension entities.
Pass 5 (Layouts): If the user requested a print layout, create the paperspace layouts and viewports.
Phase 4: Save
Use doc.saveas() to write the final .dxf file, including robust error handling.
By following this structured, definition-first approach, the agent will reliably produce complex, efficient, and well-organized DXF files that adhere to best practices.
