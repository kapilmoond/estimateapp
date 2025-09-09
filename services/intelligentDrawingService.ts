/**
 * Intelligent Drawing Service
 * Orchestrates AutoLISP generation and Python translation for DXF creation
 */

import { AutoLispDrawingGenerator, AutoLispGenerationResult } from './autolispDrawingGenerator';
import { AutoLispToPythonTranslator, TranslationResult } from './autolispToPythonTranslator';
import { EzdxfDrawingService, DrawingResult } from './ezdxfDrawingService';
import { DrawingSettings } from './drawingSettingsService';

export interface IntelligentDrawingResult {
  success: boolean;
  autolispCode: string;
  pythonCode: string;
  drawingResult?: DrawingResult;
  error?: string;
  metadata: {
    autolispGeneration: AutoLispGenerationResult['metadata'];
    translation: TranslationResult['statistics'];
    totalTime: number;
  };
  warnings: string[];
}

export class IntelligentDrawingService {
  
  /**
   * Generate technical drawing using AutoLISP → Python → DXF pipeline
   */
  static async generateDrawing(
    userRequirements: string,
    settings: DrawingSettings,
    title: string = 'Technical Drawing',
    contextData?: {
      designs?: any[];
      previousDiscussions?: any[];
      projectContext?: string;
    }
  ): Promise<IntelligentDrawingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    console.log('🚀 Starting intelligent drawing generation...');
    console.log('📝 User requirements:', userRequirements.substring(0, 100) + '...');
    
