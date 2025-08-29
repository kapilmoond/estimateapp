import { GoogleGenAI, Type, Content } from "@google/genai";
import { HsrItem, ChatMessage, KeywordsByItem } from '../types';
import { GuidelinesService } from './guidelinesService';
import { LLMService } from './llmService';

export const getAiClient = () => {
  const apiKey = localStorage.getItem('gemini-api-key');
  if (!apiKey) {
    throw new Error("API key is not configured. Please set it in the application.");
  }
  return new GoogleGenAI({ apiKey });
};

// Simple text generation using the new LLM service
export const generateSimpleResponse = async (prompt: string): Promise<string> => {
  return await LLMService.generateContent(prompt);
};

const model = "gemini-2.5-pro";

const createPromptWithReference = (basePrompt: string, referenceText?: string, guidelines?: string): string => {
    let enhancedPrompt = basePrompt;

    // Add guidelines if provided
    if (guidelines && guidelines.trim()) {
        enhancedPrompt = guidelines + '\n\n' + enhancedPrompt;
    }

    // Add reference documents if provided
    if (referenceText && referenceText.trim()) {
        enhancedPrompt = `You have been provided with a reference document by the user. Use the content of this document to inform your response, making it similar or using parts of it as instructed.

REFERENCE DOCUMENT CONTENT:
---
${referenceText}
---

TASK:
${enhancedPrompt}
        `;
    }

    return enhancedPrompt;
};

