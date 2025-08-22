import { LLMService } from './llmService';

export interface DrawingValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  correctedSpecification: string;
  recommendations: string[];
  originalSpecification: string;
}

export interface ValidationIssue {
  type: 'overlap' | 'missing_element' | 'dimension_error' | 'layout_issue' | 'title_block_error' | 'scale_issue' | 'annotation_error';
  severity: 'critical' | 'warning' | 'suggestion';
  description: string;
  location?: string;
  suggestion: string;
}

export class DrawingValidationService {
  
  /**
   * Validates a drawing specification and provides corrections
   */
  static async validateDrawingSpecification(
    originalSpecification: string,
    drawingTitle: string,
    componentName: string,
    userRequirements: string,
    contextInfo?: string
  ): Promise<DrawingValidationResult> {
    
    const validationPrompt = this.createValidationPrompt(
      originalSpecification,
      drawingTitle,
      componentName,
      userRequirements,
      contextInfo
    );

    try {
      const response = await LLMService.generateResponse(validationPrompt);
      return this.parseValidationResponse(response, originalSpecification);
    } catch (error) {
      console.error('Drawing validation failed:', error);
      // Return original specification if validation fails
      return {
        isValid: true,
        issues: [],
        correctedSpecification: originalSpecification,
        recommendations: ['Validation service unavailable - proceeding with original specification'],
        originalSpecification
      };
    }
  }

  /**
   * Creates a comprehensive validation prompt for the AI
   */
  private static createValidationPrompt(
    originalSpec: string,
    title: string,
    componentName: string,
    userRequirements: string,
    contextInfo?: string
  ): string {
    return `You are a professional CAD drawing validator and technical drawing expert. Your task is to analyze the following drawing specification and identify any potential issues, errors, or improvements needed before creating the actual CAD drawing.

DRAWING TITLE: ${title}
COMPONENT: ${componentName}
USER REQUIREMENTS: ${userRequirements}

${contextInfo ? `CONTEXT INFORMATION:\n${contextInfo}\n` : ''}

ORIGINAL DRAWING SPECIFICATION TO VALIDATE:
${originalSpec}

Please analyze this drawing specification thoroughly and check for the following potential issues:

1. **OVERLAPPING ELEMENTS**:
   - Are there any elements that might overlap or interfere with each other?
   - Are dimensions or annotations overlapping with drawing elements?
   - Are there conflicting spatial requirements?

2. **MISSING ELEMENTS**:
   - Are all required components mentioned in the user requirements included?
   - Are essential dimensions missing?
   - Are critical annotations or labels missing?
   - Is the title block information complete?

3. **DIMENSION ERRORS**:
   - Are dimensions placed in logical and readable positions?
   - Are dimension values realistic and consistent?
   - Are there missing critical dimensions?
   - Are dimension lines clear and not overlapping?

4. **LAYOUT ISSUES**:
   - Is the overall layout well-organized and professional?
   - Are elements properly spaced and arranged?
   - Is the drawing scale appropriate for the paper size?
   - Are views properly positioned relative to each other?

5. **TITLE BLOCK PROBLEMS**:
   - Is the title block information complete and accurate?
   - Are there any text overlaps in the title block?
   - Is the scale, date, and drawing number specified?
   - Is the title block positioned correctly?

6. **SCALE AND PROPORTION ISSUES**:
   - Is the specified scale appropriate for the drawing content?
   - Are all elements drawn to the same scale?
   - Will the drawing fit properly on the specified paper size?

7. **ANNOTATION ERRORS**:
   - Are all text annotations clear and properly positioned?
   - Are there any spelling errors or unclear descriptions?
   - Are symbols and hatching patterns used correctly?

8. **TECHNICAL ACCURACY**:
   - Are the technical details accurate and feasible?
   - Do the specifications match construction standards?
   - Are material specifications clear and complete?

Please provide your analysis in the following JSON format:

{
  "validation_summary": "Brief overall assessment",
  "issues_found": [
    {
      "type": "overlap|missing_element|dimension_error|layout_issue|title_block_error|scale_issue|annotation_error",
      "severity": "critical|warning|suggestion",
      "description": "Detailed description of the issue",
      "location": "Where the issue occurs",
      "suggestion": "How to fix this issue"
    }
  ],
  "corrected_specification": "Complete corrected and improved drawing specification with all issues resolved",
  "recommendations": [
    "Additional recommendations for improving the drawing quality"
  ],
  "is_ready_for_cad": true/false
}

Focus on creating a professional, accurate, and well-organized drawing specification that will result in a high-quality CAD drawing.`;
  }

