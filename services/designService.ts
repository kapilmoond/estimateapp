import { ComponentDesign, ChatMessage } from '../types';
import { LLMService } from './llmService';

export class DesignService {
  private static readonly STORAGE_KEY = 'hsr-component-designs';

  static saveDesigns(designs: ComponentDesign[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(designs));
    } catch (error) {
      console.error('Failed to save designs:', error);
    }
  }

  static loadDesigns(): ComponentDesign[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const designs = JSON.parse(stored);
      return designs.map((d: any) => ({
        ...d,
        createdAt: new Date(d.createdAt)
      }));
    } catch (error) {
      console.error('Failed to load designs:', error);
      return [];
    }
  }

  static async generateComponentDesign(
    componentName: string,
    scopeContext: string,
    userInput: string,
    guidelines: string,
    referenceText?: string
  ): Promise<ComponentDesign> {
    const ai = getAiClient();
    
    const basePrompt = `You are a professional structural engineer and construction expert. Your task is to create a detailed component design for construction projects.

${guidelines}

**COMPONENT TO DESIGN:** ${componentName}

**PROJECT CONTEXT:**
${scopeContext}

**USER REQUIREMENTS:**
${userInput}

**INSTRUCTIONS:**
1. Provide a comprehensive design analysis including:
   - Structural calculations and load analysis
   - Material specifications with quantities
   - Dimensional details and tolerances
   - Construction methodology
   - Quality control measures
   - Safety considerations
   - Code compliance references (IS codes, NBC, etc.)

2. Format your response as well-structured plain text with clear headings and sections.

3. Include specific calculations with formulas and show your working.

4. Specify exact material quantities that will be used for cost estimation.

5. Consider local construction practices and material availability in India.

**OUTPUT FORMAT:**
Provide a detailed, professional design document in plain text format that can be directly used for construction and cost estimation.`;

    const fullPrompt = this.createPromptWithReference(basePrompt, referenceText);

    try {
      const designContent = await LLMService.generateContent(fullPrompt);
      
      // Extract specifications from the design content
      const specifications = this.extractSpecifications(designContent);

      const design: ComponentDesign = {
        id: this.generateId(),
        componentName,
        designContent,
        specifications,
        createdAt: new Date()
      };

      // Save to storage
      const designs = this.loadDesigns();
      designs.push(design);
      this.saveDesigns(designs);

      return design;
    } catch (error) {
      console.error('Error generating component design:', error);
      throw new Error('Failed to generate component design. Please try again.');
    }
  }

  static async generateHTMLDesign(design: ComponentDesign): Promise<string> {

    const prompt = `Convert the following plain text design document into a well-formatted HTML document suitable for printing and professional presentation.

**REQUIREMENTS:**
1. Create a complete HTML document with proper structure
2. Use professional styling with CSS embedded in the document
3. Include proper headings, tables for specifications, and formatted calculations
4. Make it print-friendly with appropriate page breaks
5. Include a header with project title and date
6. Use professional fonts and spacing
7. IMPORTANT: Provide ONLY the raw HTML content without any markdown code blocks or \`\`\`html tags

**ORIGINAL DESIGN DOCUMENT:**
${design.designContent}

**OUTPUT:**
Provide only the complete HTML document content, starting with <!DOCTYPE html> and ending with </html>. Do not wrap the output in any markdown code blocks. The document should be ready for download and printing.`;

    try {
      let htmlContent = await LLMService.generateContent(prompt);

      // Clean up any markdown code blocks that might be included
      htmlContent = htmlContent.replace(/```html\s*/g, '');
      htmlContent = htmlContent.replace(/```\s*$/g, '');
      htmlContent = htmlContent.trim();

      // Ensure it starts with DOCTYPE
      if (!htmlContent.toLowerCase().startsWith('<!doctype')) {
        htmlContent = `<!DOCTYPE html>\n${htmlContent}`;
      }

      // Update the design with HTML content
      design.htmlContent = htmlContent;
      this.updateDesign(design.id, { htmlContent });

      return htmlContent;
    } catch (error) {
      console.error('Error generating HTML design:', error);
      throw new Error('Failed to generate HTML design. Please try again.');
    }
  }

  static updateDesign(designId: string, updates: Partial<ComponentDesign>): ComponentDesign | null {
    const designs = this.loadDesigns();
    const index = designs.findIndex(d => d.id === designId);
    
    if (index === -1) return null;
    
    designs[index] = { ...designs[index], ...updates };
    this.saveDesigns(designs);
    
    return designs[index];
  }

  static deleteDesign(designId: string): boolean {
    const designs = this.loadDesigns();
    const filtered = designs.filter(d => d.id !== designId);
    
    if (filtered.length === designs.length) return false;
    
    this.saveDesigns(filtered);
    return true;
  }

  static getDesign(designId: string): ComponentDesign | null {
    const designs = this.loadDesigns();
    return designs.find(d => d.id === designId) || null;
  }

  static getAllDesigns(): ComponentDesign[] {
    return this.loadDesigns();
  }

  static downloadHTMLDesign(design: ComponentDesign): void {
    if (!design.htmlContent) {
      throw new Error('HTML content not available. Generate HTML first.');
    }

    const blob = new Blob([design.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${design.componentName.replace(/\s+/g, '_')}_Design.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private static extractSpecifications(designContent: string): ComponentDesign['specifications'] {
    // Basic extraction logic - can be enhanced with more sophisticated parsing
    const materials: string[] = [];
    const dimensions: Record<string, number> = {};
    
    // Extract materials (look for common construction materials)
    const materialKeywords = ['concrete', 'steel', 'cement', 'sand', 'aggregate', 'brick', 'rebar'];
    materialKeywords.forEach(keyword => {
      if (designContent.toLowerCase().includes(keyword)) {
        materials.push(keyword);
      }
    });

    // Extract dimensions (look for patterns like "10m", "500mm", etc.)
    const dimensionRegex = /(\d+(?:\.\d+)?)\s*(m|mm|cm|ft|in)/gi;
    const matches = designContent.match(dimensionRegex);
    if (matches) {
      matches.forEach((match, index) => {
        dimensions[`dimension_${index + 1}`] = parseFloat(match);
      });
    }

    return {
      materials: [...new Set(materials)],
      dimensions,
      calculations: designContent
    };
  }

  private static createPromptWithReference(basePrompt: string, referenceText?: string): string {
    if (referenceText && referenceText.trim()) {
      return `You have been provided with reference documents. Use this information to inform your design decisions.

REFERENCE DOCUMENTS:
---
${referenceText}
---

${basePrompt}`;
    }
    return basePrompt;
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