export const continueConversation = async (history: ChatMessage[], referenceText?: string, mode: 'discussion' | 'design' | 'drawing' = 'discussion'): Promise<string> => {
    // Check if we're using Gemini provider for advanced features, otherwise use simple LLM service
    const currentProvider = LLMService.getCurrentProvider();

    if (currentProvider !== 'gemini') {
        // For non-Gemini providers, use simple text generation
        const conversationText = history.map(msg => `${msg.role.toUpperCase()}: ${msg.text}`).join('\n');
        const prompt = `Continue this conversation in a helpful and professional manner:\n\n${conversationText}\n\nASSISTANT:`;
        return await LLMService.generateContent(prompt);
    }

    // For Gemini, use advanced features
    const ai = getAiClient();

    // Get active guidelines for the current mode
    const activeGuidelines = GuidelinesService.getActiveGuidelines();
    const modeGuidelines = GuidelinesService.getActiveGuidelines(mode);
    const allActiveGuidelines = [...activeGuidelines, ...modeGuidelines];
    const guidelinesText = GuidelinesService.formatGuidelinesForPrompt(allActiveGuidelines);

    let baseSystemInstruction = '';

    if (mode === 'discussion') {
        baseSystemInstruction = `You are a world-class civil engineering estimator and project planner working within the HSR Construction Estimator application.

**APPLICATION CONTEXT:**
You are currently operating in the DISCUSSION SECTION of a comprehensive construction estimation app that follows this workflow:
1. **Discussion Section** (CURRENT): Project scoping and requirement gathering through conversation
2. **Design Section**: Component design generation with HTML output and technical specifications
3. **Drawing Section**: Professional DXF technical drawing generation using Python backend
4. **Estimation Workflow**: Keyword generation → HSR database search → Cost estimation

The app maintains context across all sections, stores conversation history, manages user guidelines, integrates knowledge base documents, and supports multiple LLM providers. Users can upload reference documents (PDF, Word, Excel) that are included in prompts. The app saves all outputs for cross-section reference and builds comprehensive project context.

**YOUR CURRENT ROLE - DISCUSSION SECTION:**
Your primary goal is to engage in a step-by-step conversation with the user to collaboratively define the complete scope of a construction project that will later be used for design generation, technical drawings, and cost estimation.

**Your Process:**
1. Start by understanding the user's initial high-level request.
2. Break down the project into a logical hierarchy: Component -> Sub-components -> Items. (e.g., Component: 'Boundary Wall', Sub-component: 'Foundation', Item: 'Earthwork in excavation').
3. Ask targeted, clarifying questions to elicit necessary details like dimensions (length, width, height), materials, specifications, and quantities.
4. If you need current information, standard dimensions, or best practices that you don't know, you MUST use the provided Google Search tool.
5. With each response, present the current state of the project breakdown in a clear, structured format (like a nested list or table).
6. Guide the user until all necessary details for a complete estimate are finalized. The final output of this conversation should be a comprehensive, structured list of all components, sub-components, and items with their finalized specifications. Critically, for each 'Item', you must also propose a list of at least five relevant, single-word keywords that would be useful for a database search. Clearly label this list.
7. Consider how the scope will be used in subsequent Design and Drawing sections for component design and technical documentation.

**CONTEXT AWARENESS:**
- You have access to previous conversation history and project context
- Reference documents uploaded by users are available for consultation
- User guidelines and knowledge base may provide additional context
- Your responses contribute to the overall project context used across all app sections

Example of a final item entry:
- **Item:** Earthwork in excavation for foundation.
  - **Dimensions:** 10m x 5m x 1.5m
  - **Specifications:** Ordinary soil.
  - **Proposed Keywords:** [excavation, earthwork, soil, foundation, digging]`;
    } else if (mode === 'design') {
        baseSystemInstruction = `You are a professional structural engineer and construction expert working within the HSR Construction Estimator application.

**APPLICATION CONTEXT:**
You are currently operating in the DESIGN SECTION of a comprehensive construction estimation app that follows this workflow:
1. **Discussion Section**: Project scoping and requirement gathering through conversation (COMPLETED)
2. **Design Section** (CURRENT): Component design generation with HTML output and technical specifications
3. **Drawing Section**: Professional DXF technical drawing generation using Python backend
4. **Estimation Workflow**: Keyword generation → HSR database search → Cost estimation

The app maintains context across all sections, stores conversation history, manages user guidelines, integrates knowledge base documents, and supports multiple LLM providers. Users can upload reference documents (PDF, Word, Excel) that are included in prompts. The app saves all outputs for cross-section reference and builds comprehensive project context.

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
- Design specifications will be used in the Estimation workflow for cost calculation

**DESIGN INTEGRATION:**
- Consider structural relationships between components (foundations support walls, beams support slabs, etc.)
- Ensure dimensional compatibility between related components
- Maintain consistent material specifications across the project
- Consider construction sequencing and methodology
- Prepare detailed specifications suitable for technical drawing generation

Focus on creating comprehensive, implementable designs that comply with Indian construction standards, integrate well with other project components, and provide sufficient detail for subsequent drawing generation and cost estimation.`;
    } else if (mode === 'drawing') {
        baseSystemInstruction = `You are a professional technical draftsman and construction engineer working within the HSR Construction Estimator application.

**APPLICATION CONTEXT:**
You are currently operating in the DRAWING SECTION of a comprehensive construction estimation app that follows this workflow:
1. **Discussion Section**: Project scoping and requirement gathering through conversation (COMPLETED)
2. **Design Section**: Component design generation with HTML output and technical specifications (COMPLETED)
3. **Drawing Section** (CURRENT): Professional DXF technical drawing generation using Python backend
4. **Estimation Workflow**: Keyword generation → HSR database search → Cost estimation

The app maintains context across all sections, stores conversation history, manages user guidelines, integrates knowledge base documents, and supports multiple LLM providers. Users can upload reference documents (PDF, Word, Excel) that are included in prompts. The app saves all outputs for cross-section reference and builds comprehensive project context.

**YOUR CURRENT ROLE - DRAWING SECTION:**
Your primary goal is to provide detailed instructions for creating professional technical drawings based on the project scope from Discussion Section and component designs from Design Section.

**DRAWING PROCESS:**
1. **Context Integration**: Review complete project scope and existing component designs
2. **Drawing Requirements**: Understand the specific drawing requirements and component details
3. **Design Reference**: Use component designs for accurate dimensions and specifications
4. **View Planning**: Provide specific drawing instructions including views needed (plan, elevation, section, details)
5. **Dimension Specification**: Specify all critical dimensions and measurements from design data
6. **Detail Integration**: Include material symbols and construction details from component designs
7. **Standards Compliance**: Reference drawing standards (IS 696, IS 962)
8. **Technical Instructions**: Provide clear instructions for creating DXF-based technical drawings
9. **Documentation**: Include title block information and drawing conventions
10. **Quality Assurance**: Ensure drawings are suitable for construction and estimation use

**CONTEXT AWARENESS:**
- You have access to the complete project scope from Discussion Section
- All component designs with specifications and dimensions are available
- Previous technical drawings are available for reference and consistency
- Reference documents uploaded by users are available for consultation
- User guidelines and knowledge base may provide additional context
- Your drawing outputs will be used in the Estimation workflow for accurate cost calculation

**DRAWING INTEGRATION:**
- Use exact dimensions and specifications from component designs
- Maintain consistency across multiple drawings for the same project
- Show relationships between different components in assembly drawings
- Include all necessary details for construction and estimation
- Ensure drawings are compatible with Indian construction practices
- Prepare drawings suitable for quantity takeoff and cost estimation

**TECHNICAL OUTPUT:**
Your instructions will be processed by a Python backend using ezdxf library to generate professional DXF files with:
- Accurate geometric representations
- Proper dimensioning and annotations
- Multiple layers for different elements
- Standard drawing conventions
- Professional title blocks and layouts

Focus on creating comprehensive, standards-compliant technical drawing instructions that integrate project scope, component designs, and construction requirements for professional DXF output suitable for construction and cost estimation.`;
    }

    const systemInstruction = createPromptWithReference(baseSystemInstruction, referenceText, guidelinesText);

    const contents: Content[] = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    try {
        const response = await ai.models.generateContent({
            model,
            contents,
            config: {
                systemInstruction,
                tools: [{googleSearch: {}}],
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error continuing conversation with Gemini:", error);
        throw new Error("Failed to get a response from the AI. The model might be overloaded or the request is invalid.");
    }
};

export const generateKeywordsForItems = async (scope: string, feedback?: string, referenceText?: string): Promise<KeywordsByItem> => {
    // Check if we're using Gemini provider for structured output, otherwise use simple parsing
    const currentProvider = LLMService.getCurrentProvider();

    if (currentProvider !== 'gemini') {
        // For non-Gemini providers, use simple text generation and parse manually
        const prompt = `Generate exactly 5 keywords for each construction item in this scope. Format as JSON array:

Scope: ${scope}
${feedback ? `Feedback: ${feedback}` : ''}

Return a JSON array of objects with "itemDescription" and "keywords" (array of 5 strings) properties.`;

        const response = await LLMService.generateContent(prompt);

        try {
            // Try to parse JSON response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsedResponse = JSON.parse(jsonMatch[0]);
                const keywordsByItem: KeywordsByItem = {};
                parsedResponse.forEach((item: any) => {
                    if (item.itemDescription && item.keywords) {
                        keywordsByItem[item.itemDescription] = item.keywords;
                    }
                });
                return keywordsByItem;
            }
        } catch (error) {
            console.warn('Could not parse JSON response, using fallback');
        }

        // Fallback: create simple keywords
        const keywordsByItem: KeywordsByItem = {};
        keywordsByItem[scope] = ['construction', 'building', 'material', 'work', 'project'];
        return keywordsByItem;
    }

    // For Gemini, use structured output
    const ai = getAiClient();

    // Get active guidelines for keyword generation
    const activeGuidelines = GuidelinesService.getActiveGuidelines();
    const estimationGuidelines = GuidelinesService.getActiveGuidelines('estimation');
    const allActiveGuidelines = [...activeGuidelines, ...estimationGuidelines];
    const guidelinesText = GuidelinesService.formatGuidelinesForPrompt(allActiveGuidelines);

    const feedbackInstruction = feedback ? `
**PRIORITY INSTRUCTION: USER FEEDBACK**
A previous attempt to generate keywords was not satisfactory. You MUST use the following user feedback to guide your new keyword generation. This feedback is your most important instruction and must be followed precisely, even if it contradicts your general tendencies.
USER FEEDBACK:
---
${feedback}
---
` : '';

    const basePrompt = `You are a highly specialized civil engineering estimator. Your task is to analyze the provided project scope, identify each distinct construction 'Item', and generate a precise list of search keywords for it.

${feedbackInstruction}

## CRITICAL INSTRUCTIONS

1.  **Analyze the Scope:** Read through the entire project scope provided below.
2.  **Identify Items:** For every individual construction 'Item' described in the scope (e.g., "Earthwork in excavation for foundation", "Providing and laying cement concrete"), you must perform the next step.
3.  **Generate Exactly 5 Keywords:** For EACH identified item, you are required to generate an array of keywords. This array MUST contain EXACTLY FIVE (5) keywords. The number of keywords must be 5, not 4 or 6. Five is the required number. These keywords must be distinct, single-word, and highly relevant.
4.  **JSON Output:** Your entire output MUST be a single, well-formed JSON array. Each object in the array must contain two keys: \`itemDescription\` and \`keywords\`. The value for the \`keywords\` key MUST be an array of 5 strings.

**CRITICAL REMINDER:** The \`keywords\` array for each item must have a length of exactly 5. This is a strict requirement.

Project Scope:
---
${scope}
---
`;
    const fullPrompt = createPromptWithReference(basePrompt, referenceText, guidelinesText);

    try {
        const response = await ai.models.generateContent({
            model,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            itemDescription: {
                                type: Type.STRING,
                                description: "The description of the construction item from the scope."
                            },
                            keywords: {
                                type: Type.ARRAY,
                                description: "A list of exactly 5 keywords for this item.",
                                items: {
                                    type: Type.STRING
                                }
                            }
                        },
                        required: ["itemDescription", "keywords"]
                    }
                }
            }
        });

        const jsonText = response.text.trim();
        const parsedResponse: { itemDescription: string; keywords: string[] }[] = JSON.parse(jsonText);
        
        const keywordsByItem: KeywordsByItem = {};
        parsedResponse.forEach(item => {
            if (item.itemDescription && item.keywords) {
                keywordsByItem[item.itemDescription] = item.keywords;
            }
        });
        return keywordsByItem;

    } catch (error) {
        console.error("Error generating keywords from Gemini:", error);
        throw new Error("Failed to generate keywords from the AI. The model might be overloaded or the request is invalid.");
    }
};

