# HSR Construction Estimator - Design Section Documentation

## Overview
The Design Section is responsible for generating detailed component designs with specifications, materials, and calculations. It creates professional engineering designs that can be used for construction planning and cost estimation.

## Core Components

### 1. Design Request Flow Architecture

#### User Input Processing
- **Location**: `App.tsx` - `handleDesignRequest()` function (lines 255-307)
- **Trigger**: Form submission when `outputMode` is set to 'design'
- **Input Processing**: Extracts component name from user input using regex pattern

#### Component Name Extraction
```javascript
const componentMatch = userInput.match(/design\s+(?:for\s+)?(.+?)(?:\s|$)/i);
const componentName = componentMatch ? componentMatch[1].trim() : 'Component';
```

### 2. Context and Guidelines Integration

#### Guidelines Processing
**Location**: `App.tsx` lines 265-268
```javascript
const activeGuidelines = GuidelinesService.getActiveGuidelines();
const designGuidelines = GuidelinesService.getActiveGuidelines('design');
const allGuidelines = [...activeGuidelines, ...designGuidelines];
const guidelinesText = GuidelinesService.formatGuidelinesForPrompt(allGuidelines);
```

#### Project Scope Context
**Location**: `App.tsx` line 270
```javascript
const scopeContext = finalizedScope || ThreadService.getAllContextForMode('discussion');
```

#### Knowledge Base Enhancement
**Location**: `App.tsx` lines 273-280
```javascript
let enhancedUserInput = userInput;
if (includeKnowledgeBase) {
    const { enhancedPrompt } = RAGService.enhancePromptWithKnowledgeBase(
        userInput,
        includeKnowledgeBase
    );
    enhancedUserInput = enhancedPrompt;
}
```

### 3. Design Generation Service

#### Primary Service Function
**Location**: `services/designService.ts` - `generateComponentDesign()` (lines 6-61)

#### Function Parameters
```typescript
static async generateComponentDesign(
    componentName: string,
    projectScope: string,
    userRequirements: string,
    guidelines: string,
    referenceText: string
): Promise<ComponentDesign>
```

#### Prompt Construction
**Location**: `services/designService.ts` lines 25-69
```javascript
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

Focus on creating a professional, implementable design that integrates seamlessly with the overall project.`;
```

### 4. System Instructions (Hard-coded Prompts)

#### Design Mode System Instruction
**Location**: `services/geminiService.ts` lines 104-145
```javascript
baseSystemInstruction = `You are a professional structural engineer and construction expert working within the HSR Construction Estimator application.

**APPLICATION CONTEXT:**
You are currently operating in the DESIGN SECTION of a comprehensive construction estimation app that follows this workflow:
1. **Discussion Section**: Project scoping and requirement gathering through conversation (COMPLETED)
2. **Design Section** (CURRENT): Component design generation with HTML output and technical specifications
3. **Drawing Section**: Professional DXF technical drawing generation using Python backend
4. **Estimation Workflow**: Keyword generation → HSR database search → Cost estimation

The app maintains context across all sections, stores conversation history, manages user guidelines, integrates knowledge base documents, and supports multiple LLM providers.

**YOUR CURRENT ROLE - DESIGN SECTION:**
Your primary goal is to create detailed component designs with specifications, materials, and calculations based on the project scope defined in the Discussion Section and considering relationships with other components.

**DESIGN PROCESS:**
1. **Context Analysis**: Review the complete project scope from Discussion Section
2. **Component Understanding**: Understand the specific component the user wants to design
3. **Relationship Mapping**: Consider how this component relates to other project components
4. **Structural Calculations**: Provide comprehensive structural calculations including load analysis
5. **Material Specifications**: Specify materials with exact quantities and specifications
6. **Dimensional Details**: Include dimensional details and tolerances
7. **Code Compliance**: Reference relevant Indian building codes (IS codes, NBC)
8. **Safety Considerations**: Consider safety factors and construction methodology
9. **Documentation**: Provide clear, well-structured design documentation
10. **Integration Preparation**: Ensure design is detailed enough for technical drawing generation

**CONTEXT AWARENESS:**
- You have access to the complete project scope from Discussion Section
- Previous component designs are available for reference and integration
- Reference documents uploaded by users are available for consultation
- User guidelines and knowledge base may provide additional context
- Your design outputs will be used in the Drawing Section for technical documentation

**DESIGN INTEGRATION:**
- Consider structural relationships between components (foundations support walls, beams support slabs, etc.)
- Ensure dimensional compatibility between related components
- Maintain consistent material specifications across the project
- Consider construction sequencing and methodology
- Prepare detailed specifications suitable for technical drawing generation

Focus on creating comprehensive, implementable designs that comply with Indian construction standards, integrate well with other project components, and provide sufficient detail for subsequent drawing generation and cost estimation.`;
```

### 5. LLM Service Integration

#### Unified LLM Service Call
**Location**: `services/designService.ts` lines 67-74
```javascript
// Create a conversation history for the design request
const designHistory: ChatMessage[] = [
    { role: 'user', text: prompt }
];

