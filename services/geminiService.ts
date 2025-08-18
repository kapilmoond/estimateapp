import { GoogleGenAI, Type, Content } from "@google/genai";
import { HsrItem, ChatMessage, KeywordsByItem } from '../types';

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API key is not configured. Please set the API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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

export const generateKeywordsForItems = async (scope: string, referenceText?: string): Promise<KeywordsByItem> => {
    const ai = getAiClient();
    const basePrompt = `You are a highly specialized civil engineering estimator. Your task is to analyze the provided project scope, identify each distinct construction 'Item', and generate a precise list of search keywords for it.

CRITICAL INSTRUCTIONS:
1.  **Analyze the Scope:** Read through the entire project scope provided below.
2.  **Identify Items:** For every individual construction 'Item' described in the scope (e.g., "Earthwork in excavation for foundation", "Providing and laying cement concrete"), you must perform the next step.
3.  **Generate Exactly 5 Keywords:** For EACH identified item, generate an array containing EXACTLY FIVE (5) distinct, single-word, highly relevant keywords. These keywords will be used to search a database of construction rates. Prioritize technical terms found in civil engineering and rate schedules.
4.  **JSON Output:** Your entire output MUST be a single, well-formed JSON array. Each object in the array represents one construction item and must contain two keys: \`itemDescription\` (the full description of the item from the scope) and \`keywords\` (an array of exactly 5 string keywords).

DO NOT generate more or less than 5 keywords per item.

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

export const generateKeywordsForNSItems = async (scope: string, foundHsrDescriptions: string[], referenceText?: string): Promise<KeywordsByItem> => {
    const ai = getAiClient();
    const foundItemsString = foundHsrDescriptions.join('\n');

    const basePrompt = `You are a highly specialized civil engineering estimator. Your task is to analyze a project scope, compare it against a list of already found construction items, identify any items from the scope that are MISSING, and generate search keywords for them.

CRITICAL INSTRUCTIONS:
1.  **Analyze the Project Scope:** Read the complete project scope below.
2.  **Review Found Items:** Compare the scope against the list of 'Already Found HSR Items'.
3.  **Identify Missing Items:** Identify every distinct construction 'Item' from the scope that is NOT adequately covered by the 'Already Found HSR Items'. These are the "Non-Scheduled" or "Missing" items. If all items from the scope seem to be covered, return an empty JSON array.
4.  **Generate Exactly 5 Keywords for Missing Items:** For EACH identified missing item, generate an array containing EXACTLY FIVE (5) distinct, single-word, highly relevant keywords. These keywords will be used for a database search. Prioritize technical terms.
5.  **JSON Output:** Your entire output MUST be a single, well-formed JSON array. Each object in the array represents one MISSING construction item and must contain two keys: \`itemDescription\` (the full description of the missing item from the scope) and \`keywords\` (an array of exactly 5 string keywords).

DO NOT generate keywords for items that are already listed in 'Already Found HSR Items'.

Project Scope:
---
${scope}
---

Already Found HSR Items:
---
${foundItemsString}
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
                                description: "The description of the missing construction item from the scope."
                            },
                            keywords: {
                                type: Type.ARRAY,
                                description: "A list of exactly 5 keywords for this missing item.",
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
        if (!jsonText || jsonText === '[]') {
            return {};
        }

        const parsedResponse: { itemDescription: string; keywords: string[] }[] = JSON.parse(jsonText);
        
        const keywordsByItem: KeywordsByItem = {};
        parsedResponse.forEach(item => {
            if (item.itemDescription && item.keywords) {
                keywordsByItem[item.itemDescription] = item.keywords;
            }
        });
        return keywordsByItem;

    } catch (error) {
        console.error("Error generating keywords for NS items from Gemini:", error);
        throw new Error("Failed to generate refined keywords from the AI. The model might be overloaded or the request is invalid.");
    }
};


export const generateHtmlEstimate = async (finalizedScope: string, hsrItems: HsrItem[], conversationHistory: ChatMessage[], previousHtml?: string, editInstruction?: string, referenceText?: string): Promise<string> => {
    const ai = getAiClient();
    const hsrItemsString = JSON.stringify(hsrItems, null, 2);
    const conversationHistoryString = conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

    let basePrompt: string;

    if (previousHtml && editInstruction) {
        basePrompt = `
        You are a professional quantity surveyor tasked with editing a detailed construction project report.

        You are given five inputs:
        1.  The ORIGINAL Finalized Project Scope.
        2.  RECENT CONVERSATION HISTORY (This provides crucial context and may contain user-directed modifications or clarifications that supersede the initial scope. If there are discrepancies, prioritize information from this recent history).
        3.  The list of relevant HSR (Haryana Schedule of Rates) items that have already been approved.
        4.  The PREVIOUSLY GENERATED HTML REPORT that now needs modification.
        5.  A set of USER INSTRUCTIONS detailing the required changes.

        CRITICAL INSTRUCTIONS:
        1.  **Primary Goal:** Your task is to REVISE the 'PREVIOUSLY GENERATED HTML REPORT' according to the 'USER INSTRUCTIONS'.
        2.  **PRIORITIZE USER INSTRUCTIONS:** If the user asks for a different format or structure in their instructions, their request is MORE IMPORTANT than the default guidelines. You must follow their new formatting request.
        3.  **Default Structure (If no format change is requested):** If the user is only asking for data changes (e.g., "increase length to 20m") and not a format change, regenerate the report following the standard three-part structure below:
            - **Part 1: Detailed Calculations:** Separate tables for each component/subcomponent with columns: HSR No., HSR Description, Item Description, Calculation for Quantity, Quantity, Unit.
            - **Part 2: Detail of Quantity:** A consolidated table, grouped and sub-totalled by ascending HSR No., with NS items last. Columns: Sr. No., HSR No/NS, HSR Description, Component/Subcomponent/item description, Quantity of this Item, Unit.
            - **Part 3: Abstract of Cost:** A final summary table with columns: Sr. No., HSR Description, Unit, Quantity, Rate, Amount, and a Grand Total.
        4.  **Data Integrity:** All calculations for quantities and costs MUST continue to be derived ONLY from the 'ORIGINAL Finalized Project Scope' and 'RECENT CONVERSATION HISTORY', updated with the user's edit instructions. The HSR data from 'Approved HSR Items' must be used for rates. DO NOT invent new data.
        5.  **Output Format:** The entire output must be a single string of the COMPLETE, REVISED, well-formed HTML report. Do not provide explanations or comments.

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

        INPUT 4: PREVIOUSLY GENERATED HTML REPORT:
        \`\`\`html
        ${previousHtml}
        \`\`\`

        INPUT 5: USER INSTRUCTIONS FOR EDITING:
        \`\`\`
        ${editInstruction}
        \`\`\`

        Produce the complete, revised HTML report now.
        `;
    } else {
        basePrompt = `
        You are a professional quantity surveyor. Your task is to create a final, detailed construction project report and present it as a single, complete HTML document string.

        You are given three inputs:
        1.  The Finalized Project Scope.
        2.  RECENT CONVERSATION HISTORY (This provides crucial context and may contain user-directed modifications or clarifications that supersede the initial scope. If there are discrepancies, prioritize information from this recent history).
        3.  A list of relevant HSR (Haryana Schedule of Rates) items with their official descriptions, units, and rates.

        CRITICAL INSTRUCTIONS:
        Your entire output must be a single string of well-formed, professional HTML. Use inline CSS for styling. The main title should be "Detailed Project Estimate Report". The report MUST be structured in the following three parts:

        **PART 1: DETAILED CALCULATIONS**
        For EACH Component/Subcomponent in the project scope, create a separate, wide-format table. These tables should be suitable for landscape view. Each table must have the following columns:
        1.  **HSR No.**: The matching HSR number. If no HSR item is suitable, use 'NS' (Non-Scheduled).
        2.  **HSR Description complete**: The full description from the provided HSR data. For NS items, leave this blank.
        3.  **Item Description**: The description of the item from the project scope.
        4.  **Calculation for Quantity**: A detailed, step-by-step calculation (e.g., L x B x H = Quantity) showing exactly how you derived the quantity for this specific item.
        5.  **Quantity**: The final calculated quantity.
        6.  **Unit**: The unit for the quantity.

        **PART 2: DETAIL OF QUANTITY (Consolidated Table)**
        Create a consolidated table titled "Detail of Quantity". This table must have the following columns:
        1.  **Sr. No.**: Serial Number.
        2.  **HSR No or NS 1, 2, 3 etc**: The HSR number or a unique 'NS' identifier for Non-Scheduled items.
        3.  **HSR Description**: The description from the HSR data.
        4.  **Component/Subcomponent/item description**: The specific item description from the scope.
        5.  **Quantity of this Item**: The quantity for that specific line item.
        6.  **Unit**: The unit.
        
        **IMPORTANT RULES FOR THIS TABLE:**
        - All items related to the SAME HSR No. must be grouped together.
        - After each group of items for a specific HSR No., add a sub-total row showing the total quantity for that HSR No.
        - Sort all HSR items in ascending order based on the 'HSR No.'.
        - All Non-Scheduled (NS) items should be listed at the end of the table.

        **PART 3: ABSTRACT OF COST**
        Create a final table titled "Abstract of Cost". This table summarizes the costs based on the consolidated quantities from Part 2. It must have these columns:
        1.  **Sr. No.**: Serial Number (matching the HSR item groups from Part 2).
        2.  **HSR Description**: The HSR item description.
        3.  **Unit**: The unit from HSR data.
        4.  **Quantity**: The TOTAL consolidated quantity for that HSR item from Part 2.
        5.  **Rate**: The rate from the provided HSR data.
        6.  **Amount**: Calculated as (Quantity x Rate).
        
        At the bottom of this table, calculate and display the 'Grand Total' of the 'Amount' column.

        **DATA ADHERENCE:**
        - For each project 'Item', you MUST find the MOST SUITABLE matching item from the provided 'Approved HSR Items' JSON list. Use the provided HSR data ONLY. Do not invent rates or units.
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

        Produce the complete HTML report now. Do not include any introductory text, markdown, or comments outside of the HTML itself.
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
            console.error("Error generating HTML estimate from Gemini: Model returned no text.", response);
            const finishReason = response.candidates?.[0]?.finishReason;
            let errorMessage = "Failed to generate the final estimate. The model returned an empty or invalid response.";
            if (finishReason && finishReason !== 'STOP') {
                errorMessage += ` Reason: ${finishReason}. The response may have been blocked due to safety settings or other reasons.`;
            }
            throw new Error(errorMessage);
        }
        
        const htmlMatch = responseText.match(/```html\n([\s\S]*?)\n```/s);
        return htmlMatch ? htmlMatch[1].trim() : responseText.trim();
    } catch (error: any) {
        console.error("Error generating HTML estimate from Gemini:", error);
        throw new Error(`Failed to generate the final estimate. The model might be overloaded or the request is invalid. Details: ${error.message}`);
    }
};
