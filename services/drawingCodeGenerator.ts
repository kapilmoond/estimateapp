import { LLMService } from './llmService';
import { EZDXF_TUTORIAL_CONTENT } from './ezdxfTutorialContent';

export class DrawingCodeGenerator {
  /**
   * Generate complete Python code using LLM with ezdxf tutorial context
   */
  static async generatePythonCode(
    description: string,
    isModification: boolean = false,
    previousPythonCode?: string,
    modificationRequest?: string
  ): Promise<string> {
    const basePrompt = isModification && previousPythonCode && modificationRequest
      ? this.createModificationPrompt(previousPythonCode, modificationRequest, description)
      : this.createGenerationPrompt(description);

    const safetyRider = `

CRITICAL EZDXF API CORRECTIONS - FOLLOW EXACTLY:

1. TEXT POSITIONING - NEVER use set_placement() with only align parameter:
   ❌ WRONG: text.set_placement(align=TextEntityAlignment.MIDDLE_CENTER)
   ✅ CORRECT: text.set_placement(p1=(x, y), align=TextEntityAlignment.MIDDLE_CENTER)
   ✅ BETTER: Just use 'insert' in dxfattribs and skip set_placement entirely

2. MANDATORY TEXT PATTERN - Use this exact pattern:
   text = msp.add_text("Your Text", dxfattribs={'insert': (x, y), 'height': 50, 'layer': 'TEXT'})
   # DO NOT call set_placement at all - the insert point is already set

3. DIMENSION COLORS - NEVER set color on DIMSTYLE:
   ❌ WRONG: dimstyle.dxf.color = 3  # This causes "Invalid DXF attribute" error
   ✅ CORRECT: Set color on the dimension entity itself:
   dim = msp.add_linear_dim(..., dxfattribs={'layer': 'DIMENSIONS', 'color': 3})
   ✅ OR: Create a colored layer and put dimensions on that layer

4. DIMENSION RENDERING: Always call .render() after adding any dimension

5. LAYER CREATION: Use doc.layers.new(name, dxfattribs={...})

SAFE DIMENSION COLOR EXAMPLE (copy this exactly):
# Create green dimension layer
doc.layers.new("DIMENSIONS", dxfattribs={'color': 3, 'linetype': 'SOLID'})
# Add dimension to the colored layer
dim = msp.add_linear_dim(base=(0, -100), p1=(0, 0), p2=(100, 0), dimstyle="EZDXF", dxfattribs={'layer': 'DIMENSIONS'})
dim.render()
`;

    const prompt = basePrompt + safetyRider;

    try {
      console.log('DrawingCodeGenerator: Prompt length:', prompt.length);
      console.log('DrawingCodeGenerator: Tutorial included:', prompt.includes('Chapter 1') || prompt.includes('Your Mission and the Script Generation Protocol') ? 'yes' : 'no');
      const response = await LLMService.generateContent(prompt);
      const pythonCode = this.extractPythonCodeFromResponse(response);
      return pythonCode;
    } catch (error) {
      console.error('Error generating drawing code:', error);
      // Return default code on error
      return this.getDefaultPythonCode();
    }
  }

  /**
   * Create modification prompt for existing Python code
   */
  private static createModificationPrompt(
    previousPythonCode: string,
    modificationRequest: string,
    originalDescription: string
  ): string {
    const tutorialContext = this.getComprehensiveEzdxfTutorial();
    return `🔧 MODIFICATION MODE: You are modifying existing ezdxf Python code.

**EZDXF TUTORIAL CONTEXT:**
${tutorialContext}

═══════════════════════════════════════════════════════════════════════════════
📋 MODIFICATION INSTRUCTIONS (FOLLOW EXACTLY):
═══════════════════════════════════════════════════════════════════════════════

🎯 TASK: Modify the existing Python code below based on the user's modification request.

⚠️ CRITICAL RULES:
1. START with the existing code as your base - DO NOT rewrite from scratch
2. Apply ONLY the requested changes - preserve everything else
3. Keep existing coordinates, dimensions, layers unless modification affects them
4. Maintain the same code structure and organization
5. Preserve all working elements that aren't being modified

📝 EXISTING PYTHON CODE TO MODIFY:
<<<<
${previousPythonCode}
>>>>

🔄 MODIFICATION REQUEST:
${modificationRequest}

📖 ORIGINAL DESCRIPTION (for context):
${originalDescription}

═══════════════════════════════════════════════════════════════════════════════
📤 OUTPUT REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════

Your response must contain ONLY the complete modified Python code between <<<< and >>>> markers.
- No explanations before or after the code
- No markdown formatting
- No comments about what you changed
- Just the pure, executable Python code

<<<<
[Your complete modified Python code here]
>>>>`;
  }

