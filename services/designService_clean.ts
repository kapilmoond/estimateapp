import { ComponentDesign, ChatMessage } from '../types';

// Note: The AI client initialization would typically be done differently in a real application
// This is a simplified version for demonstration purposes
const getAiClient = () => {
  // In a real implementation, this would initialize the AI client
  // For now, we'll return a mock object
  return {
    models: {
      generateContent: async (params: any) => {
        // Mock implementation
        return {
          text: "Mock AI response"
        };
      }
    }
  };
};

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
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: fullPrompt,
      });

      const designContent = response.text;
      
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
    const ai = getAiClient();
    
    const prompt = `Convert the following plain text design document into a well-formatted HTML document suitable for printing and professional presentation.

**REQUIREMENTS:**
1. Create a complete HTML document with proper structure
2. Use professional styling with CSS embedded in the document
3. Include proper headings, tables for specifications, and formatted calculations
4. Make it print-friendly with appropriate page breaks
5. Include a header with project title and date
6. Use professional fonts and spacing

**ORIGINAL DESIGN DOCUMENT:**
${design.designContent}

**OUTPUT:**
Provide only the complete HTML document, starting with <!DOCTYPE html> and ending with </html>. The document should be ready for download and printing.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
      });

      const htmlContent = response.text;
      
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
    return {
      materials: this.extractMaterials(designContent),
      dimensions: this.extractDimensions(designContent),
      calculations: this.extractCalculations(designContent)
    };
  }

  private static extractMaterials(content: string): string[] {
    // Simple extraction - in a real implementation, this would use more sophisticated parsing
    const materialKeywords = ['concrete', 'steel', 'cement', 'sand', 'aggregate', 'bricks', 'blocks'];
    const materials: string[] = [];
    
    materialKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        materials.push(keyword);
      }
    });
    
    return [...new Set(materials)]; // Remove duplicates
  }

  private static extractDimensions(content: string): Record<string, string> {
    // Simple extraction - in a real implementation, this would use regex or more sophisticated parsing
    const dimensions: Record<string, string> = {};
    
    // Look for common dimension patterns
    const lengthMatch = content.match(/length.*?(\d+\.?\d*\s*(?:mm|cm|m|ft|in))/i);
    if (lengthMatch) {
      dimensions['Length'] = lengthMatch[1];
    }
    
    const widthMatch = content.match(/width.*?(\d+\.?\d*\s*(?:mm|cm|m|ft|in))/i);
    if (widthMatch) {
      dimensions['Width'] = widthMatch[1];
    }
    
    const heightMatch = content.match(/height.*?(\d+\.?\d*\s*(?:mm|cm|m|ft|in))/i);
    if (heightMatch) {
      dimensions['Height'] = heightMatch[1];
    }
    
    return dimensions;
  }

  private static extractCalculations(content: string): string[] {
    // Simple extraction - in a real implementation, this would parse actual calculations
    const calculations: string[] = [];
    
    // Look for calculation indicators
    if (content.includes('calculation') || content.includes('formula') || content.includes('=')) {
      calculations.push('Structural calculations included in design');
    }
    
    return calculations;
  }

  private static createPromptWithReference(basePrompt: string, referenceText?: string): string {
    if (!referenceText) return basePrompt;
    
    return `${basePrompt}

**REFERENCE INFORMATION:**
Please also consider the following reference information when creating the design:
${referenceText}`;
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}