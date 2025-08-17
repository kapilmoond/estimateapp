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

export const analyzePdfImages = async (base64Images: string[]): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `You are an expert construction estimator. The following images are pages from a construction project document, which may include drawings, tables, and technical specifications. Analyze all pages and provide a detailed, combined text summary of the entire document. Extract all relevant details, dimensions, materials, quantities, and the full scope of work that would be required to create a comprehensive construction cost estimate. Structure the output clearly.`;

  const textPart = { text: prompt };

  const imageParts = base64Images.map(imgData => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: imgData,
    },
  }));
  
  const contents = { parts: [textPart, ...imageParts] };

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
    });
    return response.text;
  } catch (error) {
    console.error("Error analyzing PDF images with Gemini:", error);
    throw new Error("Failed to analyze the PDF document. The model might be overloaded or the request is invalid.");
  }
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
6. Guide the user until all necessary details for a complete estimate are finalized. The final output of this conversation should be a comprehensive, structured list of all components, sub-components, and items with their finalized specifications.`;

    const systemInstruction = createPromptWithReference(baseSystemInstruction, referenceText);

    // Convert ChatMessage[] to the format expected by the API
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


export const generateKeywordsForItems = async (finalizedScope: string, userInstruction: string, referenceText?: string): Promise<KeywordsByItem> => {
    const ai = getAiClient();
    const basePrompt = `
        You are an expert system that extracts keywords for database searching.

        INPUT 1: Finalized Project Scope:
        \`\`\`
        ${finalizedScope}
        \`\`\`

        INPUT 2: User Instructions for Keyword Generation:
        \`\`\`
        ${userInstruction || 'No specific instructions provided.'}
        \`\`\`

        TASK:
        Based on the finalized project scope (INPUT 1) and the user's instructions (INPUT 2), your task is to generate relevant search keywords for EACH specific construction 'Item' listed in the scope. You must process the items sequentially, starting from the first component, its sub-components, and their items, before moving to the next component. This ensures all parts of the project receive equal attention.

        Instructions:
        1.  Carefully analyze each 'Item' description from the project scope in a sequential order.
        2.  Apply the user's instructions to refine your keyword generation process.
        3.  For each item, create a comprehensive list of at least 5-7 concise and varied **single-word** keywords that describe the core activity, materials, and context. Each keyword in the list MUST be a single word. Do not use multi-word phrases. Include synonyms where appropriate (e.g., 'excavation', 'digging', 'earthwork'). The more relevant keywords you provide, the better the search results will be. Focus on nouns and verbs.
        4.  Do NOT include dimensions, quantities, or project-specific details.
        5.  The output MUST be a valid JSON object. The keys of the object should be the full 'Item' descriptions from the scope, and the values should be an array of the keywords you generated for that item.
        6.  Your entire response MUST be only the raw JSON object, without any markdown formatting (like \`\`\`json), comments, or introductory text.
    `;
    
    const prompt = createPromptWithReference(basePrompt, referenceText);

    let rawResponseText = '';
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });
        
        rawResponseText = response.text.trim();
        let jsonStringToParse = rawResponseText;
        
        // The model might wrap the JSON in a markdown code block. Extract it.
        const jsonMatch = jsonStringToParse.match(/```json\n([\s\S]*?)\n```/s);
        if (jsonMatch && jsonMatch[1]) {
            jsonStringToParse = jsonMatch[1].trim();
        }

        // The model sometimes returns multiple JSON objects concatenated.
        // We find the first valid JSON object by balancing braces.
        const firstBraceIndex = jsonStringToParse.indexOf('{');
        if (firstBraceIndex !== -1) {
            let openBraces = 0;
            let lastBraceIndex = -1;
            for (let i = firstBraceIndex; i < jsonStringToParse.length; i++) {
                if (jsonStringToParse[i] === '{') {
                    openBraces++;
                } else if (jsonStringToParse[i] === '}') {
                    openBraces--;
                }
                if (openBraces === 0) {
                    lastBraceIndex = i;
                    break; // Found the end of the first complete JSON object
                }
            }

            if (lastBraceIndex !== -1) {
                jsonStringToParse = jsonStringToParse.substring(firstBraceIndex, lastBraceIndex + 1);
            }
        }
        
        // Attempt to fix common JSON errors like trailing commas in arrays or objects.
        jsonStringToParse = jsonStringToParse.replace(/,\s*([\]}])/g, '$1');

        const parsed: KeywordsByItem = JSON.parse(jsonStringToParse);
        return parsed || {};
    } catch (error) {
        console.error("Error generating keywords from Gemini:", error);
        console.error("Raw response text that failed to parse:", rawResponseText); // Log the original response
        throw new Error("Failed to generate keywords. The model might be overloaded or the request is invalid.");
    }
};