// Use the unified LLM service through continueConversation
const designContent = await continueConversation(designHistory, referenceText, 'design');
```

**Benefits of Unified Service:**
- Uses the same LLM provider selection as discussion section
- Supports multiple LLM providers (Gemini, Kimi K2, etc.)
- Consistent error handling and API management
- Automatic fallback and retry mechanisms
- Unified system instructions and prompt enhancement

### 6. Design Object Structure

#### ComponentDesign Interface
**Location**: `types.ts` lines 40-52
```typescript
export interface ComponentDesign {
    id: string;
    componentName: string;
    designContent: string;
    htmlContent?: string;
    specifications: {
        materials: string[];
        dimensions: Record<string, number>;
        calculations: string;
    };
    createdAt: Date;
    includeInContext?: boolean;
}
```

#### Design Object Creation
**Location**: `services/designService.ts` lines 43-54
```javascript
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
```

### 7. Storage and Persistence

#### Local Storage Management
**Location**: `services/designService.ts`

#### Save Design Function
```javascript
static saveDesign(design: ComponentDesign): void {
    const designs = this.loadDesigns();
    designs.push(design);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(designs));
}
```

#### Load Designs Function
```javascript
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
```

#### Storage Key
```javascript
private static readonly STORAGE_KEY = 'hsr-component-designs';
```

### 8. Response Processing and UI Updates

#### Response Handling
**Location**: `App.tsx` lines 290-298
```javascript
await DesignService.generateComponentDesign(
    componentName,
    scopeContext,
    enhancedUserInput,
    guidelinesText,
    referenceText
);

loadDesigns();
setLoadingMessage('');

// Add to conversation history for reference
setConversationHistory(prev => [
    ...prev,
    { role: 'user', text: userInput },
    { role: 'model', text: `Design generated for ${componentName}. You can view the detailed design in the Design Display section below.` }
]);
```

### 9. Design Display Component

#### Component Interface
**Location**: `components/DesignDisplay.tsx` lines 4-8
```typescript
interface DesignDisplayProps {
    designs: ComponentDesign[];
    onDesignUpdate: () => void;
    onContextUpdate?: () => void;
}
```

#### UI Rendering
**Location**: `components/DesignDisplay.tsx` lines 10-24
- Displays list of generated designs
- Shows component names and design content
- Provides empty state when no designs exist
- Includes design management functionality

### 10. Integration with Other Sections

#### Context Service Integration
- Designs are automatically included in project context when `includeInContext` is true
- Design content is available for reference in subsequent discussions and drawings
- Designs contribute to the overall project knowledge base

#### Thread Service Integration
- Design requests and responses are saved to conversation threads
- Design mode conversations are tracked separately from discussion mode
- Thread context includes design-specific information

#### Knowledge Base Integration
- Designs can reference uploaded documents and knowledge base content
- RAG system enhances design prompts with relevant context
- Design outputs can be used as reference for future designs

### 11. Error Handling

#### Error Processing
**Location**: `App.tsx` lines 300-306
```javascript
} catch (err: any) {
    console.error(err);
    setError(err.message || 'An error occurred while generating the design.');
} finally {
    setIsAiThinking(false);
    setLoadingMessage('');
}
```

#### API Error Handling
**Location**: `services/designService.ts` lines 36-38, 58-60
```javascript
if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
}

// ...

} catch (error) {
    throw new Error(`Failed to generate design: ${error}`);
}
```

### 12. Design Management Operations

#### Update Design
```javascript
static updateDesign(designId: string, updates: Partial<ComponentDesign>): ComponentDesign | null
```

#### Delete Design
```javascript
static deleteDesign(designId: string): boolean
```

#### Load All Designs
```javascript
static loadDesigns(): ComponentDesign[]
```

## Data Flow Summary

1. **User Input** → Design mode form submission triggers `handleDesignRequest()`
2. **Component Extraction** → Component name extracted from user input via regex
3. **Context Building** → Guidelines, project scope, and knowledge base combined
4. **Prompt Construction** → System instruction + context + user requirements
5. **API Communication** → Gemini API called with constructed prompt
6. **Design Object Creation** → Response parsed and ComponentDesign object created
7. **Storage** → Design saved to localStorage via DesignService
8. **UI Updates** → Design list refreshed, conversation history updated
9. **Context Integration** → Design available for future reference across sections

## Configuration Points

### Customizable Elements
1. **System Instructions**: Modify design prompts in `geminiService.ts`
2. **Prompt Template**: Adjust prompt construction in `designService.ts`
3. **Design Structure**: Modify ComponentDesign interface in `types.ts`
4. **Storage Strategy**: Change storage implementation in `designService.ts`
5. **UI Display**: Customize design presentation in `DesignDisplay.tsx`

### Integration Points
1. **Guidelines System**: Design-specific guidelines automatically included
2. **Knowledge Base**: RAG system enhances design prompts
3. **Context Service**: Designs contribute to project context
4. **Thread Management**: Design conversations tracked and stored
5. **Reference Documents**: Uploaded files included in design prompts

## Future Usage of Design Outputs

### Cross-Section Reference
- Design content is available in drawing section for technical drawing generation
- Design specifications can be referenced in cost estimation
- Design details contribute to project scope refinement

### Context Building
- Designs are automatically included in project context for future conversations
- Design specifications inform subsequent design requests
- Design content enhances the overall project knowledge base

### Export and Documentation
- Designs can be exported as standalone documents
- Design content can be formatted for project documentation
- Design specifications can be used for material quantity calculations