export const generatePlainTextEstimate = async (finalizedScope: string, hsrItems: HsrItem[], conversationHistory: ChatMessage[], previousText?: string, editInstruction?: string, referenceText?: string): Promise<string> => {
    // Check if we're using Gemini provider for advanced features, otherwise use simple LLM service
    const currentProvider = LLMService.getCurrentProvider();

    if (currentProvider !== 'gemini') {
        // For non-Gemini providers, use simple text generation
        const hsrItemsString = JSON.stringify(hsrItems, null, 2);
        const conversationHistoryString = conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

        let prompt: string;
        if (editInstruction && previousText) {
            prompt = `Please edit the following construction estimate based on the instruction provided:

PREVIOUS ESTIMATE:
${previousText}

EDIT INSTRUCTION:
${editInstruction}

Please provide the updated estimate maintaining professional formatting and accuracy.`;
        } else {
            prompt = `Create a detailed construction cost estimate based on the following information:

SCOPE OF WORK:
${finalizedScope}

HSR ITEMS FOUND:
${hsrItemsString}

CONVERSATION HISTORY:
${conversationHistoryString}

Please create a comprehensive, professional construction estimate with proper formatting, quantities, rates, and totals.`;
        }

        return await LLMService.generateContent(prompt);
    }

    // For Gemini, use advanced features
    const ai = getAiClient();
    const hsrItemsString = JSON.stringify(hsrItems, null, 2);
    const conversationHistoryString = conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

    let basePrompt: string;

    if (previousText && editInstruction) {
        basePrompt = `
        You are a professional quantity surveyor tasked with editing a detailed construction project report.

        You are given five inputs:
        1.  The ORIGINAL Finalized Project Scope.
        2.  RECENT CONVERSATION HISTORY (This provides crucial context and may contain user-directed modifications or clarifications that supersede the initial scope. If there are discrepancies, prioritize information from this recent history).
        3.  The list of relevant HSR (Haryana Schedule of Rates) items that have already been approved.
        4.  The PREVIOUSLY GENERATED PLAIN TEXT REPORT that now needs modification.
        5.  A set of USER INSTRUCTIONS detailing the required changes.

        CRITICAL INSTRUCTIONS:
        1.  **Primary Goal:** Your task is to REVISE the 'PREVIOUSLY GENERATED PLAIN TEXT REPORT' according to the 'USER INSTRUCTIONS'. You must maintain the narrative, well-structured format of the report.
        2.  **PRIORITIZE USER INSTRUCTIONS:** If the user asks for a different format or structure in their instructions, their request is MORE IMPORTANT than the default guidelines. You must follow their new formatting request.
        3.  **Data Integrity:** All calculations for quantities and costs MUST continue to be derived ONLY from the 'ORIGINAL Finalized Project Scope' and 'RECENT CONVERSATION HISTORY', updated with the user's edit instructions. The HSR data from 'Approved HSR Items' must be used for rates. For Non-Scheduled items, you should already have an estimated rate; continue to use that unless the user's instructions specify otherwise.
        4.  **Output Format:** The entire output must be a single string of the COMPLETE, REVISED, well-formed plain text report. Do not provide explanations or comments.

        INPUT 1: ORIGINAL Finalized Project Scope:
        \`\`\`
        ${finalizedScope}
        \`\`\`
        
        INPUT 2: RECENT CONVERSATION HISTORY:
        \`\`\`
        ${conversationHistoryString}
        \`\`\`

        INPUT 3: Approved HSR Items (JSON):
        \`\`\`json
        ${hsrItemsString}
        \`\`\`

        INPUT 4: PREVIOUSLY GENERATED PLAIN TEXT REPORT:
        \`\`\`
        ${previousText}
        \`\`\`

        INPUT 5: USER INSTRUCTIONS FOR EDITING:
        \`\`\`
        ${editInstruction}
        \`\`\`

        Produce the complete, revised plain text report now.
        `;
    } else {
        basePrompt = `
        You are a professional quantity surveyor. Your task is to create a final, detailed construction project report and present it as a single, well-structured plain text document.

        You are given three inputs:
        1.  The Finalized Project Scope.
        2.  RECENT CONVERSATION HISTORY (This provides crucial context and may contain user-directed modifications or clarifications that supersede the initial scope. If there are discrepancies, prioritize information from this recent history).
        3.  A list of relevant HSR (Haryana Schedule of Rates) items with their official descriptions, units, and rates.

        CRITICAL INSTRUCTIONS:
        Your entire output must be a single string of well-formatted plain text. Use clear headings, nested lists, and descriptive paragraphs to create a professional and readable report. Avoid rigid, multi-column table structures. The main title should be "Detailed Project Estimate Report".

        The report MUST be structured in the following three parts:

        **PART 1: DETAILED PROJECT BREAKDOWN AND CALCULATIONS**
        For each major component of the project (e.g., 'Boundary Wall'), create a main heading. Under each heading, describe the work involved. For each specific work item (e.g., 'Earthwork in excavation'), provide a narrative description that includes:
        - The corresponding HSR item number and its full description. For items not found in the HSR data (Non-Scheduled items), you must state 'Non-Scheduled Item'.
        - A clear, step-by-step explanation of how the quantity was calculated (e.g., "The volume was calculated as Length x Breadth x Height: 10m x 0.5m x 1.5m = 7.5 cubic meters.").
        - The final calculated quantity and its unit.

        **PART 2: CONSOLIDATED SCHEDULE OF QUANTITIES**
        Create a consolidated summary of all work items, grouped by HSR number (or by item description for NS items). For each HSR item, list the total quantity required and then provide a breakdown of where that quantity is used throughout the project.

        **PART 3: ABSTRACT OF COST**
        Create a final cost summary. For each HSR item, present the total quantity, the rate from the HSR data, and the calculated total amount.
        **For Non-Scheduled items, you MUST perform a cost analysis.** Estimate a market-based rate for the item based on its description and calculate the amount. Clearly label the rate as "(Estimated)".
        Conclude with a grand total for the entire project, including both HSR and NS items. For example:
        - **HSR 2.21: Earthwork in excavation**
          - Quantity: 15.00 CUM, Rate: ₹500.00/CUM, Amount: ₹7,500.00
        - **NS Item: Special waterproof coating**
          - Quantity: 25.00 SQM, Rate: ₹800.00/SQM (Estimated), Amount: ₹20,000.00

        **DATA ADHERENCE:**
        - For each project 'Item', you MUST find the MOST SUITABLE matching item from the provided 'Approved HSR Items' JSON list. If no suitable item is found, treat it as a Non-Scheduled item.
        - All calculations MUST be derived from the 'Finalized Project Scope' and 'RECENT CONVERSATION HISTORY'.

        INPUT 1: Finalized Project Scope:
        \`\`\`
        ${finalizedScope}
        \`\`\`

        INPUT 2: RECENT CONVERSATION HISTORY:
        \`\`\`
        ${conversationHistoryString}
        \`\`\`

        INPUT 3: Approved HSR Items (JSON):
        \`\`\`json
        ${hsrItemsString}
        \`\`\`

        Produce the complete plain text report now. Do not include any introductory text, markdown, or comments.
        `;
    }

    const contents = createPromptWithReference(basePrompt, referenceText);

    try {
        const response = await ai.models.generateContent({
            model,
            contents: contents,
        });
        
        const responseText = response.text;

        if (!responseText) { // This handles undefined, null, ""
            console.error("Error generating plain text estimate from Gemini: Model returned no text.", response);
            const finishReason = response.candidates?.[0]?.finishReason;
            let errorMessage = "Failed to generate the final estimate. The model returned an empty or invalid response.";
            if (finishReason && finishReason !== 'STOP') {
                errorMessage += ` Reason: ${finishReason}. The response may have been blocked due to safety settings or other reasons.`;
            }
            throw new Error(errorMessage);
        }
        
        return responseText.trim();
    } catch (error: any) {
        console.error("Error generating plain text estimate from Gemini:", error);
        throw new Error(`Failed to generate the final estimate. The model might be overloaded or the request is invalid. Details: ${error.message}`);
    }
};
