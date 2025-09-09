import { LLMService } from './llmService';

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
    const prompt = isModification && previousPythonCode && modificationRequest
      ? await this.createModificationPrompt(previousPythonCode, modificationRequest, description)
      : await this.createGenerationPrompt(description);

    try {
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
  private static async createModificationPrompt(
    previousPythonCode: string,
    modificationRequest: string,
    originalDescription: string
  ): Promise<string> {
    const tutorialContext = await this.getEzdxfTutorialContext();
    return `You are a professional CAD engineer. MODIFY the existing Python ezdxf code based on the modification request.

**EZDXF TUTORIAL CONTEXT:**
${tutorialContext}

**IMPORTANT: This is a MODIFICATION request, not a new drawing. You must:**
1. Take the existing Python code as your starting point
2. Apply ONLY the requested modifications
3. Keep all other elements unchanged unless specifically requested
4. Maintain proper ezdxf syntax and structure
5. Preserve existing coordinates, dimensions, and properties unless modification affects them

**EXISTING PYTHON CODE TO MODIFY:**
<<<<
${previousPythonCode}
>>>>

**MODIFICATION REQUEST:**
${modificationRequest}

**ORIGINAL DESCRIPTION:**
${originalDescription}

**TASK:** Provide the complete modified Python code that implements the requested changes.

**CRITICAL:** Your response must contain the complete Python code between <<<< and >>>> markers. No explanations, no markdown formatting, just the pure Python code.

<<<<
[Your complete Python code here]
>>>>`;
  }

  private static async createGenerationPrompt(description: string): Promise<string> {
    const tutorialContext = await this.getEzdxfTutorialContext();
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
   * Load ezdxf tutorial context from file
   */
  private static async getEzdxfTutorialContext(): Promise<string> {
    try {
      const response = await fetch('/ezdxf_tutorial_bundle.txt');
      if (response.ok) {
        const content = await response.text();
        return content;
      } else {
        console.warn('Could not load ezdxf tutorial bundle, using basic context');
        return this.getBasicEzdxfContext();
      }
    } catch (error) {
      console.error('Error loading ezdxf tutorial context:', error);
      return this.getBasicEzdxfContext();
    }
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