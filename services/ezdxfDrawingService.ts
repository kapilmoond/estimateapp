import { LLMService } from './llmService';
import { GuidelinesService } from './guidelinesService';

export interface DrawingRequest {
  title: string;
  description: string;
  userRequirements: string;
  projectContext: string;
  designContext: string;
  guidelines: string;
  referenceText: string;
}

export interface DrawingResult {
  pythonCode: string;
  dxfContent: string;
  title: string;
  description: string;
  executionLog: string;
  imagePng?: string;
  imagePdf?: string;
  imageSuccess?: boolean;
  imageError?: string;
}

export class EzdxfDrawingService {
  private static readonly LOCAL_SERVER_URL = process.env.REACT_APP_LOCAL_SERVER_URL || 'http://127.0.0.1:8080';

  /**
   * Generate complete ezdxf Python code for technical drawing
   */
  static async generateDrawingCode(request: DrawingRequest): Promise<string> {
    const prompt = this.buildDrawingPrompt(request);
    
    console.log('EzdxfDrawingService: Generating Python code with LLM');
    console.log('Prompt length:', prompt.length);

    const response = await LLMService.generateContent(prompt);
    console.log('LLM response received, length:', response.length);
    console.log('LLM response preview:', response.substring(0, 300));

    // Extract Python code from response
    const pythonCode = this.extractPythonCode(response);

    if (!pythonCode) {
      console.error('Failed to extract Python code from LLM response');
      console.error('Full LLM response:', response);
      throw new Error(`Failed to generate valid Python code for drawing. LLM response was: ${response.substring(0, 200)}...`);
    }

    console.log('Successfully extracted Python code, length:', pythonCode.length);
    return pythonCode;
  }

