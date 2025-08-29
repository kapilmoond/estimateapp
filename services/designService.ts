import { ComponentDesign } from '../types';

export class DesignService {
  private static readonly STORAGE_KEY = 'hsr-component-designs';

  static async generateComponentDesign(
    componentName: string,
    projectScope: string,
    userRequirements: string,
    guidelines: string,
    referenceText: string
  ): Promise<ComponentDesign> {
    const apiKey = localStorage.getItem('gemini-api-key');
    if (!apiKey) {
      throw new Error('Gemini API key not found. Please set your API key first.');
    }

    // Get existing designs for context
    const existingDesigns = this.loadDesigns();
    let existingDesignsContext = '';
    if (existingDesigns.length > 0) {
      existingDesignsContext = '\n\nEXISTING COMPONENT DESIGNS FOR REFERENCE:\n';
      existingDesigns.slice(-5).forEach((design, index) => {
        existingDesignsContext += `${index + 1}. ${design.componentName}:\n`;
        existingDesignsContext += `   Materials: ${design.specifications.materials.join(', ')}\n`;
        existingDesignsContext += `   Dimensions: ${JSON.stringify(design.specifications.dimensions)}\n`;
        existingDesignsContext += `   Summary: ${design.designContent.substring(0, 200)}...\n\n`;
      });
      existingDesignsContext += 'ENSURE COMPATIBILITY AND INTEGRATION WITH THESE EXISTING DESIGNS.\n';
    }

    const prompt = `Create a detailed component design for: ${componentName}

**PROJECT CONTEXT:**
Project Scope: ${projectScope}

**CURRENT REQUIREMENTS:**
${userRequirements}

**DESIGN GUIDELINES:**
${guidelines}

**REFERENCE DOCUMENTS:**
${referenceText}

${existingDesignsContext}

**DESIGN REQUIREMENTS:**
1. Provide comprehensive structural calculations and load analysis
2. Specify exact materials with quantities and specifications
3. Include detailed dimensions with tolerances
4. Consider integration with existing project components
5. Reference relevant Indian building codes (IS codes, NBC)
6. Include safety factors and construction methodology
7. Ensure compatibility with existing designs in this project
8. Provide clear, implementable design documentation

**OUTPUT FORMAT:**
Provide a comprehensive design document that includes:
- Component overview and purpose
- Structural analysis and calculations
- Material specifications with quantities
- Detailed dimensions and tolerances
- Construction methodology
- Integration notes with other components
- Code compliance references
- Safety considerations

Focus on creating a professional, implementable design that integrates seamlessly with the overall project.`;

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const designContent = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No design content generated';

      const design: ComponentDesign = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        componentName,
        designContent,
        specifications: {
          materials: ['concrete', 'steel', 'rebar'],
          dimensions: { length: 10, width: 8, height: 3 },
          calculations: 'Standard structural calculations apply'
        },
        createdAt: new Date(),
        includeInContext: true
      };

      this.saveDesign(design);
      return design;
    } catch (error) {
      throw new Error(`Failed to generate design: ${error}`);
    }
  }

  static saveDesign(design: ComponentDesign): void {
    const designs = this.loadDesigns();
    designs.push(design);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(designs));
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
      console.error('Error loading designs:', error);
      return [];
    }
  }

  static deleteDesign(designId: string): boolean {
    const designs = this.loadDesigns();
    const filtered = designs.filter(d => d.id !== designId);
    
    if (filtered.length === designs.length) return false;
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  static updateDesign(designId: string, updates: Partial<ComponentDesign>): ComponentDesign | null {
    const designs = this.loadDesigns();
    const index = designs.findIndex(d => d.id === designId);
    
    if (index === -1) return null;
    
    designs[index] = { ...designs[index], ...updates };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(designs));
    
    return designs[index];
  }

  static getDesign(designId: string): ComponentDesign | null {
    const designs = this.loadDesigns();
    return designs.find(d => d.id === designId) || null;
  }

  static clearAllDesigns(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
