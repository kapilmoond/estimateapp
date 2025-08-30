import { ComponentDesign, ChatMessage } from '../types';
import { continueConversation } from './geminiService';

export class DesignService {
  private static readonly STORAGE_KEY = 'hsr-component-designs';

  // Retry function with exponential backoff
  private static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    baseDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('API key') ||
              error.message.includes('invalid') ||
              error.message.includes('404')) {
            throw error; // Don't retry these errors
          }
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Design Service: Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  static async generateComponentDesign(
    componentName: string,
    projectScope: string,
    userRequirements: string,
    guidelines: string,
    referenceText: string,
    isModification: boolean = false,
    previousDesign?: ComponentDesign,
    modificationRequest?: string
  ): Promise<ComponentDesign> {
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

    // Handle modification vs new design
    let prompt: string;

    if (isModification && previousDesign && modificationRequest) {
      prompt = `MODIFY the existing component design based on the modification request below.

**IMPORTANT: This is a MODIFICATION request, not a new design. You must:**
1. Take the existing design as your starting point
2. Apply ONLY the requested modifications
3. Keep all other aspects of the design unchanged unless specifically requested
4. Maintain consistency with the existing design structure and format

**EXISTING DESIGN TO MODIFY:**
Component Name: ${previousDesign.componentName}
Current Design Content:
${previousDesign.designContent}

Current Specifications:
- Materials: ${previousDesign.specifications.materials.join(', ')}
- Dimensions: ${JSON.stringify(previousDesign.specifications.dimensions)}
- Load Capacity: ${previousDesign.specifications.loadCapacity}
- Safety Factor: ${previousDesign.specifications.safetyFactor}
- Installation Method: ${previousDesign.specifications.installationMethod}
- Maintenance Requirements: ${previousDesign.specifications.maintenanceRequirements}

**MODIFICATION REQUEST:**
${modificationRequest}

**ADDITIONAL CONTEXT:**
Project Scope: ${projectScope}
Guidelines: ${guidelines}
Reference Text: ${referenceText}

**TASK:** Modify the above existing design according to the modification request. Return the COMPLETE modified design with all sections updated as needed, but keep unchanged sections exactly as they were.`;
    } else {
      prompt = `Create a detailed component design based on the following requirements.

**COMPONENT TO DESIGN:**
${userRequirements}

**PROJECT CONTEXT:**
Project Scope: ${projectScope}

**DESIGN GUIDELINES:**
${guidelines}

**REFERENCE DOCUMENTS:**
${referenceText}

${existingDesignsContext}

**IMPORTANT: Start your response with a clear heading that includes the specific component name (e.g., "# Reinforced Concrete Foundation Design" or "## Steel Beam Component Design")**

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
    }

    try {
      // Create a conversation history for the design request
      const designHistory: ChatMessage[] = [
        { role: 'user', text: prompt }
      ];

      console.log('Design Service: Generating design for component:', componentName);
      console.log('Design Service: Using prompt length:', prompt.length);
      console.log('Design Service: Reference text length:', referenceText?.length || 0);

      // Use the unified LLM service through continueConversation
      const designContent = await continueConversation(designHistory, referenceText, 'design');

      console.log('Design Service: Generated content:', designContent?.substring(0, 100) + '...');
      console.log('Design Service: Generated content length:', designContent?.length || 0);

      if (!designContent || designContent.trim().length < 50) {
        throw new Error('Generated design content is too short or empty. Please try again with more specific requirements.');
      }

      // Extract better component name from LLM response
      const extractedName = this.extractComponentNameFromContent(designContent);
      const finalComponentName = extractedName || componentName;

      console.log('Design Service: Extracted component name:', finalComponentName);

      const design: ComponentDesign = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        componentName: finalComponentName,
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
      console.error('Design Service Error:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('API request failed: 404')) {
          throw new Error('API endpoint not found. Please check your API configuration and try again.');
        } else if (error.message.includes('overloaded')) {
          throw new Error('AI service is currently overloaded. Try switching to Kimi K2 in LLM Settings or wait 30 seconds and retry.');
        } else if (error.message.includes('invalid')) {
          throw new Error('Invalid request. Please check your API key and try again.');
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
          throw new Error('API quota exceeded. Try switching to Kimi K2 in LLM Settings or check your API usage limits.');
        }
      }

      throw new Error(`Failed to generate design: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static saveDesign(design: ComponentDesign): void {
    const designs = this.loadDesigns();
    designs.push(design);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(designs));
  }

  static updateDesign(updatedDesign: ComponentDesign): void {
    const designs = this.loadDesigns();
    const index = designs.findIndex(d => d.id === updatedDesign.id);
    if (index !== -1) {
      designs[index] = updatedDesign;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(designs));
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

  static clearAllDesigns(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static updateDesign(updatedDesign: ComponentDesign): void {
    const designs = this.loadDesigns();
    const index = designs.findIndex(d => d.id === updatedDesign.id);
    if (index !== -1) {
      designs[index] = updatedDesign;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(designs));
    }
  }

  static getDesign(designId: string): ComponentDesign | null {
    const designs = this.loadDesigns();
    return designs.find(d => d.id === designId) || null;
  }

  private static extractComponentNameFromContent(content: string): string | null {
    // Try to extract component name from the LLM response content
    const patterns = [
      // Look for "Component Design for X" or "Design for X"
      /(?:component\s+design\s+for|design\s+for)\s+(?:a\s+|an\s+)?(.+?)(?:\n|\.|\s*$)/i,
      // Look for "X Component" or "X Design"
      /^(.+?)\s+(?:component|design)(?:\s|:|\n)/i,
      // Look for headings with component names
      /^#\s*(.+?)(?:\s+component|\s+design|\s*$)/im,
      // Look for "Component: X" or "Design: X"
      /(?:component|design):\s*(.+?)(?:\n|\.|\s*$)/i,
      // Look for bold text that might be component name
      /\*\*(.+?)\*\*(?:\s+component|\s+design)/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();

        // Clean up the extracted name
        name = name.replace(/^(the|a|an)\s+/i, ''); // Remove articles
        name = name.replace(/\s+/g, ' '); // Normalize spaces
        name = name.replace(/[^\w\s-]/g, ''); // Remove special chars except hyphens

        // Check if it's a meaningful name (not too short, not common words)
        if (name.length > 2 && !['component', 'design', 'structure', 'element'].includes(name.toLowerCase())) {
          return name;
        }
      }
    }

    return null;
  }

  static async editComponentDesign(
    design: ComponentDesign,
    editInstruction: string,
    projectScope: string,
    guidelines: string,
    referenceText: string
  ): Promise<ComponentDesign> {
    // Use the proper modification system
    return this.generateComponentDesign(
      design.componentName,
      projectScope,
      editInstruction, // This becomes the modification request
      guidelines,
      referenceText,
      true, // isModification = true
      design, // previousDesign
      editInstruction // modificationRequest
    );
  }
}