  /**
   * Parses the AI validation response
   */
  private static parseValidationResponse(
    response: string,
    originalSpec: string
  ): DrawingValidationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      const issues: ValidationIssue[] = (parsed.issues_found || []).map((issue: any) => ({
        type: issue.type || 'annotation_error',
        severity: issue.severity || 'warning',
        description: issue.description || 'Issue description not provided',
        location: issue.location,
        suggestion: issue.suggestion || 'No suggestion provided'
      }));

      return {
        isValid: parsed.is_ready_for_cad !== false && issues.filter(i => i.severity === 'critical').length === 0,
        issues,
        correctedSpecification: parsed.corrected_specification || originalSpec,
        recommendations: parsed.recommendations || [],
        originalSpecification: originalSpec
      };

    } catch (error) {
      console.error('Failed to parse validation response:', error);
      
      // Fallback: try to extract corrected specification from text
      const correctedSpec = this.extractCorrectedSpecFromText(response, originalSpec);
      
      return {
        isValid: true,
        issues: [{
          type: 'annotation_error',
          severity: 'warning',
          description: 'Validation response could not be fully parsed',
          suggestion: 'Manual review recommended'
        }],
        correctedSpecification: correctedSpec,
        recommendations: ['Review the corrected specification manually'],
        originalSpecification: originalSpec
      };
    }
  }

  /**
   * Extracts corrected specification from text response as fallback
   */
  private static extractCorrectedSpecFromText(response: string, originalSpec: string): string {
    // Look for common patterns that indicate corrected specification
    const patterns = [
      /corrected[^:]*:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i,
      /improved[^:]*:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i,
      /final[^:]*:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i,
      /specification[^:]*:[\s\S]*?(?=\n\n|\n[A-Z]|$)/i
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match && match[0].length > originalSpec.length * 0.5) {
        return match[0].replace(/^[^:]*:\s*/, '').trim();
      }
    }

    // If no clear corrected specification found, return enhanced original
    return `${originalSpec}\n\nVALIDATION NOTES:\n${response.substring(0, 500)}...`;
  }

  /**
   * Formats validation results for display
   */
  static formatValidationResults(result: DrawingValidationResult): string {
    let formatted = `DRAWING VALIDATION RESULTS\n`;
    formatted += `Status: ${result.isValid ? '✅ READY FOR CAD' : '⚠️ ISSUES FOUND'}\n\n`;

    if (result.issues.length > 0) {
      formatted += `ISSUES IDENTIFIED:\n`;
      result.issues.forEach((issue, index) => {
        const icon = issue.severity === 'critical' ? '🔴' : 
                    issue.severity === 'warning' ? '🟡' : '🔵';
        formatted += `${index + 1}. ${icon} ${issue.type.toUpperCase()}\n`;
        formatted += `   ${issue.description}\n`;
        if (issue.location) {
          formatted += `   Location: ${issue.location}\n`;
        }
        formatted += `   Solution: ${issue.suggestion}\n\n`;
      });
    }

    if (result.recommendations.length > 0) {
      formatted += `RECOMMENDATIONS:\n`;
      result.recommendations.forEach((rec, index) => {
        formatted += `${index + 1}. ${rec}\n`;
      });
      formatted += '\n';
    }

    formatted += `CORRECTED SPECIFICATION:\n`;
    formatted += `${result.correctedSpecification}\n`;

    return formatted;
  }

  /**
   * Quick validation for common issues
   */
  static performQuickValidation(specification: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for missing title block information
    if (!specification.toLowerCase().includes('title') && !specification.toLowerCase().includes('drawing number')) {
      issues.push({
        type: 'title_block_error',
        severity: 'warning',
        description: 'Title block information may be missing',
        suggestion: 'Add title block with drawing title, number, scale, and date'
      });
    }

    // Check for scale information
    if (!specification.toLowerCase().includes('scale') && !specification.toLowerCase().includes('1:')) {
      issues.push({
        type: 'scale_issue',
        severity: 'warning',
        description: 'Drawing scale not specified',
        suggestion: 'Specify appropriate drawing scale (e.g., 1:100, 1:50)'
      });
    }

    // Check for dimension information
    if (!specification.toLowerCase().includes('dimension') && !specification.toLowerCase().includes('measure')) {
      issues.push({
        type: 'dimension_error',
        severity: 'suggestion',
        description: 'Dimension requirements not clearly specified',
        suggestion: 'Add specific dimension requirements and placement guidelines'
      });
    }

    // Check specification length (too short might be incomplete)
    if (specification.length < 200) {
      issues.push({
        type: 'missing_element',
        severity: 'warning',
        description: 'Drawing specification appears incomplete',
        suggestion: 'Provide more detailed specifications for all drawing elements'
      });
    }

    return issues;
  }
}
