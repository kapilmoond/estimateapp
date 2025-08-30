import { ChatMessage, ComponentDesign, TechnicalDrawing } from '../types';
import { LLMService } from './llmService';
import { DesignService } from './designService';
import { DXFStorageService } from './dxfService';

export interface MasterTemplate {
  id: string;
  name: string;
  description: string;
  projectType: string;
  stepByStepProcedure: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  tags: string[];
  estimateData?: {
    scope: string;
    keywords: string[];
    hsrItems: any[];
    finalEstimate: string;
  };
  designData?: ComponentDesign[];
  drawingData?: TechnicalDrawing[];
}

export class TemplateService {
  private static readonly STORAGE_KEY = 'hsr-master-templates';

  static async createMasterTemplate(
    templateName: string,
    templateDescription: string,
    projectType: string,
    conversationHistory: ChatMessage[],
    finalizedScope: string,
    keywords: string[],
    hsrItems: any[],
    finalEstimate: string,
    designs: ComponentDesign[],
    drawings: TechnicalDrawing[],
    referenceText: string
  ): Promise<MasterTemplate> {
    
    // Gather all project knowledge
    const conversationText = conversationHistory
      .map(msg => `${msg.role.toUpperCase()}: ${msg.text}`)
      .join('\n\n');

    const designsText = designs.length > 0 
      ? designs.map(d => `**${d.componentName}:**\n${d.designContent}\nMaterials: ${d.specifications.materials.join(', ')}\nDimensions: ${JSON.stringify(d.specifications.dimensions)}`).join('\n\n')
      : 'No component designs available.';

    const drawingsText = drawings.length > 0
      ? drawings.map(d => `**${d.title}:**\n${d.description}\nFile: ${d.dxfFilename}`).join('\n\n')
      : 'No technical drawings available.';

    const templatePrompt = `Create a highly detailed master template based ONLY on what was actually accomplished in this construction estimation project. Include complete design and drawing creation processes with exact step-by-step procedures.

**PROJECT INFORMATION:**
Template Name: ${templateName}
Description: ${templateDescription}
Project Type: ${projectType}

**ACTUAL PROJECT PROGRESS:**
${this.analyzeActualProgress(conversationHistory, finalizedScope, designs, drawings, finalEstimate)}

**COMPLETE DESIGN CREATION PROCESS:**
${this.extractDesignProcess(designs, conversationHistory)}

**COMPLETE DRAWING CREATION PROCESS:**
${this.extractDrawingProcess(drawings, conversationHistory)}

**DETAILED CONVERSATION WORKFLOW:**
${this.extractDetailedWorkflow(conversationHistory)}

**EXACT COMPONENTS CREATED:**
${this.getDetailedComponents(finalizedScope, keywords, hsrItems, designs, drawings, finalEstimate)}

**REFERENCE MATERIALS USED:**
${referenceText ? 'Reference documents were consulted and should be included in similar projects' : 'No reference documents were used in this project'}

**CRITICAL TEMPLATE CREATION INSTRUCTIONS:**
Create an extremely detailed, step-by-step master template that captures EVERY aspect of what was actually accomplished in this project. This template will be used by AI to guide users through identical procedures for similar projects.

**REQUIRED TEMPLATE CONTENT:**
1. **Exact Conversation Flow**: Document the precise sequence of user inputs and AI responses that led to success
2. **Complete Design Process**: Include every step of component design creation, from initial request to final specifications
3. **Full Drawing Workflow**: Document the entire technical drawing creation process, including all parameters and requirements
4. **Detailed Decision Points**: Specify exactly what decisions were made and when during the project
5. **Specific Calculation Methods**: Include the exact formulas, standards, and calculation approaches that were used
6. **Material Specifications**: Document all materials, dimensions, and technical specifications that were determined
7. **Quality Checkpoints**: Include all validation steps and quality control measures that were applied

**TEMPLATE MUST INCLUDE:**
- Complete design creation procedures with exact prompts and specifications
- Full drawing generation workflow with technical requirements
- Specific material lists and calculation methods used
- Exact sequence of steps from start to finish
- All decision points with the actual choices made
- Quality validation procedures that were applied
- Integration points between different project phases

**TEMPLATE STRUCTURE REQUIREMENTS:**
- Very detailed step-by-step procedures (not general guidelines)
- Complete design creation workflow with exact prompts and specifications
- Full drawing generation process with technical requirements and standards
- Specific material lists, calculations, and technical specifications used
- Exact conversation flow and decision points that led to success
- Clear integration between discussion, design, and drawing phases
- Complete workflow from initial discussion to final deliverables
- All context and reference materials that should be included in future projects

**CRITICAL: INCLUDE COMPLETE DESIGN AND DRAWING CONTEXT:**
- Document the EXACT design creation process used in this project
- Include ALL material specifications, dimensions, and calculations from designs
- Document the COMPLETE drawing generation workflow and technical standards
- Include ALL design and drawing content as examples for future projects
- Specify how designs and drawings should be integrated into the estimation process
- Document the EXACT sequence of design → drawing → estimation workflow

**ABSOLUTELY DO NOT INCLUDE:**
- Any steps that weren't actually performed in this project
- Theoretical procedures not used here
- Generic best practices not applied
- Extra features or capabilities not demonstrated
- Hypothetical scenarios not encountered

**OUTPUT FORMAT:**
Create a detailed master template with the following structure:

# MASTER TEMPLATE: [Template Name]

## Template Overview
- Project Type: [Type]
- Scope: [General scope description]
- Typical Applications: [When to use this template]

## Step-by-Step Estimation Procedure

### Phase 1: Project Scoping
[Detailed steps for project scoping with decision points]

### Phase 2: Requirements Analysis
[Steps for analyzing requirements with customization points]

### Phase 3: Component Design
[Design approach and standard specifications]

### Phase 4: Technical Drawings
[Drawing requirements and standards]

### Phase 5: Cost Estimation
[Calculation methods and HSR item selection]

### Phase 6: Quality Review
[Validation and review procedures]

## Standard Specifications
[Common materials, dimensions, and technical standards]

## Calculation Methods
[Formulas and calculation approaches]

## Customization Guidelines
[How to adapt template for project variations]

## Quality Checkpoints
[Validation steps and quality control measures]

## Common Variations
[Typical project variations and how to handle them]

Focus on creating a reusable, comprehensive template that captures the essence of the estimation process while allowing for project-specific customization.`;

    try {
      console.log('Template Service: Creating master template:', templateName);

      const stepByStepProcedure = await LLMService.generateContent(templatePrompt);
      
      if (!stepByStepProcedure || stepByStepProcedure.trim().length < 100) {
        throw new Error('Generated template procedure is too short. Please try again.');
      }

      const template: MasterTemplate = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        name: templateName,
        description: templateDescription,
        projectType,
        stepByStepProcedure,
        createdAt: new Date(),
        usageCount: 0,
        tags: [projectType.toLowerCase(), ...keywords.slice(0, 5)],
        estimateData: {
          scope: finalizedScope,
          keywords,
          hsrItems,
          finalEstimate
        },
        designData: designs,
        drawingData: drawings
      };

      this.saveTemplate(template);
      console.log('Template Service: Master template created successfully');
      return template;
    } catch (error) {
      console.error('Template Service Error:', error);
      throw new Error(`Failed to create master template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static saveTemplate(template: MasterTemplate): void {
    const templates = this.loadTemplates();
    templates.push(template);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
  }

  static loadTemplates(): MasterTemplate[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const templates = JSON.parse(stored);
      return templates.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        lastUsed: t.lastUsed ? new Date(t.lastUsed) : undefined
      }));
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  }

  static updateTemplate(updatedTemplate: MasterTemplate): void {
    const templates = this.loadTemplates();
    const index = templates.findIndex(t => t.id === updatedTemplate.id);
    if (index !== -1) {
      templates[index] = updatedTemplate;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
    }
  }

  static deleteTemplate(templateId: string): boolean {
    const templates = this.loadTemplates();
    const filtered = templates.filter(t => t.id !== templateId);
    
    if (filtered.length === templates.length) return false;
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  static markTemplateUsed(templateId: string): void {
    const templates = this.loadTemplates();
    const template = templates.find(t => t.id === templateId);
    if (template) {
      template.lastUsed = new Date();
      template.usageCount += 1;
      this.updateTemplate(template);
    }
  }

  static getTemplate(templateId: string): MasterTemplate | null {
    const templates = this.loadTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  static clearAllTemplates(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static searchTemplates(query: string): MasterTemplate[] {
    const templates = this.loadTemplates();
    const lowerQuery = query.toLowerCase();
    
    return templates.filter(template => 
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.projectType.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  static getTemplatesByType(projectType: string): MasterTemplate[] {
    const templates = this.loadTemplates();
    return templates.filter(template =>
      template.projectType.toLowerCase() === projectType.toLowerCase()
    );
  }

  /**
   * Analyze what was actually accomplished in the project
   */
  private static analyzeActualProgress(
    conversationHistory: ChatMessage[],
    finalizedScope: string,
    designs: ComponentDesign[],
    drawings: TechnicalDrawing[],
    finalEstimate: string
  ): string {
    const progress = [];

    if (conversationHistory.length > 1) {
      progress.push(`✅ Discussion: ${conversationHistory.length} conversation exchanges`);
    }

    if (finalizedScope.trim()) {
      progress.push(`✅ Project Scope: Defined and finalized`);
    }

    if (designs.length > 0) {
      progress.push(`✅ Component Designs: ${designs.length} design(s) created`);
    }

    if (drawings.length > 0) {
      progress.push(`✅ Technical Drawings: ${drawings.length} drawing(s) generated`);
    }

    if (finalEstimate.trim()) {
      progress.push(`✅ Cost Estimation: Final estimate completed`);
    }

    return progress.join('\n');
  }

  /**
   * Extract actual work done from conversation
   */
  private static extractActualWork(conversationHistory: ChatMessage[]): string {
    // Filter out generic greetings and focus on actual work
    const workMessages = conversationHistory.filter(msg => {
      const text = msg.text.toLowerCase();
      return !text.includes('hello') &&
             !text.includes('hi ') &&
             !text.includes('please describe') &&
             text.length > 20; // Meaningful content
    });

    return workMessages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.text.substring(0, 200)}...`)
      .join('\n\n');
  }