  private static createGenerationPrompt(description: string): string {
    const tutorialContext = this.getComprehensiveEzdxfTutorial();
    return `You are a professional CAD engineer. Generate complete Python code using ezdxf library to create the requested technical drawing.

**EZDXF TUTORIAL CONTEXT:**
${tutorialContext}

**DRAWING DESCRIPTION:**
${description}

**YOUR TASK:**
Generate complete, working Python code using ezdxf that creates the requested drawing with:
- Proper document setup and layers
- Accurate geometry with precise coordinates
- Professional dimensions with proper placement
- Appropriate text and annotations
- Proper hatching where needed
- Professional CAD standards

**CRITICAL REQUIREMENTS:**
1. Use only ezdxf library functions and methods
2. Include proper error handling
3. Save the drawing to a DXF file at the end
4. Use professional layer names and colors
5. Include proper dimension styles and text styles
6. Follow CAD best practices for line types, weights, and spacing

**OUTPUT FORMAT:**
Your response must contain ONLY the complete Python code between <<<< and >>>> markers. No explanations, no markdown formatting, just the pure Python code.

<<<<
[Your complete Python code here]
>>>>`;
  }

  /**
   * Extract Python code from LLM response
   */
  private static extractPythonCodeFromResponse(response: string): string {
    // Look for code between <<<< and >>>>
    const codeMatch = response.match(/<<<<([\s\S]*?)>>>>/);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1].trim();
    }

    // Fallback: look for python code blocks
    const pythonMatch = response.match(/```python([\s\S]*?)```/);
    if (pythonMatch && pythonMatch[1]) {
      return pythonMatch[1].trim();
    }

    // Last resort: return the whole response if it looks like Python
    if (response.includes('import ezdxf') || response.includes('ezdxf.new')) {
      return response.trim();
    }

    // If no code found, return default
    console.warn('No Python code found in LLM response, using default');
    return this.getDefaultPythonCode();
  }

  /**
   * Get comprehensive ezdxf tutorial context (inline content)
   */
 private static getComprehensiveEzdxfTutorial(): string {
    return EZDXF_TUTORIAL_CONTENT;
  }
  /**
   * Basic ezdxf context as fallback
   */
  private static getBasicEzdxfContext(): string {
    return `Basic ezdxf usage:
- import ezdxf
- doc = ezdxf.new('R2018', setup=True)
- msp = doc.modelspace()
- Add entities: msp.add_line(), msp.add_circle(), msp.add_arc(), etc.
- Create layers: doc.layers.add(name, color=7)
- Dimensions: msp.add_linear_dim(), msp.add_radial_dim()
- Save: doc.saveas('filename.dxf')`;
  }

  /**
   * Get default Python code as fallback
   */
  private static getDefaultPythonCode(): string {
    return `import ezdxf

# Create a new DXF document
doc = ezdxf.new('R2018', setup=True)
msp = doc.modelspace()

# Create layers
doc.layers.add(name='CONSTRUCTION', color=7)
doc.layers.add(name='DIMENSIONS', color=1)

# Add a simple rectangle
msp.add_lwpolyline([(0, 0), (5000, 0), (5000, 3000), (0, 3000)], close=True, dxfattribs={'layer': 'CONSTRUCTION'})

# Add dimensions
msp.add_linear_dim(base=(2500, -500), p1=(0, 0), p2=(5000, 0), dimstyle='Standard')
msp.add_linear_dim(base=(-500, 1500), p1=(0, 0), p2=(0, 3000), dimstyle='Standard')

# Save the drawing
doc.saveas('basic_drawing.dxf')`;
  }
}