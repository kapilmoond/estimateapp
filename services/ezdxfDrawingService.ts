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
    const response = await LLMService.generateContent(prompt);
    
    // Extract Python code from response
    const pythonCode = this.extractPythonCode(response);
    
    if (!pythonCode) {
      throw new Error('Failed to generate valid Python code for drawing');
    }
    
    return pythonCode;
  }

  /**
   * Execute Python code via local ezdxf server and get DXF file
   */
  static async executeDrawingCode(pythonCode: string, title: string): Promise<DrawingResult> {
    try {
      console.log('EzdxfDrawingService: Executing Python code via local ezdxf server');

      const response = await fetch(`${this.LOCAL_SERVER_URL}/generate-drawing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          python_code: pythonCode,
          filename: this.sanitizeFilename(title)
        })
      });

      if (!response.ok) {
        if (response.status === 0 || !response.status) {
          throw new Error(`🔌 Cannot connect to local ezdxf server at ${this.LOCAL_SERVER_URL}. Please start the local server by running 'start_server.bat' (Windows) or 'start_server.sh' (Linux/Mac) from the local-server folder.`);
        }
        throw new Error(`Local server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

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
    return `You are a professional CAD engineer and Python developer specializing in ezdxf library for creating technical drawings. Generate complete, executable Python code that creates a professional DXF technical drawing.

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

**EZDXF LIBRARY COMPLETE REFERENCE:**

**1. BASIC SETUP:**
\`\`\`python
import ezdxf
from ezdxf import colors
from ezdxf.enums import TextEntityAlignment
from ezdxf.tools.standards import setup_dimstyle

# Create new DXF document
doc = ezdxf.new("R2010", setup=True)  # setup=True adds standard resources
msp = doc.modelspace()

# Create layers
doc.layers.add("CONSTRUCTION", color=colors.CYAN)
doc.layers.add("DIMENSIONS", color=colors.RED)
doc.layers.add("TEXT", color=colors.GREEN)
doc.layers.add("CENTERLINES", color=colors.YELLOW)
\`\`\`

**2. BASIC ENTITIES:**
\`\`\`python
# Lines
msp.add_line((0, 0), (10, 0), dxfattribs={"layer": "CONSTRUCTION"})
msp.add_line((0, 0), (0, 10), dxfattribs={"color": colors.RED})

# Circles
msp.add_circle((5, 5), radius=2.5, dxfattribs={"layer": "CONSTRUCTION"})

# Arcs (center, radius, start_angle, end_angle in degrees)
msp.add_arc((0, 0), radius=5, start_angle=0, end_angle=90)

# Rectangles
msp.add_lwpolyline([(0, 0), (10, 0), (10, 5), (0, 5)], close=True)

# Text
msp.add_text("TITLE", dxfattribs={"layer": "TEXT", "height": 2.5})
    .set_placement((5, 8), align=TextEntityAlignment.MIDDLE_CENTER)
\`\`\`

**3. DIMENSIONS:**
\`\`\`python
# Linear dimensions
dim = msp.add_linear_dim(
    base=(0, -2),        # Dimension line position
    p1=(0, 0),           # First extension line
    p2=(10, 0),          # Second extension line
    text="<>",           # Use actual measurement
    dimstyle="EZDXF",    # Dimension style
    dxfattribs={"layer": "DIMENSIONS"}
)

# Radius dimensions
msp.add_radius_dim(
    center=(5, 5),       # Circle center
    radius=2.5,          # Circle radius
    angle=45,            # Angle for dimension line
    dxfattribs={"layer": "DIMENSIONS"}
)

# Angular dimensions
msp.add_angular_dim_3p(
    base=(0, 0),         # Vertex
    line1=(5, 0),        # First line end
    line2=(0, 5),        # Second line end
    text="<>",
    dxfattribs={"layer": "DIMENSIONS"}
)
\`\`\`

**4. ADVANCED FEATURES:**
\`\`\`python
# Polylines with bulges (for arcs)
points = [(0, 0), (10, 0, 0.5), (10, 10), (0, 10)]  # Third value is bulge
msp.add_lwpolyline(points, close=True)

# Hatching
hatch = msp.add_hatch(color=colors.CYAN)
hatch.paths.add_polyline_path([(0, 0), (10, 0), (10, 10), (0, 10)], is_closed=True)

# Blocks (for repeated elements)
block = doc.blocks.new("BOLT")
block.add_circle((0, 0), radius=0.5)
block.add_circle((0, 0), radius=0.25)
# Insert block
msp.add_blockref("BOLT", (5, 5))

# Centerlines
msp.add_line((0, 5), (10, 5), dxfattribs={"layer": "CENTERLINES", "linetype": "CENTER"})
\`\`\`

**5. COMPLETE EXAMPLE STRUCTURE:**
\`\`\`python
import ezdxf
from ezdxf import colors
from ezdxf.enums import TextEntityAlignment

def create_technical_drawing():
    # Setup
    doc = ezdxf.new("R2010", setup=True)
    msp = doc.modelspace()
    
    # Create layers
    doc.layers.add("OBJECT", color=colors.WHITE)
    doc.layers.add("DIMENSIONS", color=colors.RED)
    doc.layers.add("TEXT", color=colors.GREEN)
    doc.layers.add("CENTERLINES", color=colors.CYAN)
    
    # Main drawing code here
    # ... add entities, dimensions, text ...
    
    # Save
    doc.saveas("drawing.dxf")
    return doc

# Execute
if __name__ == "__main__":
    doc = create_technical_drawing()
    print("Drawing created successfully")
\`\`\`

**CRITICAL REQUIREMENTS:**
1. **Generate COMPLETE, EXECUTABLE Python code** that creates the requested technical drawing
2. **Include ALL necessary imports** (ezdxf, colors, enums, etc.)
3. **Create appropriate layers** for different element types (construction, dimensions, text, centerlines)
4. **Add comprehensive dimensions** with proper positioning and formatting
5. **Include descriptive text** and labels for all important features
6. **Use proper coordinate system** with clear, logical positioning
7. **Add centerlines** for circular features and symmetry
8. **Include title block** with drawing information
9. **Use professional CAD standards** for line types, colors, and text sizes
10. **Ensure the code is ready to execute** without any modifications

**OUTPUT FORMAT:**
Provide ONLY the complete Python code, properly formatted and ready to execute. Do not include explanations or markdown formatting - just the raw Python code that can be directly executed.

The code should create a professional technical drawing that fully satisfies the user's requirements with proper dimensions, annotations, and CAD standards.`;
  }

  /**
   * Extract Python code from LLM response
   */
  private static extractPythonCode(response: string): string | null {
    // Try to extract code from markdown blocks
    const codeBlockMatch = response.match(/```(?:python)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // If no code blocks, check if the entire response is code
    if (response.includes('import ezdxf') && response.includes('def ') && response.includes('doc.saveas')) {
      return response.trim();
    }

    return null;
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