  /**
   * Execute Python code via local ezdxf server and get DXF file
   */
  static async executeDrawingCode(pythonCode: string, title: string): Promise<DrawingResult> {
    try {
      // Validate code for invalid DXF attributes before execution
      const validation = this.validateDXFCode(pythonCode);
      if (!validation.isValid) {
        console.error('EzdxfDrawingService: Code validation failed');
        validation.errors.forEach(error => console.error('Validation Error:', error));
        throw new Error(`Code validation failed: ${validation.errors.join('; ')}`);
      }

      console.log('EzdxfDrawingService: Code validation passed - executing Python code via local ezdxf server');
      console.log('='.repeat(80));
      console.log('PYTHON CODE BEING SENT TO SERVER:');
      console.log('='.repeat(80));
      console.log(pythonCode);
      console.log('='.repeat(80));

      const requestBody = {
        python_code: pythonCode,
        filename: this.sanitizeFilename(title)
      };

      console.log('Request body:', requestBody);

      const response = await fetch(`${this.LOCAL_SERVER_URL}/generate-drawing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Server response status:', response.status, response.statusText);

      if (!response.ok) {
        // Get error details from server
        let errorDetails = '';
        try {
          const errorResponse = await response.json();
          console.log('='.repeat(80));
          console.log('SERVER ERROR RESPONSE:');
          console.log('='.repeat(80));
          console.log(JSON.stringify(errorResponse, null, 2));
          console.log('='.repeat(80));
          errorDetails = errorResponse.error || errorResponse.message || 'Unknown server error';
        } catch (e) {
          console.log('Could not parse error response as JSON');
          errorDetails = await response.text();
          console.log('Raw error response:', errorDetails);
        }

        if (response.status === 0 || !response.status) {
          throw new Error(`🔌 Cannot connect to local ezdxf server at ${this.LOCAL_SERVER_URL}. Please start the local server by running 'start_server.bat' (Windows) or 'start_server.sh' (Linux/Mac) from the local-server folder.`);
        }
        throw new Error(`Local server error: ${response.status} ${response.statusText}. Details: ${errorDetails}`);
      }

      const result = await response.json();
      console.log('='.repeat(80));
      console.log('SERVER SUCCESS RESPONSE:');
      console.log('='.repeat(80));
      console.log('Success:', result.success);
      console.log('File size:', result.file_size);
      console.log('Execution log:', result.execution_log);
      console.log('Image success:', result.image_success);
      if (result.image_error) {
        console.log('Image error:', result.image_error);
      }
      console.log('='.repeat(80));

      if (result.error) {
        throw new Error(`Python execution error: ${result.error}`);
      }

      return {
        pythonCode,
        dxfContent: result.dxf_content,
        title,
        description: result.description || 'Technical drawing generated with ezdxf',
        executionLog: result.execution_log || 'Drawing generated successfully',
        imagePng: result.image_png,
        imagePdf: result.image_pdf,
        imageSuccess: result.image_success,
        imageError: result.image_error
      };

    } catch (error) {
      console.error('EzdxfDrawingService: Execution error:', error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`🔌 Cannot connect to local ezdxf server. Please start the server by running 'start_server.bat' (Windows) or 'start_server.sh' (Linux/Mac) from the local-server folder.`);
      }

      throw new Error(`Failed to execute drawing code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build comprehensive prompt for ezdxf code generation
   */
  private static buildDrawingPrompt(request: DrawingRequest): string {
    return `You are a professional CAD engineer and Python developer specializing in ezdxf library version 1.4.2 for creating technical drawings.

**CRITICAL INSTRUCTION: You must respond with ONLY executable Python code. No explanations, no markdown formatting, no text before or after the code. Just the raw Python code that can be executed directly.**

**DRAWING REQUEST:**
Title: ${request.title}
Description: ${request.description}
User Requirements: ${request.userRequirements}

**PROJECT CONTEXT:**
${request.projectContext}

**DESIGN CONTEXT:**
${request.designContext}

**GUIDELINES:**
${request.guidelines}

**REFERENCE MATERIALS:**
${request.referenceText}

**COMPLETE EZDXF 1.4.2 LIBRARY REFERENCE - OFFICIAL VERIFIED SYNTAX:**

**CRITICAL: This is the complete, accurate ezdxf documentation based on official sources. Use EXACTLY these patterns and methods.**

**⚠️ INVALID ATTRIBUTE ERROR PREVENTION ⚠️**
- **NEVER use "linetypescale" attribute** - causes "Invalid DXF attribute linetypescale for entity LINE" error
- **NEVER use "lineweight" attribute** - causes "Invalid DXF attribute lineweight for entity LINE" error
- **For LINE entities ONLY use**: {"layer": "name", "color": number, "linetype": "name"}
- **For CIRCLE entities ONLY use**: {"layer": "name", "color": number, "linetype": "name"}
- **For TEXT entities ONLY use**: {"layer": "name", "color": number, "height": number, "style": "name"}
- **STICK TO BASIC ATTRIBUTES ONLY** - layer, color, linetype are safe for all entities

**1. DOCUMENT CREATION AND LAYER SETUP (VERIFIED):**
\`\`\`python
import ezdxf
from ezdxf.enums import TextEntityAlignment

# CORRECT: Create new DXF document with standard resources
doc = ezdxf.new("R2010", setup=True)  # Creates standard linetypes and text styles
msp = doc.modelspace()  # Get modelspace for adding entities

# CORRECT: Create layers (verified syntax)
doc.layers.add(name="CONSTRUCTION", color=7)    # White/black for main geometry
doc.layers.add(name="DIMENSIONS", color=1)      # Red for dimensions
doc.layers.add(name="TEXT", color=3)            # Green for text
doc.layers.add(name="HATCHING", color=2)        # Yellow for hatching
doc.layers.add(name="CENTERLINES", color=5, linetype="CENTER")  # Blue centerlines

# Standard linetypes available after setup=True:
# "CONTINUOUS", "DASHED", "DASHDOT", "DOTTED", "CENTER", "PHANTOM"
# "DASHED2", "DASHDOT2", "DOTTED2", "CENTER2", "PHANTOM2"
\`\`\`

**2. COMPLETE ENTITY CREATION REFERENCE:**

**2.1 LINES AND POLYLINES:**
\`\`\`python
# Simple line from point to point - CORRECT ATTRIBUTES ONLY
line = msp.add_line((0, 0), (10, 0), dxfattribs={"layer": "CONSTRUCTION"})

# Line with color and linetype - SAFE ATTRIBUTES
line = msp.add_line((0, 0), (10, 0), dxfattribs={"layer": "CONSTRUCTION", "color": 1, "linetype": "DASHED"})

# ❌ NEVER DO THIS - CAUSES ERRORS:
# line = msp.add_line((0, 0), (10, 0), dxfattribs={"layer": "CONSTRUCTION", "linetypescale": 1.0})  # ERROR!
# line = msp.add_line((0, 0), (10, 0), dxfattribs={"layer": "CONSTRUCTION", "lineweight": 0.5})     # ERROR!

# Multiple connected lines using LWPolyline (most efficient)
# Format: [(x, y), (x, y), ...] or [(x, y, bulge), ...]
points = [(0, 0), (10, 0), (10, 5), (0, 5)]
polyline = msp.add_lwpolyline(points, close=True, dxfattribs={"layer": "CONSTRUCTION"})

# Polyline with arcs (bulge values)
# bulge = tan(angle/4), positive = right turn, negative = left turn
curved_points = [(0, 0, 0.5), (10, 0, 0), (10, 10, -0.5), (0, 10, 0)]
msp.add_lwpolyline(curved_points, close=True, dxfattribs={"layer": "CONSTRUCTION"})

# Construction lines (infinite lines)
msp.add_xline((0, 0), (1, 1), dxfattribs={"layer": "CONSTRUCTION"})  # Through origin at 45°
msp.add_ray((0, 0), (1, 0), dxfattribs={"layer": "CONSTRUCTION"})    # Ray from origin
\`\`\`

**2.2 CIRCLES AND ARCS:**
\`\`\`python
# Circle: center point and radius
circle = msp.add_circle((5, 5), radius=2.5, dxfattribs={"layer": "CONSTRUCTION"})

# Arc: center, radius, start_angle, end_angle (in degrees, counter-clockwise)
arc = msp.add_arc((10, 10), radius=3, start_angle=30, end_angle=120,
                  dxfattribs={"layer": "CONSTRUCTION"})

# Ellipse: center, major_axis vector, ratio (minor/major), start/end parameters
ellipse = msp.add_ellipse((0, 0), major_axis=(5, 0), ratio=0.5,
                         start_param=0, end_param=math.pi,
                         dxfattribs={"layer": "CONSTRUCTION"})
\`\`\`

**2.3 TEXT (VERIFIED OFFICIAL SYNTAX):**
\`\`\`python
# CORRECT: Simple text entity (verified syntax)
text = msp.add_text("LABEL", dxfattribs={"layer": "TEXT", "height": 25})
text.set_placement((100, 100), align=TextEntityAlignment.MIDDLE_LEFT)

# CORRECT: Text alignment options (from official documentation):
# TextEntityAlignment.LEFT, TextEntityAlignment.CENTER, TextEntityAlignment.RIGHT
# TextEntityAlignment.MIDDLE_LEFT, TextEntityAlignment.MIDDLE_CENTER, TextEntityAlignment.MIDDLE_RIGHT
# TextEntityAlignment.TOP_LEFT, TextEntityAlignment.TOP_CENTER, TextEntityAlignment.TOP_RIGHT
# TextEntityAlignment.BOTTOM_LEFT, TextEntityAlignment.BOTTOM_CENTER, TextEntityAlignment.BOTTOM_RIGHT

# SIMPLE ANNOTATION METHOD (NO COMPLEX LEADERS):
# 1. Draw simple line for pointer
msp.add_line((50, 50), (150, 100), dxfattribs={"layer": "DIMENSIONS"})
# 2. Add text at end of line
msp.add_text("CONCRETE M20", dxfattribs={"layer": "TEXT", "height": 20}).set_placement((150, 100))

# AVOID: msp.add_leader() - causes errors
# AVOID: Complex MTEXT unless specifically needed
\`\`\`

**3. DIMENSIONS (VERIFIED OFFICIAL SYNTAX):**

**3.1 LINEAR DIMENSIONS (FROM OFFICIAL TUTORIAL):**
\`\`\`python
# CORRECT: Horizontal dimension (official syntax)
dim = msp.add_linear_dim(
    base=(3, 2),         # Location of dimension line
    p1=(0, 0),           # First measurement point
    p2=(3, 0),           # Second measurement point
    dimstyle="EZDXF",    # Default dimension style
    dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()  # CRITICAL: Always call render() after creating dimensions

# CORRECT: Vertical dimension (angle=90)
dim = msp.add_linear_dim(
    base=(-2, 0), p1=(0, 0), p2=(0, 10), angle=90,
    dimstyle="EZDXF", dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()

# CORRECT: Aligned dimension (parallel to measured line)
dim = msp.add_aligned_dim(
    p1=(0, 2), p2=(3, 0), distance=1,  # distance = offset from measured line
    dimstyle="EZDXF", dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()

# CORRECT: Rotated dimension (at specific angle)
dim = msp.add_linear_dim(
    base=(3, 2), p1=(3, 0), p2=(6, 0), angle=-30,  # angle in degrees
    dimstyle="EZDXF", dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()
\`\`\`

**3.2 RADIAL DIMENSIONS:**
\`\`\`python
# Radius dimension
dim = msp.add_radius_dim(
    center=(5, 5),       # Circle/arc center
    radius=2.5,          # Radius value
    angle=45,            # Angle for dimension line placement
    dimstyle="EZDXF", dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()

# Diameter dimension
dim = msp.add_diameter_dim(
    center=(5, 5),       # Circle center
    radius=2.5,          # Radius (diameter = 2 * radius)
    angle=135,           # Angle for dimension line
    dimstyle="EZDXF", dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()
\`\`\`

**3.3 ANGULAR DIMENSIONS:**
\`\`\`python
# Angular dimension from 3 points
dim = msp.add_angular_dim_3p(
    base=(0, 0),         # Vertex point
    line1=(5, 0),        # End of first line
    line2=(0, 5),        # End of second line
    text="<>",           # Angle measurement
    dimstyle="EZDXF", dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()

# Angular dimension from 2 lines
dim = msp.add_angular_dim_2l(
    line1=((0, 0), (5, 0)),    # First line (start, end)
    line2=((0, 0), (0, 5)),    # Second line (start, end)
    location=(3, 3),           # Dimension arc location
    dimstyle="EZDXF", dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()
\`\`\`

**3.4 DIMENSION STYLE FOR VISIBLE TEXT (ERROR-FREE SOLUTION):**
\`\`\`python
# CRITICAL: Configure dimension style for visible text (SAFE METHOD)
dimstyle = doc.dimstyles.get("Standard")
dimstyle.dxf.dimtxt = 100        # Text height (proportional to drawing)
dimstyle.dxf.dimasz = 50         # Arrow size
dimstyle.dxf.dimexe = 25         # Extension beyond dimension line
dimstyle.dxf.dimexo = 10         # Extension line offset
dimstyle.dxf.dimgap = 10         # Gap around text
dimstyle.dxf.dimclrt = 1         # Text color (red)
dimstyle.dxf.dimclrd = 1         # Dimension line color (red)
dimstyle.dxf.dimclre = 1         # Extension line color (red)
dimstyle.dxf.dimtad = 1          # Text above dimension line
dimstyle.dxf.dimjust = 0         # Center text

# CRITICAL: DO NOT set dimpost, dimunit, or other unit parameters
# These cause "Invalid dimpost string" errors

# Create dimension with configured style
dim = msp.add_linear_dim(
    base=(0, -200),              # Position dimension line below
    p1=(0, 0),                   # Start measurement point
    p2=(2000, 0),                # End measurement point (2000mm = 2m)
    dimstyle="Standard",         # Use configured Standard dimstyle
    text="<>",                   # Use automatic measurement text (NO UNITS)
    dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()  # CRITICAL: Always call render()

# SAFE OVERRIDE METHOD (only use safe parameters)
dim = msp.add_linear_dim(
    base=(0, -400),
    p1=(0, 0),
    p2=(2000, 0),
    dimstyle="Standard",
    text="<>",                   # NEVER add units here
    override={
        "dimtxt": 100,           # Text height - SAFE
        "dimasz": 50,            # Arrow size - SAFE
        "dimclrt": 1,            # Text color - SAFE
        "dimtad": 1,             # Text above line - SAFE
    },
    dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()
\`\`\`
\`\`\`

**4. HATCHING (VERIFIED OFFICIAL SYNTAX):**

**4.1 SOLID FILL HATCH (FROM OFFICIAL TUTORIAL):**
\`\`\`python
# CORRECT: Solid fill hatch (default color=7, white/black)
hatch = msp.add_hatch(color=2, dxfattribs={"layer": "HATCHING"})
# CORRECT: Add boundary path (must be closed)
hatch.paths.add_polyline_path(
    [(0, 0), (10, 0), (10, 10), (0, 10)], is_closed=True
)
\`\`\`

**4.2 PATTERN FILL HATCH (VERIFIED PATTERNS):**
\`\`\`python
# CORRECT: Pattern hatch for concrete/masonry
hatch = msp.add_hatch(dxfattribs={"layer": "HATCHING"})
hatch.set_pattern_fill("ANSI31", scale=0.5)  # ANSI31 = Iron, Brick, Stone masonry
hatch.paths.add_polyline_path(
    [(0, 0), (10, 0), (10, 10), (0, 10)], is_closed=True
)

# CORRECT: Other verified patterns:
# "ANSI31" - Iron, Brick, Stone masonry
# "ANSI32" - Steel
# "ANSI33" - Bronze, Brass, Copper
# "ANSI34" - Plastic, Rubber
\`\`\`

**4.3 MULTIPLE BOUNDARY PATHS (ISLANDS):**
\`\`\`python
# CORRECT: Hatch with islands (from official tutorial)
hatch = msp.add_hatch(color=1, dxfattribs={"hatch_style": 0})  # nested style

# External boundary
hatch.paths.add_polyline_path(
    [(0, 0), (10, 0), (10, 10), (0, 10)],
    is_closed=True,
    flags=1  # BOUNDARY_PATH_EXTERNAL
)

# Internal boundary (island)
hatch.paths.add_polyline_path(
    [(2, 2), (8, 2), (8, 8), (2, 8)],
    is_closed=True,
    flags=16  # BOUNDARY_PATH_OUTERMOST
)
\`\`\`

**5. BLOCKS AND REUSABLE ELEMENTS:**

**5.1 CREATING AND USING BLOCKS:**
\`\`\`python
# Create a block definition (reusable symbol)
bolt_block = doc.blocks.new("BOLT_M12")
# Add geometry to block
bolt_block.add_circle((0, 0), radius=6, dxfattribs={"layer": "CONSTRUCTION"})
bolt_block.add_circle((0, 0), radius=3, dxfattribs={"layer": "CONSTRUCTION"})
bolt_block.add_text("M12", dxfattribs={"layer": "TEXT", "height": 2})

# Insert block instances
msp.add_blockref("BOLT_M12", (10, 10), dxfattribs={"layer": "CONSTRUCTION"})
msp.add_blockref("BOLT_M12", (20, 10), dxfattribs={"layer": "CONSTRUCTION", "xscale": 1.5})

# Block with attributes (for title blocks, etc.)
title_block = doc.blocks.new("TITLE_BLOCK")
title_block.add_rectangle((0, 0), 100, 50, dxfattribs={"layer": "CONSTRUCTION"})
title_block.add_text("DRAWING TITLE", dxfattribs={"layer": "TEXT", "height": 5})
\`\`\`

**5.2 CENTERLINES AND CONSTRUCTION LINES:**
\`\`\`python
# Centerlines (dashed lines for symmetry)
msp.add_line((0, 5), (20, 5), dxfattribs={"layer": "CENTERLINES", "linetype": "CENTER"})
msp.add_line((10, 0), (10, 10), dxfattribs={"layer": "CENTERLINES", "linetype": "CENTER"})

# Hidden lines (for internal features)
msp.add_line((5, 0), (5, 10), dxfattribs={"layer": "HIDDEN", "linetype": "HIDDEN"})

# Construction lines (infinite reference lines)
msp.add_xline((0, 0), (1, 1), dxfattribs={"layer": "CONSTRUCTION"})  # 45° line through origin

# SIMPLE ANNOTATION LINES (instead of complex leaders)
# Draw simple line for annotation
msp.add_line((100, 100), (200, 150), dxfattribs={"layer": "DIMENSIONS"})
# Add text at the end
msp.add_text("ANNOTATION TEXT", dxfattribs={"layer": "TEXT", "height": 25}).set_placement((200, 150))
\`\`\`

**5.3 LINETYPES AND STYLES:**
\`\`\`python
# Standard linetypes (must be loaded)
doc.linetypes.load_linetypes_from_file()  # Load standard linetypes

# Available standard linetypes:
# "CONTINUOUS" - Solid line (default)
# "DASHED" - Dashed line
# "HIDDEN" - Hidden line (short dashes)
# "CENTER" - Centerline (long-short-long)
# "PHANTOM" - Phantom line (long-short-short-long)
# "DOT" - Dotted line
# "DASHDOT" - Dash-dot line

# Apply linetypes
msp.add_line((0, 0), (10, 0), dxfattribs={"linetype": "DASHED"})
msp.add_line((0, 2), (10, 2), dxfattribs={"linetype": "CENTER"})
\`\`\`

**6. COMPLETE CONSTRUCTION DRAWING EXAMPLES:**

**6.1 FOUNDATION SECTION EXAMPLE:**
\`\`\`python
def create_foundation_section():
    doc = ezdxf.new("R2010", setup=True)
    msp = doc.modelspace()

    # Create layers
    doc.layers.add("CONSTRUCTION", color=colors.WHITE)
    doc.layers.add("DIMENSIONS", color=colors.RED)
    doc.layers.add("TEXT", color=colors.GREEN)
    doc.layers.add("HATCHING", color=colors.YELLOW)

    # Ground line
    msp.add_line((0, 0), (20, 0), dxfattribs={"layer": "CONSTRUCTION"})

    # Foundation outline
    foundation = [(2, 0), (2, -2), (18, -2), (18, 0)]
    msp.add_lwpolyline(foundation, close=False, dxfattribs={"layer": "CONSTRUCTION"})

    # Wall above foundation
    wall = [(6, 0), (6, 8), (14, 8), (14, 0)]
    msp.add_lwpolyline(wall, close=False, dxfattribs={"layer": "CONSTRUCTION"})

    # Hatching for concrete
    hatch = msp.add_hatch(dxfattribs={"layer": "HATCHING"})
    hatch.set_pattern_fill("ANSI31", scale=0.3)
    hatch.paths.add_polyline_path([(2, 0), (2, -2), (18, -2), (18, 0)], is_closed=True)

    # Dimensions
    dim1 = msp.add_linear_dim(base=(0, -3), p1=(2, 0), p2=(18, 0), dimstyle="EZDXF")
    dim1.render()

    dim2 = msp.add_linear_dim(base=(19, 0), p1=(18, 0), p2=(18, -2), angle=90, dimstyle="EZDXF")
    dim2.render()

    # Simple labels (NO LEADERS)
    msp.add_text("CONCRETE FOUNDATION", dxfattribs={"layer": "TEXT", "height": 20}).set_placement((10, -1000), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("GROUND LEVEL", dxfattribs={"layer": "TEXT", "height": 20}).set_placement((100, 100))

    doc.saveas("foundation_section.dxf")
    return doc
\`\`\`

**6.2 WALL SECTION WITH STEPPED FOUNDATION:**
\`\`\`python
def create_wall_section_with_stepped_foundation():
    doc = ezdxf.new("R2010", setup=True)
    msp = doc.modelspace()

    # Setup layers
    doc.layers.add("CONSTRUCTION", color=colors.WHITE)
    doc.layers.add("DIMENSIONS", color=colors.RED)
    doc.layers.add("TEXT", color=colors.GREEN)
    doc.layers.add("HATCHING", color=colors.CYAN)
    doc.layers.add("CENTERLINES", color=colors.BLUE)

    # Ground level reference
    msp.add_line((0, 0), (25, 0), dxfattribs={"layer": "CONSTRUCTION"})

    # Stepped foundation
    foundation_points = [
        (2, 0), (2, -1), (4, -1), (4, -2), (21, -2), (21, -1), (23, -1), (23, 0)
    ]
    msp.add_lwpolyline(foundation_points, close=False, dxfattribs={"layer": "CONSTRUCTION"})

    # Wall above ground (2.5m high)
    wall_height = 2.5 * 1000  # Convert to mm for 1:100 scale
    wall_points = [(6, 0), (6, wall_height), (19, wall_height), (19, 0)]
    msp.add_lwpolyline(wall_points, close=False, dxfattribs={"layer": "CONSTRUCTION"})

    # Hatching for foundation
    hatch = msp.add_hatch(dxfattribs={"layer": "HATCHING"})
    hatch.set_pattern_fill("ANSI31", scale=0.5)
    foundation_hatch = [(2, 0), (2, -1), (4, -1), (4, -2), (21, -2), (21, -1), (23, -1), (23, 0)]
    hatch.paths.add_polyline_path(foundation_hatch, is_closed=True)

    # Centerline for wall
    msp.add_line((12.5, -2), (12.5, wall_height + 500),
                dxfattribs={"layer": "CENTERLINES", "linetype": "CENTER"})

    # Comprehensive dimensions
    # Foundation width
    dim1 = msp.add_linear_dim(base=(0, -3), p1=(2, 0), p2=(23, 0), dimstyle="EZDXF")
    dim1.render()

    # Foundation depths
    dim2 = msp.add_linear_dim(base=(24, 0), p1=(23, 0), p2=(23, -1), angle=90, dimstyle="EZDXF")
    dim2.render()

    dim3 = msp.add_linear_dim(base=(25, 0), p1=(21, -1), p2=(21, -2), angle=90, dimstyle="EZDXF")
    dim3.render()

    # Wall height
    dim4 = msp.add_linear_dim(base=(20, 0), p1=(19, 0), p2=(19, wall_height), angle=90, dimstyle="EZDXF")
    dim4.render()

    # Wall thickness
    dim5 = msp.add_linear_dim(base=(0, wall_height + 200), p1=(6, wall_height), p2=(19, wall_height), dimstyle="EZDXF")
    dim5.render()

    # Labels and annotations
    msp.add_text("BOUNDARY WALL SECTION", dxfattribs={"layer": "TEXT", "height": 150}).set_placement((12.5, wall_height + 800), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("2.5m ABOVE GROUND", dxfattribs={"layer": "TEXT", "height": 100}).set_placement((12.5, wall_height/2), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("STEPPED FOUNDATION", dxfattribs={"layer": "TEXT", "height": 80}).set_placement((12.5, -1500), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("GROUND LEVEL", dxfattribs={"layer": "TEXT", "height": 80}).set_placement((1, 200))

    # Material specifications
    msp.add_text("CONCRETE M20", dxfattribs={"layer": "TEXT", "height": 60}).set_placement((12.5, -500), align=TextEntityAlignment.MIDDLE_CENTER)
    msp.add_text("REINFORCEMENT AS PER DESIGN", dxfattribs={"layer": "TEXT", "height": 50}).set_placement((12.5, -800), align=TextEntityAlignment.MIDDLE_CENTER)

    doc.saveas("boundary_wall_section.dxf")
    return doc
\`\`\`

**CRITICAL PROFESSIONAL DRAWING STANDARDS:**

**1. DIMENSION TEXT REQUIREMENTS (CRITICAL FOR INDIAN STANDARDS):**
- Configure dimstyle BEFORE creating dimensions
- Set dimtxt proportional to drawing size (e.g., 100 for 2000mm line)
- Use dimtad=1 (text above line) and dimjust=0 (center text)
- Include text="<>" parameter for automatic measurement
- Alternative: text="L=<>" for Indian standard format
- ALWAYS call dim.render() after each dimension
- Ensure measurement numbers are clearly visible on dimension lines

**2. CLEAN DRAWING REQUIREMENTS:**
- NO TITLES of any kind
- NO instruction boxes or labels
- NO unnecessary text elements
- NO material callouts unless specifically requested
- ONLY the technical drawing itself
- Focus purely on geometry and dimensions

**3. LAYER ORGANIZATION (MINIMAL):**
- CONSTRUCTION: Main geometry only
- DIMENSIONS: Dimensions with visible text
- HATCHING: Material patterns only
- NO TEXT LAYER unless specifically needed

**4. PROFESSIONAL APPEARANCE:**
- Clean, minimal design
- No decorative elements
- No title blocks
- No annotation boxes
- Pure technical drawing only
- Proper scaling and proportions

**5. FORBIDDEN ELEMENTS:**
- NO titles or headers
- NO instruction text
- NO material labels (unless specifically requested)
- NO complex leaders or callouts
- NO decorative text elements
- NO unnecessary annotations

**6. CRITICAL EXECUTION:**
- ALWAYS call dim.render() after creating dimensions
- Use setup=True when creating document
- Configure dimension style for visible text
- Save with doc.saveas("drawing.dxf")
- Focus on drawing quality, not decoration

**7. FORBIDDEN PARAMETERS (CAUSE RUNTIME ERRORS):**
- DO NOT set dimpost parameter - causes "Invalid dimpost string" error
- DO NOT set dimunit parameter - causes unit errors
- DO NOT add units to text parameter (e.g., text="<> mm") - causes errors
- DO NOT use msp.add_leader() - causes errors
- DO NOT use leader.set_text() - method does not exist
- NEVER set these dimension parameters: dimpost, dimunit, dimaunit, dimdsep

**CRITICAL OUTPUT REQUIREMENTS:**

1. **GENERATE ONLY EXECUTABLE PYTHON CODE** - No explanations, no markdown, no comments outside the code
2. **START WITH IMPORTS** - Always begin with the required imports
3. **END WITH SAVE** - Always end with doc.saveas("drawing.dxf")
4. **INCLUDE RENDER CALLS** - Always call dim.render() after creating dimensions
5. **USE PROPER SYNTAX** - Follow exact ezdxf patterns shown above

**WORKING EXAMPLE - LINE WITH VISIBLE DIMENSION TEXT (FIXED):**
\`\`\`python
import ezdxf

# Create document with setup=True for dimension styles
doc = ezdxf.new("R2010", setup=True)
msp = doc.modelspace()

# Create minimal layers
doc.layers.add(name="CONSTRUCTION", color=7)
doc.layers.add(name="DIMENSIONS", color=1)

# CRITICAL: Configure dimension style for visible text
dimstyle = doc.dimstyles.get("Standard")
dimstyle.dxf.dimtxt = 100        # Text height (proportional to 2000mm line)
dimstyle.dxf.dimasz = 50         # Arrow size
dimstyle.dxf.dimexe = 25         # Extension beyond dimension line
dimstyle.dxf.dimexo = 10         # Extension line offset
dimstyle.dxf.dimgap = 10         # Gap around text
dimstyle.dxf.dimclrt = 1         # Text color (red)
dimstyle.dxf.dimclrd = 1         # Dimension line color (red)
dimstyle.dxf.dimclre = 1         # Extension line color (red)
dimstyle.dxf.dimtad = 1          # Text above dimension line
dimstyle.dxf.dimjust = 0         # Center text

# Draw 2m line (2000mm in drawing units)
msp.add_line((0, 0), (2000, 0), dxfattribs={"layer": "CONSTRUCTION"})

# Add dimension with visible text showing "2000"
dim = msp.add_linear_dim(
    base=(0, -200),              # Position below the line
    p1=(0, 0),                   # Start point
    p2=(2000, 0),                # End point (2000mm)
    dimstyle="Standard",         # Use configured Standard dimstyle
    text="<>",                   # Automatic measurement text
    dxfattribs={"layer": "DIMENSIONS"}
)
dim.render()  # CRITICAL: Always call render()

# Save the drawing (NO TITLES, NO EXTRA TEXT)
doc.saveas("drawing.dxf")
\`\`\`

**CRITICAL FINAL REQUIREMENTS FOR ERROR-FREE DIMENSIONS:**

1. **CONFIGURE DIMSTYLE FIRST**: Always configure dimstyle BEFORE creating dimensions
2. **TEXT SIZE**: Set dimtxt proportional to drawing (e.g., 100 for 2000mm line)
3. **TEXT POSITION**: Use dimtad=1 (above line) and dimjust=0 (center)
4. **MEASUREMENT DISPLAY**: Use text="<>" for automatic measurements (NO UNITS)
5. **NEVER SET UNITS**: DO NOT set dimpost, dimunit, or add units to text
6. **ALWAYS CALL dim.render()**: After every dimension creation
7. **NO TITLES OR LABELS**: Clean drawing only with visible dimension numbers

**CRITICAL: AVOID THESE ERRORS:**
- DO NOT set dimpost parameter (causes "Invalid dimpost string" error)
- DO NOT add units to text (e.g., text="<> mm" causes errors)
- DO NOT set dimunit parameter (causes unit errors)

**RESPOND WITH ONLY THE PYTHON CODE - NO EXPLANATIONS, NO MARKDOWN, NO OTHER TEXT**

Your response must start with "import ezdxf" and end with "doc.saveas('drawing.dxf')".
Use ONLY safe dimension parameters. NO units, NO dimpost, NO dimunit.`;
  }

  /**
   * Validate Python code for invalid DXF attributes
   */
  private static validateDXFCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = code.split('\n');

    // Check for invalid attributes that cause runtime errors
    const invalidAttributes = [
      'linetypescale',
      'lineweight',
      'thickness',
      'elevation',
      'extrusion'
    ];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for invalid attributes in dxfattribs
      invalidAttributes.forEach(attr => {
        if (line.includes(`"${attr}"`) || line.includes(`'${attr}'`)) {
          errors.push(`Line ${lineNumber}: Invalid DXF attribute "${attr}" detected. This will cause runtime errors.`);
        }
      });

      // Check for common problematic patterns
      if (line.includes('add_line') && (line.includes('linetypescale') || line.includes('lineweight'))) {
        errors.push(`Line ${lineNumber}: LINE entity with invalid attributes. Use only layer, color, linetype.`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract Python code from LLM response with enhanced detection
   */
  private static extractPythonCode(response: string): string | null {
    console.log('EzdxfDrawingService: Extracting Python code from response');
    console.log('Response length:', response.length);
    console.log('Response preview:', response.substring(0, 200));

    // Method 1: Try to extract code from markdown blocks
    const codeBlockPatterns = [
      /```python\s*([\s\S]*?)```/g,
      /```\s*([\s\S]*?)```/g,
      /`{3,}\s*python\s*([\s\S]*?)`{3,}/g,
      /`{3,}\s*([\s\S]*?)`{3,}/g
    ];

    for (const pattern of codeBlockPatterns) {
      const matches = [...response.matchAll(pattern)];
      for (const match of matches) {
        const code = match[1].trim();
        if (this.isValidEzdxfCode(code)) {
          console.log('EzdxfDrawingService: Found valid code in markdown block');
          return code;
        }
      }
    }

    // Method 2: Check if the entire response is code
    const cleanResponse = response.trim();
    if (this.isValidEzdxfCode(cleanResponse)) {
      console.log('EzdxfDrawingService: Entire response is valid code');
      return cleanResponse;
    }

    // Method 3: Try to find code between common delimiters
    const delimiters = [
      /import ezdxf[\s\S]*?doc\.saveas\([^)]+\)/,
      /import ezdxf[\s\S]*?\.dxf['"]\)/,
      /from ezdxf[\s\S]*?doc\.saveas\([^)]+\)/
    ];

    for (const delimiter of delimiters) {
      const match = response.match(delimiter);
      if (match) {
        const code = match[0].trim();
        if (this.isValidEzdxfCode(code)) {
          console.log('EzdxfDrawingService: Found valid code with delimiter pattern');
          return code;
        }
      }
    }

    // Method 4: Extract lines that look like Python code
    const lines = response.split('\n');
    let codeLines: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Start collecting if we see import ezdxf
      if (trimmedLine.startsWith('import ezdxf') || trimmedLine.startsWith('from ezdxf')) {
        inCodeBlock = true;
        codeLines = [line];
        continue;
      }

      // Continue collecting if we're in a code block
      if (inCodeBlock) {
        codeLines.push(line);

        // Stop if we see doc.saveas
        if (trimmedLine.includes('doc.saveas(')) {
          const extractedCode = codeLines.join('\n').trim();
          if (this.isValidEzdxfCode(extractedCode)) {
            console.log('EzdxfDrawingService: Found valid code by line extraction');
            return extractedCode;
          }
        }
      }
    }

    console.log('EzdxfDrawingService: No valid Python code found in response');
    console.log('Full response for debugging:', response);
    return null;
  }

  /**
   * Validate if the extracted code is valid ezdxf code
   */
  private static isValidEzdxfCode(code: string): boolean {
    if (!code || code.length < 50) {
      console.log('Code validation failed: too short or empty');
      return false;
    }

    // Must have essential ezdxf elements
    const hasImport = code.includes('import ezdxf') || code.includes('from ezdxf');
    const hasNewDoc = code.includes('ezdxf.new(') || code.includes('.new(');
    const hasModelspace = code.includes('.modelspace()') || code.includes('msp =');
    const hasSave = code.includes('.saveas(') || code.includes('doc.saveas');

    console.log('Code validation:', {
      hasImport,
      hasNewDoc,
      hasModelspace,
      hasSave,
      codeLength: code.length,
      codePreview: code.substring(0, 100)
    });

    const isValid = hasImport && hasNewDoc && hasModelspace && hasSave;

    if (!isValid) {
      console.log('Code validation failed - missing required elements');
      if (!hasImport) console.log('Missing: import ezdxf');
      if (!hasNewDoc) console.log('Missing: ezdxf.new()');
      if (!hasModelspace) console.log('Missing: .modelspace()');
      if (!hasSave) console.log('Missing: .saveas()');
    }

    return isValid;
  }

  /**
   * Sanitize filename for safe file operations
   */
  private static sanitizeFilename(title: string): string {
    return title
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase()
      .substring(0, 50) || 'drawing';
  }

  /**
   * Check if the local ezdxf server is running
   */
  static async checkServerStatus(): Promise<{ running: boolean; message: string; version?: string }> {
    try {
      const response = await fetch(`${this.LOCAL_SERVER_URL}/`, {
        method: 'GET',
        timeout: 5000
      } as any);

      if (response.ok) {
        const result = await response.json();
        return {
          running: true,
          message: result.message || 'Server is running',
          version: result.version
        };
      } else {
        return {
          running: false,
          message: `Server responded with status ${response.status}`
        };
      }
    } catch (error) {
      return {
        running: false,
        message: 'Cannot connect to local server. Please start the server.'
      };
    }
  }

  /**
   * Test the ezdxf functionality on the server
   */
  static async testServer(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.LOCAL_SERVER_URL}/test`, {
        method: 'GET'
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        return {
          success: true,
          message: `ezdxf server is working correctly (version ${result.ezdxf_version})`
        };
      } else {
        return {
          success: false,
          message: result.message || 'Server test failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Cannot connect to server for testing'
      };
    }
  }

  /**
   * Create a downloadable DXF file from base64 content
   */
  static downloadDXF(dxfContent: string, filename: string): void {
    try {
      // Decode base64 content
      const binaryString = atob(dxfContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and download
      const blob = new Blob([bytes], { type: 'application/dxf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.dxf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      console.log('EzdxfDrawingService: DXF file downloaded successfully');
    } catch (error) {
      console.error('EzdxfDrawingService: Download error:', error);
      throw new Error('Failed to download DXF file');
    }
  }

  /**
   * Download PNG image from base64 content
   */
  static downloadPNG(imageContent: string, filename: string): void {
    try {
      const binaryString = atob(imageContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'image/png' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      console.log('EzdxfDrawingService: PNG image downloaded successfully');
    } catch (error) {
      console.error('EzdxfDrawingService: PNG download error:', error);
      throw new Error('Failed to download PNG image');
    }
  }

  /**
   * Download PDF image from base64 content
   */
  static downloadPDF(imageContent: string, filename: string): void {
    try {
      const binaryString = atob(imageContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      console.log('EzdxfDrawingService: PDF image downloaded successfully');
    } catch (error) {
      console.error('EzdxfDrawingService: PDF download error:', error);
      throw new Error('Failed to download PDF image');
    }
  }

  /**
   * Print PNG image directly
   */
  static printPNG(imageContent: string): void {
    try {
      const binaryString = atob(imageContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'image/png' });
      const url = URL.createObjectURL(blob);

      // Open in new window for printing
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      // Clean up URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      console.log('EzdxfDrawingService: PNG image opened for printing');
    } catch (error) {
      console.error('EzdxfDrawingService: Print error:', error);
      throw new Error('Failed to print PNG image');
    }
  }
}
