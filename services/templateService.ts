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

    const templatePrompt = `Create a comprehensive master template for construction estimation based on the completed project data.

**PROJECT INFORMATION:**
Template Name: ${templateName}
Description: ${templateDescription}
Project Type: ${projectType}

**COMPLETE PROJECT SCOPE:**
${finalizedScope}

**CONVERSATION HISTORY:**
${conversationText}

**KEYWORDS GENERATED:**
${keywords.join(', ')}

**HSR ITEMS IDENTIFIED:**
${hsrItems.map(item => `${item.description} - ${item.unit} - Rate: ${item.rate}`).join('\n')}

**FINAL ESTIMATE:**
${finalEstimate}

**COMPONENT DESIGNS:**
${designsText}

**TECHNICAL DRAWINGS:**
${drawingsText}

**REFERENCE DOCUMENTS:**
${referenceText}

**MASTER TEMPLATE CREATION REQUIREMENTS:**
Create a comprehensive, step-by-step procedure that can be used as a master template for similar construction estimation projects. This template should:

1. **Extract Common Patterns**: Identify reusable estimation logic, calculation methods, and decision-making processes
2. **Create Step-by-Step Guide**: Develop a clear, sequential procedure for similar projects
3. **Include Decision Points**: Specify where user input or customization is needed
4. **Standardize Calculations**: Document calculation methods and formulas used
5. **Material Standards**: Include standard material specifications and alternatives
6. **Quality Checkpoints**: Define validation steps and quality control measures
7. **Customization Points**: Identify where template can be adapted for variations
8. **Best Practices**: Include lessons learned and optimization strategies

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
}