    try {
      // Step 1: Generate AutoLISP code using LLM
      console.log('🔍 Step 1: Generating AutoLISP code...');
      const autolispResult = await AutoLispDrawingGenerator.generateAutoLispCode(
        userRequirements,
        settings,
        contextData
      );

      if (!autolispResult.success) {
        throw new Error(`AutoLISP generation failed: ${autolispResult.error}`);
      }

      console.log('✅ AutoLISP code generated successfully');
      console.log('📄 AutoLISP code length:', autolispResult.autolispCode.length);

      // Validate AutoLISP code structure
      const validation = this.validateAutolispCode(autolispResult.autolispCode);
      if (!validation.valid) {
        console.warn('⚠️ AutoLISP validation warnings:', validation.errors);
        warnings.push(...validation.errors.map(err => `AutoLISP validation: ${err}`));
      }
      
      // Step 2: Translate AutoLISP to Python ezdxf code
      console.log('🔄 Step 2: Translating AutoLISP to Python...');
      const translationResult = AutoLispToPythonTranslator.translateAutoLispToPython(
        autolispResult.autolispCode
      );
      
      if (!translationResult.success) {
        throw new Error(`AutoLISP translation failed: ${translationResult.errors.join(', ')}`);
      }
      
      // Add translation warnings to overall warnings
      warnings.push(...translationResult.warnings);
      
      console.log('✅ AutoLISP translated to Python successfully');
      console.log('📊 Translation statistics:', translationResult.statistics);
      console.log('🐍 Python code length:', translationResult.pythonCode.length);
      
      // Step 3: Execute Python code to generate DXF
      console.log('⚙️ Step 3: Executing Python code to generate DXF...');
      const drawingResult = await EzdxfDrawingService.executeDrawingCode(
        translationResult.pythonCode,
        title
      );
      
      console.log('✅ DXF file generated successfully');
      console.log('📁 DXF file size:', drawingResult.dxfContent.length, 'characters');
      
      const endTime = Date.now();
      
      return {
        success: true,
        autolispCode: autolispResult.autolispCode,
        pythonCode: translationResult.pythonCode,
        drawingResult,
        metadata: {
          autolispGeneration: autolispResult.metadata,
          translation: translationResult.statistics,
          totalTime: endTime - startTime
        },
        warnings
      };
      
    } catch (error) {
      console.error('❌ Intelligent drawing generation failed:', error);
      
      const endTime = Date.now();
      
      return {
        success: false,
        autolispCode: '',
        pythonCode: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          autolispGeneration: { promptLength: 0, responseLength: 0, generationTime: 0 },
          translation: { totalCommands: 0, translatedCommands: 0, skippedCommands: 0, errorCommands: 0 },
          totalTime: endTime - startTime
        },
        warnings
      };
    }
  }

  /**
   * Modify existing drawing using AutoLISP approach
   */
  static async modifyDrawing(
    originalAutolispCode: string,
    modificationRequest: string,
    settings: DrawingSettings,
    title: string = 'Modified Drawing',
    contextData?: {
      designs?: any[];
      previousDiscussions?: any[];
      projectContext?: string;
    }
  ): Promise<IntelligentDrawingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    console.log('🔄 Starting intelligent drawing modification...');
    console.log('📝 Modification request:', modificationRequest.substring(0, 100) + '...');
    
    try {
      // Create modification prompt with original AutoLISP code
      const modificationPrompt = this.createModificationPrompt(
        originalAutolispCode,
        modificationRequest,
        settings,
        contextData
      );
      
      // Generate modified AutoLISP code
      console.log('🔍 Generating modified AutoLISP code...');
      const autolispResult = await AutoLispDrawingGenerator.generateAutoLispCode(
        modificationPrompt,
        settings,
        contextData
      );
      
      if (!autolispResult.success) {
        throw new Error(`AutoLISP modification failed: ${autolispResult.error}`);
      }
      
      console.log('✅ Modified AutoLISP code generated successfully');
      
      // Continue with translation and execution
      const translationResult = AutoLispToPythonTranslator.translateAutoLispToPython(
        autolispResult.autolispCode
      );
      
      if (!translationResult.success) {
        throw new Error(`AutoLISP translation failed: ${translationResult.errors.join(', ')}`);
      }
      
      warnings.push(...translationResult.warnings);
      
      const drawingResult = await EzdxfDrawingService.executeDrawingCode(
        translationResult.pythonCode,
        title
      );
      
      const endTime = Date.now();
      
      return {
        success: true,
        autolispCode: autolispResult.autolispCode,
        pythonCode: translationResult.pythonCode,
        drawingResult,
        metadata: {
          autolispGeneration: autolispResult.metadata,
          translation: translationResult.statistics,
          totalTime: endTime - startTime
        },
        warnings
      };
      
    } catch (error) {
      console.error('❌ Intelligent drawing modification failed:', error);
      
      const endTime = Date.now();
      
      return {
        success: false,
        autolispCode: originalAutolispCode,
        pythonCode: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          autolispGeneration: { promptLength: 0, responseLength: 0, generationTime: 0 },
          translation: { totalCommands: 0, translatedCommands: 0, skippedCommands: 0, errorCommands: 0 },
          totalTime: endTime - startTime
        },
        warnings
      };
    }
  }

  /**
   * Create modification prompt for AutoLISP
   */
  private static createModificationPrompt(
    originalAutolispCode: string,
    modificationRequest: string,
    settings: DrawingSettings,
    contextData?: {
      designs?: any[];
      previousDiscussions?: any[];
      projectContext?: string;
    }
  ): string {
    return `MODIFY EXISTING AUTOLISP DRAWING

Original AutoLISP Code:
\`\`\`autolisp
${originalAutolispCode}
\`\`\`

Modification Request:
${modificationRequest}

Generate the complete modified AutoLISP code that incorporates the requested changes while maintaining the existing drawing structure where appropriate.`;
  }

  /**
   * Validate AutoLISP code structure
   */
  static validateAutolispCode(autolispCode: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = autolispCode.split('\n');
    
    let openParens = 0;
    let hasDrawingCommands = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith(';')) continue;
      
      // Count parentheses
      for (const char of line) {
        if (char === '(') openParens++;
        if (char === ')') openParens--;
      }
      
      // Check for drawing commands
      if (line.includes('(line ') || line.includes('(circle ') || 
          line.includes('(rectangle ') || line.includes('(arc ')) {
        hasDrawingCommands = true;
      }
    }
    
    if (openParens !== 0) {
      errors.push(`Unbalanced parentheses: ${openParens > 0 ? 'missing closing' : 'extra closing'} parentheses`);
    }
    
    if (!hasDrawingCommands) {
      errors.push('No drawing commands found in AutoLISP code');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get supported AutoLISP commands
   */
  static getSupportedCommands(): string[] {
    return [
      'line',
      'circle', 
      'arc',
      'rectangle',
      'polyline',
      'text',
      'dimension',
      'dimlinear',
      'layer',
      'color'
    ];
  }

  /**
   * Get drawing statistics from AutoLISP code
   */
  static analyzeAutolispCode(autolispCode: string): {
    totalLines: number;
    commandCount: { [command: string]: number };
    hasLayers: boolean;
    hasDimensions: boolean;
    hasText: boolean;
  } {
    const lines = autolispCode.split('\n');
    const commandCount: { [command: string]: number } = {};
    let hasLayers = false;
    let hasDimensions = false;
    let hasText = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';')) continue;
      
      // Extract command from line
      const match = trimmed.match(/\(\s*(\w+)/);
      if (match) {
        const command = match[1].toLowerCase();
        commandCount[command] = (commandCount[command] || 0) + 1;
        
        if (command === 'layer') hasLayers = true;
        if (command === 'dimension' || command === 'dimlinear') hasDimensions = true;
        if (command === 'text') hasText = true;
      }
    }
    
    return {
      totalLines: lines.filter(line => line.trim() && !line.trim().startsWith(';')).length,
      commandCount,
      hasLayers,
      hasDimensions,
      hasText
    };
  }
}