  /**
   * Extract complete design creation process
   */
  private static extractDesignProcess(designs: ComponentDesign[], conversationHistory: ChatMessage[]): string {
    if (designs.length === 0) {
      return 'No component designs were created in this project.';
    }

    let designProcess = `COMPLETE DESIGN CREATION PROCESS (${designs.length} designs created):\n\n`;

    designs.forEach((design, index) => {
      designProcess += `**DESIGN ${index + 1}: ${design.componentName}**\n`;
      designProcess += `Created: ${design.createdAt.toLocaleString()}\n`;
      designProcess += `Materials Used: ${design.specifications.materials.join(', ')}\n`;
      designProcess += `Dimensions: ${JSON.stringify(design.specifications.dimensions)}\n`;
      designProcess += `Calculations: ${design.specifications.calculations}\n`;
      designProcess += `Full Design Content:\n${design.designContent}\n`;
      if (design.htmlContent) {
        designProcess += `HTML Export: Generated professional HTML document\n`;
      }
      designProcess += `Context Inclusion: ${design.includeInContext ? 'Included in future prompts' : 'Not included'}\n\n`;
    });

    // Find design-related conversations
    const designConversations = conversationHistory.filter(msg =>
      msg.text.toLowerCase().includes('design') && msg.text.length > 50
    );

    if (designConversations.length > 0) {
      designProcess += `**DESIGN CONVERSATION WORKFLOW:**\n`;
      designConversations.forEach((msg, index) => {
        designProcess += `${index + 1}. ${msg.role.toUpperCase()}: ${msg.text.substring(0, 200)}...\n`;
      });
    }

    return designProcess;
  }

