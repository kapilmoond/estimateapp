import { LLMService } from './llmService';
import { EZDXF_TUTORIAL_CONTENT } from './ezdxfTutorialContent';
import { DrawingSettings } from './drawingSettingsService';
import { EzdxfDrawingService } from './ezdxfDrawingService';

export interface DrawingPart {
  name: string;
  description: string;
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number;
    thickness?: number;
    [key: string]: number | undefined;
  };
  position: {
    x: number;
    y: number;
    z?: number;
    rotation?: number;
  };
  material?: string;
  notes?: string;
}

export interface DrawingAnalysis {
  title: string;
  description: string;
  overallDimensions: {
    length: number;
    width: number;
    height?: number;
  };
  parts: DrawingPart[];
  views: string[];
  dimensionRequirements: string[];
  specialInstructions: string[];
}

export class TwoPhaseDrawingGenerator {
  /**
   * Phase 1: Analyze requirements and create detailed part list
   */
  static async analyzeRequirements(
    description: string,
    settings: DrawingSettings,
    isModification: boolean = false,
    previousAnalysis?: string,
    modificationRequest?: string
  ): Promise<string> {
    const prompt = isModification && previousAnalysis && modificationRequest
      ? this.createPhase1ModificationPrompt(previousAnalysis, modificationRequest, description, settings)
      : this.createPhase1AnalysisPrompt(description, settings);

    try {
      console.log('TwoPhaseDrawingGenerator: Phase 1 - Analyzing requirements');
      console.log('Phase 1 prompt length:', prompt.length);
      
      const response = await LLMService.generateContent(prompt);
      console.log('Phase 1 analysis completed, length:', response.length);
      
      return response.trim();
    } catch (error) {
      console.error('Error in Phase 1 analysis:', error);
      throw new Error(`Failed to analyze drawing requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Phase 2: Generate Python code from analysis
   */
  static async generatePythonCode(
    analysis: string,
    settings: DrawingSettings,
    isModification: boolean = false,
    previousPythonCode?: string,
    modificationRequest?: string
  ): Promise<string> {
    const prompt = isModification && previousPythonCode && modificationRequest
      ? this.createPhase2ModificationPrompt(analysis, previousPythonCode, modificationRequest, settings)
      : this.createPhase2CodePrompt(analysis, settings);

    try {
      console.log('TwoPhaseDrawingGenerator: Phase 2 - Generating Python code');
      console.log('Phase 2 prompt length:', prompt.length);

      const response = await LLMService.generateContent(prompt);
      const pythonCode = this.extractPythonCodeFromResponse(response);

      console.log('Phase 2 code generation completed, length:', pythonCode.length);
      return pythonCode;
    } catch (error) {
      console.error('Error in Phase 2 code generation:', error);
      throw new Error(`Failed to generate Python code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Python code with automatic error correction
   */
  static async generatePythonCodeWithCorrection(
    analysis: string,
    settings: DrawingSettings,
    originalPrompt: string,
    isModification: boolean = false,
    previousPythonCode?: string,
    modificationRequest?: string
  ): Promise<string> {
    try {
      // First attempt: Generate code normally
      const pythonCode = await this.generatePythonCode(
        analysis,
        settings,
        isModification,
        previousPythonCode,
        modificationRequest
      );

      // Try to execute the code to check for errors
      console.log('Testing generated Python code...');
      try {
        const result = await EzdxfDrawingService.executeDrawingCode(pythonCode, 'Test execution');
        console.log('✅ Python code executed successfully on first attempt');
        return pythonCode;
      } catch (testError: any) {
        console.log('❌ Python code test execution failed:', testError.message);
        throw testError;
      }

    } catch (executionError: any) {
      console.log('❌ Python code execution failed, attempting error correction...');
      console.log('Execution error:', executionError.message);

      // Check if this is a server error with detailed information
      if (this.isServerExecutionError(executionError)) {
        console.log('🔧 Server execution error detected, attempting automatic correction...');

        // Extract error details from the server response
        const errorDetails = this.extractErrorDetails(executionError);

        // Generate corrected code
        const correctedCode = await this.generateErrorCorrectedCode(
          analysis,
          settings,
          originalPrompt,
          pythonCode,
          errorDetails,
          isModification,
          previousPythonCode,
          modificationRequest
        );

        console.log('✅ Error correction completed, returning corrected code');
        return correctedCode;
      } else {
        // Not a server execution error, re-throw
        throw executionError;
      }
    }
  }

  /**
   * Create Phase 1 analysis prompt
   */
  private static createPhase1AnalysisPrompt(description: string, settings: DrawingSettings): string {
    const settingsContext = this.formatSettingsForPrompt(settings);
    
    return `🔍 PHASE 1: DRAWING REQUIREMENTS ANALYSIS

You are a professional CAD engineer. Your task is to analyze the drawing requirements and create a comprehensive part list and dimensional analysis.

═══════════════════════════════════════════════════════════════════════════════
📋 DRAWING REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════
${description}

═══════════════════════════════════════════════════════════════════════════════
⚙️ DEFAULT DRAWING SETTINGS:
═══════════════════════════════════════════════════════════════════════════════
${settingsContext}

**IMPORTANT:** These are default settings. If the user's requirements specify different values (colors, dimensions, text sizes, etc.), override these defaults with the user's specifications.

═══════════════════════════════════════════════════════════════════════════════
🎯 YOUR ANALYSIS TASK:
═══════════════════════════════════════════════════════════════════════════════

Analyze the requirements and provide a detailed breakdown including:

1. **OVERALL DRAWING INFORMATION**
   - Title and description
   - Overall dimensions (length, width, height if 3D)
   - Required views (front, side, top, isometric, etc.)

2. **PART LIST AND SPECIFICATIONS**
   - Break down the object into individual parts/components
   - For each part, specify:
     * Name and description
     * Exact dimensions (length, width, height, diameter, thickness, etc.)
     * Position relative to origin (x, y coordinates, rotation if needed)
     * Material or construction notes
     * Any special requirements

3. **DIMENSION REQUIREMENTS**
   - List all dimensions that need to be shown
   - Specify dimension placement and orientation
   - Note any special dimension formatting requirements

4. **SPECIAL INSTRUCTIONS**
   - Layer assignments
   - Color specifications
   - Text and annotation requirements
   - Any user-specified overrides to default settings

Provide your analysis in clear, structured text format. Be precise with measurements and positions.`;
  }

  /**
   * Create Phase 2 code generation prompt
   */
  private static createPhase2CodePrompt(analysis: string, settings: DrawingSettings): string {
    const tutorialContext = EZDXF_TUTORIAL_CONTENT;
    const settingsContext = this.formatSettingsForPrompt(settings);
    
    return `🔧 PHASE 2: PYTHON CODE GENERATION

You are a professional CAD engineer and Python developer. Generate complete ezdxf Python code based on the detailed analysis from Phase 1.

**EZDXF TUTORIAL CONTEXT:**
${tutorialContext}

═══════════════════════════════════════════════════════════════════════════════
📋 PHASE 1 ANALYSIS (YOUR BLUEPRINT):
═══════════════════════════════════════════════════════════════════════════════
${analysis}

═══════════════════════════════════════════════════════════════════════════════
⚙️ DEFAULT DRAWING SETTINGS:
═══════════════════════════════════════════════════════════════════════════════
${settingsContext}

**IMPORTANT:** Use these settings unless the Phase 1 analysis specifies different values.

═══════════════════════════════════════════════════════════════════════════════
🎯 CODE GENERATION REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════

Generate complete Python code that implements EXACTLY what was specified in the Phase 1 analysis:

1. **FOLLOW THE ANALYSIS PRECISELY**
   - Implement every part with exact dimensions and positions
   - Create all specified views
   - Add all required dimensions with proper placement
   - Include all annotations and text

2. **DIMENSION TEXT VISIBILITY**
   - Ensure all dimension text is properly sized and visible
   - Use appropriate text height from settings
   - Place dimension lines with adequate spacing
   - Always call .render() after adding dimensions

3. **PROFESSIONAL STANDARDS**
   - Use proper layer organization
   - Apply correct colors and line types
   - Follow CAD best practices for spacing and layout
   - Include proper error handling

**CRITICAL API REQUIREMENTS:**
- For TEXT: Use 'insert' in dxfattribs, avoid set_placement() errors
- For DIMENSIONS: Set colors on layers, not dimstyles; always call .render()
- For LAYERS: Use doc.layers.new(name, dxfattribs={...})

**DIMENSION TEXT VISIBILITY - MANDATORY REQUIREMENTS:**
🚨 CRITICAL: Dimension text MUST be visible. Follow this EXACT pattern:

STEP 1: Create custom dimension style with LARGE visible text
if "VISIBLE_DIM" not in doc.dimstyles:
    dimstyle = doc.dimstyles.new("VISIBLE_DIM")
    dimstyle.dxf.dimtxt = 200.0    # Large text height (200mm)
    dimstyle.dxf.dimasz = 100.0    # Large arrow size (100mm)
    dimstyle.dxf.dimclrd = 1       # Red dimension lines
    dimstyle.dxf.dimclrt = 1       # Red text color
    dimstyle.dxf.dimtad = 1        # Text above dimension line
    dimstyle.dxf.dimgap = 50.0     # Gap between text and line

STEP 2: Use VISIBLE_DIM style for ALL dimensions
dim = msp.add_linear_dim(base=(x, y), p1=(x1, y1), p2=(x2, y2), dimstyle="VISIBLE_DIM", dxfattribs={'layer': 'DIMENSIONS'})
dim.render()  # ALWAYS call render()

🚨 NEVER use "EZDXF" dimstyle - it has tiny invisible text!
🚨 ALWAYS use "VISIBLE_DIM" custom style for ALL dimensions!
🚨 Text height MUST be 200.0 or larger for visibility!

**OUTPUT FORMAT:**
Your response must contain ONLY the complete Python code between <<<< and >>>> markers.

<<<<
[Your complete Python code here]
>>>>`;
  }

  /**
   * Format drawing settings for prompt context
   */
  private static formatSettingsForPrompt(settings: DrawingSettings): string {
    return `Document Format: ${settings.documentFormat}
Units: ${settings.units}
Scale: ${settings.scale}

LAYERS:
- Construction: ${settings.layers.construction.name} (Color: ${settings.layers.construction.color})
- Dimensions: ${settings.layers.dimensions.name} (Color: ${settings.layers.dimensions.color})
- Text: ${settings.layers.text.name} (Color: ${settings.layers.text.color})
- Hatching: ${settings.layers.hatching.name} (Color: ${settings.layers.hatching.color})

DIMENSIONS:
- Text Height: ${settings.dimensions.textHeight}mm
- Arrow Size: ${settings.dimensions.arrowSize}mm
- Decimal Places: ${settings.dimensions.decimalPlaces}
- Show Units: ${settings.dimensions.showUnits}

TEXT:
- Default Height: ${settings.text.defaultHeight}mm
- Font: ${settings.text.fontName}

LINES:
- Default Weight: ${settings.lines.defaultWeight}
- Default Type: ${settings.lines.defaultLineType}`;
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

    // Check if response starts with <<<< (common LLM behavior)
    if (response.trim().startsWith('<<<<')) {
      // Find the end marker
      const endIndex = response.indexOf('>>>>');
      if (endIndex !== -1) {
        // Extract content between markers
        const code = response.substring(4, endIndex).trim();
        if (code) {
          return code;
        }
      } else {
        // No end marker found, remove the start marker and return the rest
        const code = response.substring(4).trim();
        if (code && (code.includes('import ezdxf') || code.includes('ezdxf.new'))) {
          return code;
        }
      }
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

    // If no code found, throw error
    throw new Error('No valid Python code found in LLM response');
  }

  /**
   * Check if error is a server execution error that can be corrected
   */
  private static isServerExecutionError(error: any): boolean {
    const errorMessage = error.message || '';
    return errorMessage.includes('Local server error') ||
           errorMessage.includes('Syntax error in generated Python code') ||
           errorMessage.includes('Runtime error during code execution') ||
           errorMessage.includes('Python execution error') ||
           errorMessage.includes('Failed to execute drawing code') ||
           errorMessage.includes('Cannot connect to local ezdxf server');
  }

  /**
   * Extract detailed error information from server error
   */
  private static extractErrorDetails(error: any): {
    errorType: string;
    errorMessage: string;
    executionLog?: string;
    codePreview?: string;
    traceback?: string;
    lineNumber?: number;
  } {
    const errorMessage = error.message || '';

    // Parse different types of server errors
    if (errorMessage.includes('Syntax error in generated Python code')) {
      const syntaxMatch = errorMessage.match(/Syntax error in generated Python code: (.+?)(?:\.|$)/);
      const lineMatch = errorMessage.match(/line (\d+)/);

      return {
        errorType: 'syntax',
        errorMessage: syntaxMatch ? syntaxMatch[1] : 'Syntax error',
        lineNumber: lineMatch ? parseInt(lineMatch[1]) : undefined,
        executionLog: this.extractFromError(errorMessage, 'execution_log'),
        codePreview: this.extractFromError(errorMessage, 'code_preview'),
        traceback: this.extractFromError(errorMessage, 'traceback')
      };
    } else if (errorMessage.includes('Runtime error during code execution')) {
      return {
        errorType: 'runtime',
        errorMessage: errorMessage.replace('Local server error: 400 BAD REQUEST. Details: ', ''),
        executionLog: this.extractFromError(errorMessage, 'execution_log'),
        traceback: this.extractFromError(errorMessage, 'traceback')
      };
    } else {
      return {
        errorType: 'unknown',
        errorMessage: errorMessage
      };
    }
  }

  /**
   * Helper to extract specific fields from error message
   */
  private static extractFromError(errorMessage: string, field: string): string | undefined {
    try {
      // Try to parse as JSON if it looks like server response
      const jsonMatch = errorMessage.match(/\{.*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed[field];
      }
    } catch (e) {
      // Not JSON, continue with regex extraction
    }

    const regex = new RegExp(`${field}['":]\\s*['"]([^'"]+)['"]`, 'i');
    const match = errorMessage.match(regex);
    return match ? match[1] : undefined;
  }

  /**
   * Create Phase 1 modification prompt
   */
  private static createPhase1ModificationPrompt(
    previousAnalysis: string,
    modificationRequest: string,
    originalDescription: string,
    settings: DrawingSettings
  ): string {
    const settingsContext = this.formatSettingsForPrompt(settings);
    
    return `🔍 PHASE 1: MODIFY DRAWING ANALYSIS

You are a professional CAD engineer. Modify the existing drawing analysis based on the modification request.

═══════════════════════════════════════════════════════════════════════════════
📋 EXISTING ANALYSIS TO MODIFY:
═══════════════════════════════════════════════════════════════════════════════
${previousAnalysis}

═══════════════════════════════════════════════════════════════════════════════
🔄 MODIFICATION REQUEST:
═══════════════════════════════════════════════════════════════════════════════
${modificationRequest}

═══════════════════════════════════════════════════════════════════════════════
📖 ORIGINAL DESCRIPTION (for context):
═══════════════════════════════════════════════════════════════════════════════
${originalDescription}

═══════════════════════════════════════════════════════════════════════════════
⚙️ DEFAULT DRAWING SETTINGS:
═══════════════════════════════════════════════════════════════════════════════
${settingsContext}

═══════════════════════════════════════════════════════════════════════════════
🎯 MODIFICATION TASK:
═══════════════════════════════════════════════════════════════════════════════

Update the analysis to incorporate the requested modifications while preserving all unchanged elements.

Provide the complete updated analysis in the same structured format.`;
  }

  /**
   * Create Phase 2 modification prompt
   */
  private static createPhase2ModificationPrompt(
    analysis: string,
    previousPythonCode: string,
    modificationRequest: string,
    settings: DrawingSettings
  ): string {
    const tutorialContext = EZDXF_TUTORIAL_CONTENT;
    const settingsContext = this.formatSettingsForPrompt(settings);
    
    return `🔧 PHASE 2: MODIFY PYTHON CODE

You are a professional CAD engineer. Modify the existing Python code based on the updated analysis.

**EZDXF TUTORIAL CONTEXT:**
${tutorialContext}

═══════════════════════════════════════════════════════════════════════════════
📋 UPDATED ANALYSIS (YOUR NEW BLUEPRINT):
═══════════════════════════════════════════════════════════════════════════════
${analysis}

═══════════════════════════════════════════════════════════════════════════════
📝 EXISTING PYTHON CODE TO MODIFY:
═══════════════════════════════════════════════════════════════════════════════
<<<<
${previousPythonCode}
>>>>

═══════════════════════════════════════════════════════════════════════════════
🔄 MODIFICATION REQUEST:
═══════════════════════════════════════════════════════════════════════════════
${modificationRequest}

═══════════════════════════════════════════════════════════════════════════════
⚙️ DEFAULT DRAWING SETTINGS:
═══════════════════════════════════════════════════════════════════════════════
${settingsContext}

═══════════════════════════════════════════════════════════════════════════════
🎯 MODIFICATION REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════

Modify the Python code to implement the updated analysis while preserving unchanged elements.

**OUTPUT FORMAT:**
Your response must contain ONLY the complete modified Python code between <<<< and >>>> markers.

<<<<
[Your complete modified Python code here]
>>>>`;
  }

  /**
   * Generate error-corrected Python code
   */
  private static async generateErrorCorrectedCode(
    analysis: string,
    settings: DrawingSettings,
    originalPrompt: string,
    failedCode: string,
    errorDetails: any,
    isModification: boolean = false,
    previousPythonCode?: string,
    modificationRequest?: string
  ): Promise<string> {
    const tutorialContext = EZDXF_TUTORIAL_CONTENT;
    const settingsContext = this.formatSettingsForPrompt(settings);

    const errorCorrectionPrompt = `🔧 PYTHON CODE ERROR CORRECTION

You are a professional CAD engineer. The Python code you generated has execution errors and needs to be corrected.

**EZDXF TUTORIAL CONTEXT:**
${tutorialContext}

═══════════════════════════════════════════════════════════════════════════════
📋 ORIGINAL ANALYSIS (YOUR BLUEPRINT):
═══════════════════════════════════════════════════════════════════════════════
${analysis}

═══════════════════════════════════════════════════════════════════════════════
📝 ORIGINAL PROMPT THAT WAS SENT:
═══════════════════════════════════════════════════════════════════════════════
${originalPrompt}

═══════════════════════════════════════════════════════════════════════════════
❌ FAILED PYTHON CODE:
═══════════════════════════════════════════════════════════════════════════════
<<<<
${failedCode}
>>>>

═══════════════════════════════════════════════════════════════════════════════
🚨 ERROR DETAILS:
═══════════════════════════════════════════════════════════════════════════════
**Error Type:** ${errorDetails.errorType}
**Error Message:** ${errorDetails.errorMessage}
${errorDetails.lineNumber ? `**Line Number:** ${errorDetails.lineNumber}` : ''}
${errorDetails.executionLog ? `**Execution Log:** ${errorDetails.executionLog}` : ''}
${errorDetails.traceback ? `**Traceback:** ${errorDetails.traceback}` : ''}

═══════════════════════════════════════════════════════════════════════════════
⚙️ DRAWING SETTINGS:
═══════════════════════════════════════════════════════════════════════════════
${settingsContext}

═══════════════════════════════════════════════════════════════════════════════
🎯 ERROR CORRECTION REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════

**CRITICAL FIXES NEEDED:**
1. **Fix the specific error:** ${errorDetails.errorMessage}
2. **Maintain original functionality:** Keep all intended drawing features
3. **Follow ezdxf best practices:** Use proper syntax and methods
4. **Ensure completeness:** Include all necessary imports and setup

**COMMON ERROR FIXES:**
- **Syntax Errors:** Check parentheses, brackets, quotes, indentation
- **Missing Imports:** Ensure all required modules are imported
- **Undefined Variables:** Check variable names and scope
- **Method Calls:** Verify correct ezdxf method signatures
- **Dimension Issues:** Use proper dimension creation and rendering

**OUTPUT FORMAT:**
Your response must contain ONLY the corrected Python code between <<<< and >>>> markers.

<<<<
[Your complete corrected Python code here]
>>>>`;

    try {
      console.log('🔧 Generating error-corrected Python code...');
      console.log('Error correction prompt length:', errorCorrectionPrompt.length);

      const response = await LLMService.generateContent(errorCorrectionPrompt);
      const correctedCode = this.extractPythonCodeFromResponse(response);

      console.log('✅ Error-corrected code generated, length:', correctedCode.length);

      // Test the corrected code (but don't retry correction if it fails again)
      try {
        console.log('🧪 Testing corrected Python code...');
        const testResult = await EzdxfDrawingService.executeDrawingCode(correctedCode, 'Error correction test');
        console.log('✅ Corrected code executed successfully!');
      } catch (testError: any) {
        console.log('⚠️ Corrected code still has issues, but returning it anyway (no infinite retry)');
        console.log('Test error:', testError.message || testError);
        // Don't throw here - return the corrected code anyway to avoid infinite loops
      }

      return correctedCode;
    } catch (error) {
      console.error('Error in error correction:', error);
      throw new Error(`Failed to generate error-corrected code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
