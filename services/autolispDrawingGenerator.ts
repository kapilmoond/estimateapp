/**
 * AutoLISP Drawing Generator
 * Generates AutoLISP code from user requirements using LLM
 */

import { LLMService } from './llmService';
import { DrawingSettings } from './drawingSettingsService';

export interface AutoLispGenerationResult {
  autolispCode: string;
  success: boolean;
  error?: string;
  metadata: {
    promptLength: number;
    responseLength: number;
    generationTime: number;
  };
}

export class AutoLispDrawingGenerator {
  
  /**
   * Generate AutoLISP code from user requirements
   */
  static async generateAutoLispCode(
    userRequirements: string,
    settings: DrawingSettings,
    contextData?: {
      designs?: any[];
      previousDiscussions?: any[];
      projectContext?: string;
    }
  ): Promise<AutoLispGenerationResult> {
    const startTime = Date.now();
    
    try {
      const prompt = this.createAutoLispPrompt(userRequirements, settings, contextData);
      
      console.log('🔍 Generating AutoLISP code from requirements...');
      console.log('Prompt length:', prompt.length);
      
      const response = await LLMService.generateContent(prompt);
      const autolispCode = this.extractAutoLispCode(response);
      
      const endTime = Date.now();
      
      console.log('✅ AutoLISP code generated successfully');
      console.log('Response length:', response.length);
      console.log('AutoLISP code length:', autolispCode.length);
      
      return {
        autolispCode,
        success: true,
        metadata: {
          promptLength: prompt.length,
          responseLength: response.length,
          generationTime: endTime - startTime
        }
      };
      
    } catch (error) {
      console.error('❌ AutoLISP generation failed:', error);
      
      return {
        autolispCode: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          promptLength: 0,
          responseLength: 0,
          generationTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Create comprehensive AutoLISP generation prompt
   */
  private static createAutoLispPrompt(
    userRequirements: string,
    settings: DrawingSettings,
    contextData?: {
      designs?: any[];
      previousDiscussions?: any[];
      projectContext?: string;
    }
  ): string {
    const settingsContext = this.formatSettingsForPrompt(settings);
    const contextSection = this.formatContextData(contextData);
    
    return `🎯 AUTOLISP TECHNICAL DRAWING GENERATION

You are a professional CAD engineer and AutoLISP expert. Generate AutoLISP code to create a technical drawing based on the user requirements.

═══════════════════════════════════════════════════════════════════════════════
📋 USER REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════
${userRequirements}

═══════════════════════════════════════════════════════════════════════════════
⚙️ DRAWING SETTINGS:
═══════════════════════════════════════════════════════════════════════════════
${settingsContext}

${contextSection}

═══════════════════════════════════════════════════════════════════════════════
🔧 AUTOLISP COMMANDS REFERENCE:
═══════════════════════════════════════════════════════════════════════════════

**BASIC DRAWING COMMANDS:**
- (line x1 y1 x2 y2) - Draw line from point 1 to point 2
- (circle x y radius) - Draw circle at center (x,y) with radius
- (arc x y radius start_angle end_angle) - Draw arc (angles in degrees)
- (rectangle x1 y1 x2 y2) - Draw rectangle from corner to corner
- (polyline x1 y1 x2 y2 x3 y3 ...) - Draw connected lines through points
- (lwpolyline x1 y1 x2 y2 x3 y3 ...) - Draw lightweight polyline

**TEXT AND ANNOTATIONS:**
- (text x y height "text_string") - Add text at position
- (mtext x y width height "text_string") - Add multiline text
- (dimension x1 y1 x2 y2 dim_x dim_y) - Linear dimension between two points
- (dimlinear x1 y1 x2 y2 dim_x dim_y "text") - Linear dimension with custom text

**LAYERS AND PROPERTIES:**
- (layer "layer_name") - Set current layer
- (color color_number) - Set current color (1=red, 2=yellow, 3=green, 5=blue, 7=black)
- (linetype "linetype_name") - Set line type (CONTINUOUS, DASHED, CENTER, etc.)

**ADVANCED COMMANDS:**
- (hatch "pattern_name" x y) - Add hatch pattern at point
- (block "block_name" x y) - Insert block at position
- (spline x1 y1 x2 y2 x3 y3 ...) - Draw smooth curve through points

**COORDINATE SYSTEM:**
- Origin (0,0) at bottom-left
- X-axis increases to the right
- Y-axis increases upward
- All measurements in millimeters

═══════════════════════════════════════════════════════════════════════════════
🎯 GENERATION REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════

1. **ANALYZE THE REQUIREMENTS**
   - Understand what needs to be drawn
   - Identify all components and their relationships
   - Plan the drawing layout and scale

2. **GENERATE CLEAN AUTOLISP CODE**
   - Use only the supported commands listed above
   - Provide exact coordinates and dimensions
   - Include proper layering and organization
   - Add comprehensive dimensions and annotations

3. **FOLLOW TECHNICAL DRAWING STANDARDS**
   - Use appropriate line types and weights
   - Include all necessary dimensions
   - Add clear text labels and annotations
   - Organize elements on appropriate layers

4. **ENSURE VISIBILITY AND CLARITY**
   - Use large text heights for visibility (minimum 200mm)
   - Choose contrasting colors for different elements
   - Space dimensions appropriately
   - Avoid overlapping elements

5. **CODE STRUCTURE**
   - Start with layer setup
   - Draw main geometry first
   - Add dimensions and annotations
   - Use comments to explain complex sections

═══════════════════════════════════════════════════════════════════════════════
📝 CRITICAL OUTPUT REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════

**MANDATORY FORMAT:**
1. Provide ONLY AutoLISP code wrapped in \`\`\`autolisp code blocks
2. No explanations, descriptions, or additional text outside code blocks
3. Use exact syntax as specified in commands reference
4. Include semicolon comments for clarity
5. Ensure all coordinates are numeric (no variables)

**PROFESSIONAL EXAMPLE:**
\`\`\`autolisp
; Foundation plan - 12m x 8m building
; Setup layers and properties
(layer "CONSTRUCTION")
(color 1)
(linetype "CONTINUOUS")

; Main foundation outline
(rectangle 0 0 12000 8000)

; Internal walls
(line 6000 0 6000 8000)
(line 0 4000 12000 4000)

; Foundation footings at corners
(rectangle -500 -500 500 500)
(rectangle 11500 -500 12500 500)
(rectangle 11500 7500 12500 8500)
(rectangle -500 7500 500 8500)

; Switch to dimensions layer
(layer "DIMENSIONS")
(color 5)

; Add dimensions
(dimension 0 0 12000 0 6000 -1000)
(dimension 0 0 0 8000 -1000 4000)
(text 6000 -1500 300 "12000mm")
(text -1500 4000 300 "8000mm")

; Add labels
(layer "TEXT")
(color 7)
(text 6000 4000 400 "FOUNDATION PLAN")
(text 1000 1000 200 "FOOTING")
\`\`\`

**VALIDATION CHECKLIST:**
✓ All coordinates are numbers (not variables)
✓ Text strings are in quotes
✓ Layer names are in quotes
✓ Commands use exact syntax from reference
✓ Dimensions are properly positioned
✓ Text is large enough (minimum 200mm height)
✓ Colors are appropriate (1=red, 5=blue, 7=black)

Generate the complete AutoLISP code now:`;
  }

  /**
   * Format drawing settings for prompt
   */
  private static formatSettingsForPrompt(settings: DrawingSettings): string {
    return `Default Scale: ${settings.scale}
Default Text Height: ${settings.textHeight}mm
Default Dimension Text Height: ${settings.dimensionTextHeight}mm
Default Line Color: ${settings.lineColor}
Default Text Color: ${settings.textColor}
Default Dimension Color: ${settings.dimensionColor}
Paper Size: ${settings.paperSize}
Units: ${settings.units}`;
  }

  /**
   * Format context data for prompt
   */
  private static formatContextData(contextData?: {
    designs?: any[];
    previousDiscussions?: any[];
    projectContext?: string;
  }): string {
    if (!contextData) return '';

    let contextSection = '';

    if (contextData.projectContext) {
      contextSection += `═══════════════════════════════════════════════════════════════════════════════
🏗️ PROJECT CONTEXT:
═══════════════════════════════════════════════════════════════════════════════
${contextData.projectContext}

`;
    }

    if (contextData.designs && contextData.designs.length > 0) {
      contextSection += `═══════════════════════════════════════════════════════════════════════════════
🎨 RELATED DESIGNS:
═══════════════════════════════════════════════════════════════════════════════
`;
      contextData.designs.forEach((design, index) => {
        contextSection += `Design ${index + 1}: ${design.title || 'Untitled'}
${design.content || design.description || ''}

`;
      });
    }

    if (contextData.previousDiscussions && contextData.previousDiscussions.length > 0) {
      contextSection += `═══════════════════════════════════════════════════════════════════════════════
💬 PREVIOUS DISCUSSIONS:
═══════════════════════════════════════════════════════════════════════════════
`;
      contextData.previousDiscussions.slice(-3).forEach((discussion, index) => {
        contextSection += `Discussion ${index + 1}:
${discussion.content || discussion.message || ''}

`;
      });
    }

    return contextSection;
  }

  /**
   * Extract AutoLISP code from LLM response
   */
  private static extractAutoLispCode(response: string): string {
    // Look for code blocks with autolisp, lisp, or no language specified
    const codeBlockRegex = /```(?:autolisp|lisp)?\s*\n([\s\S]*?)\n```/gi;
    const matches = response.match(codeBlockRegex);
    
    if (matches && matches.length > 0) {
      // Extract the code from the first code block
      const codeBlock = matches[0];
      const code = codeBlock.replace(/```(?:autolisp|lisp)?\s*\n?/gi, '').replace(/\n?```/g, '');
      return code.trim();
    }
    
    // If no code blocks found, try to extract AutoLISP-like content
    const lines = response.split('\n');
    const autolispLines: string[] = [];
    let inCodeSection = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Start of AutoLISP code (lines starting with parentheses or semicolon)
      if (trimmed.startsWith('(') || trimmed.startsWith(';')) {
        inCodeSection = true;
      }
      
      if (inCodeSection) {
        // Stop if we hit explanatory text
        if (trimmed && !trimmed.startsWith('(') && !trimmed.startsWith(';') && 
            !trimmed.match(/^\s*[)]/)) {
          break;
        }
        autolispLines.push(line);
      }
    }
    
    if (autolispLines.length > 0) {
      return autolispLines.join('\n').trim();
    }
    
    // Fallback: return the entire response if no clear code structure found
    console.warn('Could not extract AutoLISP code blocks, returning full response');
    return response.trim();
  }
}