  /**
   * Extract complete drawing creation process
   */
  private static extractDrawingProcess(drawings: TechnicalDrawing[], conversationHistory: ChatMessage[]): string {
    if (drawings.length === 0) {
      return 'No technical drawings were created in this project.';
    }

    let drawingProcess = `COMPLETE DRAWING CREATION PROCESS (${drawings.length} drawings created):\n\n`;

    drawings.forEach((drawing, index) => {
      drawingProcess += `**DRAWING ${index + 1}: ${drawing.title}**\n`;
      drawingProcess += `Created: ${drawing.createdAt.toLocaleString()}\n`;
      drawingProcess += `Description: ${drawing.description}\n`;
      drawingProcess += `DXF File: ${drawing.dxfFilename}\n`;
      drawingProcess += `File Size: ${drawing.dxfContent.length} characters (base64)\n\n`;
    });

    // Find drawing-related conversations
    const drawingConversations = conversationHistory.filter(msg =>
      msg.text.toLowerCase().includes('drawing') || msg.text.toLowerCase().includes('draw') && msg.text.length > 50
    );

    if (drawingConversations.length > 0) {
      drawingProcess += `**DRAWING CONVERSATION WORKFLOW:**\n`;
      drawingConversations.forEach((msg, index) => {
        drawingProcess += `${index + 1}. ${msg.role.toUpperCase()}: ${msg.text.substring(0, 200)}...\n`;
      });
    }

    return drawingProcess;
  }