export const generateHtmlEstimate = async (finalizedScope: string, hsrItems: HsrItem[], previousHtml?: string, editInstruction?: string, referenceText?: string): Promise<string> => {
    const ai = getAiClient();
    const hsrItemsString = JSON.stringify(hsrItems, null, 2);

    let basePrompt: string;

    if (previousHtml && editInstruction) {
        // Editing prompt
        basePrompt = `
        You are a professional quantity surveyor tasked with editing a detailed construction project report.

        You are given four inputs:
        1. The ORIGINAL Finalized Project Scope.
        2. The list of relevant HSR (Haryana Schedule of Rates) items that have already been approved.
        3. The PREVIOUSLY GENERATED HTML REPORT that now needs modification.
        4. A set of USER INSTRUCTIONS detailing the required changes.

        CRITICAL INSTRUCTIONS:
        1.  **Primary Goal:** Your task is to REVISE the 'PREVIOUSLY GENERATED HTML REPORT' according to the 'USER INSTRUCTIONS'.
        2.  **Data Integrity:** All calculations for quantities and costs MUST continue to be derived ONLY from the 'ORIGINAL Finalized Project Scope' and the 'Approved HSR Items'. DO NOT invent new data or use external knowledge. The user's instructions are for formatting, wording, or re-organization, not for changing the core cost data unless it's a correction based on the provided scope.
        3.  **Output Format:** The entire output must be a single string of the COMPLETE, REVISED, well-formed HTML report. Do not provide explanations, comments, or just snippets of the changed parts. Output the full, ready-to-display HTML.
        4.  **Maintain Structure:** Unless the user explicitly asks to change the structure, maintain the existing professional format (Component-wise breakdown, tables, etc.).

        INPUT 1: ORIGINAL Finalized Project Scope:
        \`\`\`
        ${finalizedScope}
        \`\`\`

        INPUT 2: Approved HSR Items (JSON):
        \`\`\`json
        ${hsrItemsString}
        \`\`\`

        INPUT 3: PREVIOUSLY GENERATED HTML REPORT:
        \`\`\`html
        ${previousHtml}
        \`\`\`

        INPUT 4: USER INSTRUCTIONS FOR EDITING:
        \`\`\`
        ${editInstruction}
        \`\`\`

        Produce the complete, revised HTML report now. Do not include any introductory text, markdown, or comments outside of the HTML itself.
        `;
    } else {
        // Initial generation prompt
        basePrompt = `
        You are a professional quantity surveyor. Your task is to create a final, detailed construction project report and present it as a single, complete HTML document string.

        You are given two inputs:
        1. The Finalized Project Scope, which includes all components, sub-components, items, and their specifications.
        2. A list of relevant HSR (Haryana Schedule of Rates) items with their official descriptions, units, and rates, which have been found based on keywords.

        CRITICAL INSTRUCTIONS:
        1.  **Report Structure:** The entire output must be a single string of well-formed, professional HTML. Use inline CSS for styling. The main title should be "Detailed Project Estimate Report". Structure the report by 'Component' from the project scope.
        2.  **Item-by-Item Analysis:** For EACH 'Item' listed in the Finalized Project Scope, you must create a detailed breakdown.
        3.  **Strict Data Adherence:** For each project 'Item', you MUST find the MOST SUITABLE matching item from the provided 'Approved HSR Items' JSON list. You are strictly forbidden from using any external knowledge or web search for HSR items, descriptions, or rates. Use the provided HSR data ONLY.
        4.  **Detailed Output per Item:** For each project 'Item', you must clearly present the following in a structured table or section:
            a.  **Project Item Details:** The description, dimensions, and specifications of the item as given in the 'Finalized Project Scope'.
            b.  **Quantity Calculation:** A detailed, step-by-step calculation (e.g., L x B x H = Quantity) showing exactly how you derived the quantity for the item from its specifications.
            c.  **Matched HSR Item:** The corresponding HSR Item you've selected from the provided JSON. You must display its "HSR No.", "Description", "Unit", and "Current Rate" exactly as they appear in the JSON.
            d.  **Cost Calculation:** The final cost for that item (Calculated Quantity x HSR Current Rate).
        5.  **Professional Formatting:** Use HTML tables ('<table>', '<thead>', '<tbody>', '<tr>', '<th>', '<td>') for presenting the item-wise breakdown. Make the report clean, well-organized, and easy to read.

        INPUT 1: Finalized Project Scope:
        \`\`\`
        ${finalizedScope}
        \`\`\`

        INPUT 2: Approved HSR Items (JSON):
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
        // The model might wrap the HTML in markdown, so we need to extract it.
        const responseText = response.text;
        const htmlMatch = responseText.match(/```html\n([\s\S]*?)\n```/s);
        return htmlMatch ? htmlMatch[1].trim() : responseText.trim();
    } catch (error) {
        console.error("Error generating HTML estimate from Gemini:", error);
        throw new Error("Failed to generate the final estimate. The model might be overloaded or the request is invalid.");
    }
};