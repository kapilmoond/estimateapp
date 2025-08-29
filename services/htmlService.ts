import { ComponentDesign, ChatMessage } from '../types';
import { continueConversation } from './geminiService';

export class HTMLService {
  static async generateHTMLFromDesign(
    design: ComponentDesign,
    htmlInstruction: string,
    projectScope: string,
    guidelines: string,
    referenceText: string
  ): Promise<string> {
    const prompt = `Generate a professional HTML document for the component design.

**COMPONENT DESIGN TO CONVERT:**
Component: ${design.componentName}
Created: ${new Date(design.createdAt).toLocaleString()}

**DESIGN CONTENT:**
${design.designContent}

**SPECIFICATIONS:**
Materials: ${design.specifications.materials.join(', ')}
Dimensions: ${JSON.stringify(design.specifications.dimensions)}
Calculations: ${design.specifications.calculations}

**USER HTML INSTRUCTIONS:**
${htmlInstruction || 'Create a professional, well-formatted HTML document suitable for printing and sharing.'}

**PROJECT CONTEXT:**
Project Scope: ${projectScope}

**DESIGN GUIDELINES:**
${guidelines}

**REFERENCE DOCUMENTS:**
${referenceText}

**HTML GENERATION REQUIREMENTS:**
1. Create a complete, standalone HTML document
2. Include proper DOCTYPE, head, and body sections
3. Add professional CSS styling for print and screen
4. Use semantic HTML structure with proper headings
5. Include a professional header with component name and date
6. Format the design content with proper typography
7. Create organized sections for specifications, materials, dimensions
8. Add a footer with generation timestamp
9. Ensure the document is printer-friendly
10. Use professional colors and fonts
11. Include responsive design for different screen sizes
12. Add proper spacing and margins for readability

**OUTPUT FORMAT:**
Generate a complete HTML document that includes:
- Professional document header
- Well-formatted design content with proper headings
- Organized specifications in tables or lists
- Material list with proper formatting
- Dimensions clearly displayed
- Calculations section if applicable
- Professional styling with CSS
- Print-friendly layout
- Company/project branding placeholders

**STYLING REQUIREMENTS:**
- Use professional fonts (Arial, Helvetica, sans-serif)
- Professional color scheme (blues, grays, whites)
- Proper spacing and margins
- Clear section divisions
- Print-friendly CSS media queries
- Responsive design elements

Focus on creating a professional, comprehensive HTML document that can be used for presentations, documentation, and official project records.

IMPORTANT: Return ONLY the HTML content without any markdown formatting or code blocks. Start directly with <!DOCTYPE html>.`;

    try {
      console.log('HTML Service: Generating HTML for component:', design.componentName);

      // Create a conversation history for the HTML generation request
      const htmlHistory: ChatMessage[] = [
        { role: 'user', text: prompt }
      ];

      // Use the unified LLM service through continueConversation
      const htmlContent = await continueConversation(htmlHistory, referenceText, 'design');
      
      if (!htmlContent || htmlContent.trim().length < 100) {
        throw new Error('Generated HTML content is too short or empty. Please try again.');
      }

      // Clean up the HTML content - remove markdown code blocks if present
      let cleanedHTML = htmlContent.trim();
      
      // Remove markdown code blocks
      cleanedHTML = cleanedHTML.replace(/```html\s*/g, '');
      cleanedHTML = cleanedHTML.replace(/```\s*$/g, '');
      cleanedHTML = cleanedHTML.replace(/^```\s*/g, '');
      
      // Ensure it starts with DOCTYPE
      if (!cleanedHTML.toLowerCase().includes('<!doctype')) {
        cleanedHTML = '<!DOCTYPE html>\n' + cleanedHTML;
      }

      console.log('HTML Service: Generated HTML length:', cleanedHTML.length);
      return cleanedHTML;
    } catch (error) {
      console.error('HTML Service Error:', error);
      throw new Error(`Failed to generate HTML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static downloadHTML(htmlContent: string, filename: string): void {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static previewHTML(htmlContent: string): void {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  }
}