  /**
   * Extract detailed workflow from conversations
   */
  private static extractDetailedWorkflow(conversationHistory: ChatMessage[]): string {
    const meaningfulMessages = conversationHistory.filter(msg => {
      const text = msg.text.toLowerCase();
      return !text.includes('hello') &&
             !text.includes('hi ') &&
             !text.includes('please describe') &&
             text.length > 30; // More substantial content
    });

    let workflow = `DETAILED PROJECT WORKFLOW (${meaningfulMessages.length} meaningful exchanges):\n\n`;

    meaningfulMessages.forEach((msg, index) => {
      workflow += `**STEP ${index + 1}** (${msg.role.toUpperCase()}):\n`;
      workflow += `${msg.text}\n\n`;
    });

    return workflow;
  }

  /**
   * Get detailed components with full specifications
   */
  private static getDetailedComponents(
    finalizedScope: string,
    keywords: string[],
    hsrItems: HsrItem[],
    designs: ComponentDesign[],
    drawings: TechnicalDrawing[],
    finalEstimate: string
  ): string {
    let components = `COMPLETE PROJECT COMPONENTS:\n\n`;

    if (finalizedScope.trim()) {
      components += `**PROJECT SCOPE (COMPLETE):**\n${finalizedScope}\n\n`;
    }

    if (keywords.length > 0) {
      components += `**KEYWORDS IDENTIFIED (${keywords.length}):**\n${keywords.join(', ')}\n\n`;
    }

    if (hsrItems.length > 0) {
      components += `**HSR ITEMS (${hsrItems.length} items):**\n`;
      hsrItems.forEach((item, index) => {
        components += `${index + 1}. ${item.description} - ${item.unit} - Rate: ${item.rate}\n`;
      });
      components += '\n';
    }

    if (designs.length > 0) {
      components += `**COMPONENT DESIGNS (${designs.length} designs):**\n`;
      designs.forEach((design, index) => {
        components += `${index + 1}. ${design.componentName}\n`;
        components += `   Materials: ${design.specifications.materials.join(', ')}\n`;
        components += `   Dimensions: ${JSON.stringify(design.specifications.dimensions)}\n`;
      });
      components += '\n';
    }

    if (drawings.length > 0) {
      components += `**TECHNICAL DRAWINGS (${drawings.length} drawings):**\n`;
      drawings.forEach((drawing, index) => {
        components += `${index + 1}. ${drawing.title}: ${drawing.description}\n`;
      });
      components += '\n';
    }

    if (finalEstimate.trim()) {
      components += `**FINAL ESTIMATE (COMPLETE):**\n${finalEstimate}\n\n`;
    }

    return components;
  }

  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
