import { GoogleGenAI, Type, Content } from "@google/genai";
import { HsrItem, ChatMessage, KeywordsByItem } from '../types';

const getAiClient = () => {
  const apiKey = localStorage.getItem('gemini-api-key');
  if (!apiKey) {
    throw new Error("API key is not configured. Please set it in the application.");
  }
  return new GoogleGenAI({ apiKey });
};

const model = "gemini-2.5-flash";

const createPromptWithReference = (basePrompt: string, referenceText?: string): string => {
    if (referenceText && referenceText.trim()) {
        return `You have been provided with a reference document by the user. Use the content of this document to inform your response, making it similar or using parts of it as instructed.

REFERENCE DOCUMENT CONTENT:
---
${referenceText}
---

TASK:
${basePrompt}
        `;
    }
    return basePrompt;
};

export const continueConversation = async (history: ChatMessage[], referenceText?: string): Promise<string> => {
    const ai = getAiClient();
    const baseSystemInstruction = `You are a world-class civil engineering estimator and project planner. Your primary goal is to engage in a step-by-step conversation with the user to collaboratively define the complete scope of a construction project.

Your Process:
1. Start by understanding the user's initial high-level request.
2. Break down the project into a logical hierarchy: Component -> Sub-components -> Items. (e.g., Component: 'Boundary Wall', Sub-component: 'Foundation', Item: 'Earthwork in excavation').
3. Ask targeted, clarifying questions to elicit necessary details like dimensions (length, width, height), materials, specifications, and quantities.
4. If you need current information, standard dimensions, or best practices that you don't know, you MUST use the provided Google Search tool.
5. With each response, present the current state of the project breakdown in a clear, structured format (like a nested list or table).
6. Guide the user until all necessary details for a complete estimate are finalized. The final output of this conversation should be a comprehensive, structured list of all components, sub-components, and items with their finalized specifications. Critically, for each 'Item', you must also propose a list of at least five relevant, single-word keywords that would be useful for a database search. Clearly label this list.

Example of a final item entry:
- **Item:** Earthwork in excavation for foundation.
  - **Dimensions:** 10m x 5m x 1.5m
  - **Specifications:** Ordinary soil.
  - **Proposed Keywords:** [excavation, earthwork, soil, foundation, digging]`;

    const systemInstruction = createPromptWithReference(baseSystemInstruction, referenceText);

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
    const ai = getAiClient();

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
    const fullPrompt = createPromptWithReference(basePrompt, referenceText);

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
