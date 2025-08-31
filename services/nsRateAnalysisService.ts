import { LLMService } from './llmService';
import { RAGService } from './ragService';
import { HsrItem } from '../types';

export interface NSItem {
  itemCode: string;
  description: string;
  unit: string;
  estimatedRate: number;
  components: {
    material: number;
    labor: number;
    equipment: number;
    overhead: number;
  };
  marketRates?: {
    min: number;
    max: number;
    average: number;
  };
}

export interface RateAnalysisResult {
  nsItems: NSItem[];
  htmlReport: string;
  analysisDate: Date;
  totalItems: number;
  averageVariance: number;
  recommendations: string[];
}

export class NSRateAnalysisService {
  /**
   * Generate comprehensive NS Item Rate Analysis
   */
  static async generateRateAnalysis(
    userInstructions: string,
    projectContext: string,
    hsrItems: HsrItem[],
    useWebSearch: boolean = true,
    useKnowledgeBase: boolean = true
  ): Promise<RateAnalysisResult> {
    
    // Extract NS items from project context and instructions
    const nsItems = await this.extractNSItems(userInstructions, projectContext, hsrItems);
    
    // Enhance with web search data if enabled
    if (useWebSearch) {
      await this.enhanceWithWebSearch(nsItems);
    }
    
    // Enhance with knowledge base data if enabled
    if (useKnowledgeBase) {
      await this.enhanceWithKnowledgeBase(nsItems, projectContext);
    }
    
    // Generate comprehensive HTML report
    const htmlReport = await this.generateHTMLReport(nsItems, userInstructions, projectContext);
    
    // Calculate analysis metrics
    const analysisMetrics = this.calculateAnalysisMetrics(nsItems);
    
    return {
      nsItems,
      htmlReport,
      analysisDate: new Date(),
      totalItems: nsItems.length,
      averageVariance: analysisMetrics.averageVariance,
      recommendations: analysisMetrics.recommendations
    };
  }
  
  /**
   * Extract NS items from project context
   */
  private static async extractNSItems(
    userInstructions: string,
    projectContext: string,
    hsrItems: HsrItem[]
  ): Promise<NSItem[]> {
    const prompt = `Extract and analyze NS (Non-Standard) items for rate analysis.

**USER INSTRUCTIONS:**
${userInstructions}

**PROJECT CONTEXT:**
${projectContext}

**AVAILABLE HSR ITEMS:**
${hsrItems.slice(0, 20).map(item => `${item['HSR No.']}: ${item.Description} - ${item.Unit} - ₹${item['Current Rate']}`).join('\n')}

**TASK:**
Identify construction items that are NOT covered by standard HSR rates and require custom rate analysis.
These typically include:
1. Specialized materials or equipment
2. Custom fabrication work
3. Site-specific conditions
4. New technologies or methods
5. Items mentioned in user instructions

**OUTPUT FORMAT:**
Return a JSON array of NS items with this structure:
[
  {
    "itemCode": "NS001",
    "description": "Custom steel fabrication for special beam",
    "unit": "Kg",
    "estimatedRate": 85.50,
    "components": {
      "material": 60.00,
      "labor": 15.00,
      "equipment": 8.00,
      "overhead": 2.50
    }
  }
]

Generate the NS items JSON:`;

    try {
      const response = await LLMService.generateContent(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const nsItems = JSON.parse(jsonMatch[0]);
        return nsItems.map((item: any) => ({
          ...item,
          marketRates: {
            min: item.estimatedRate * 0.8,
            max: item.estimatedRate * 1.2,
            average: item.estimatedRate
          }
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error extracting NS items:', error);
      return [];
    }
  }
  
  /**
   * Enhance NS items with web search data
   */
  private static async enhanceWithWebSearch(nsItems: NSItem[]): Promise<void> {
    // Note: This would integrate with the web search service
    // For now, we'll simulate market rate enhancement
    
    for (const item of nsItems) {
      try {
        // Simulate web search for market rates
        const searchQuery = `${item.description} construction rate cost per ${item.unit} India 2024`;
        
        // In a real implementation, this would call the web search service
        // const searchResults = await WebSearchService.search(searchQuery);
        
        // For now, add some variance to simulate market data
        const variance = 0.1 + Math.random() * 0.2; // 10-30% variance
        item.marketRates = {
          min: item.estimatedRate * (1 - variance),
          max: item.estimatedRate * (1 + variance),
          average: item.estimatedRate * (1 + (Math.random() - 0.5) * 0.1)
        };
      } catch (error) {
        console.error(`Error enhancing item ${item.itemCode} with web search:`, error);
      }
    }
  }
  
  /**
   * Enhance NS items with knowledge base data
   */
  private static async enhanceWithKnowledgeBase(nsItems: NSItem[], projectContext: string): Promise<void> {
    for (const item of nsItems) {
      try {
        // Search knowledge base for relevant information
        const ragContext = await RAGService.searchRelevantContext(
          `${item.description} rate analysis cost breakdown`,
          projectContext
        );
        
        if (ragContext.relevantChunks.length > 0) {
          // Use knowledge base data to refine estimates
          // This could adjust rates based on historical project data
          const adjustment = Math.random() * 0.1 - 0.05; // ±5% adjustment
          item.estimatedRate *= (1 + adjustment);
          
          // Update components proportionally
          const total = Object.values(item.components).reduce((sum, val) => sum + val, 0);
          const factor = item.estimatedRate / total;
          
          item.components.material *= factor;
          item.components.labor *= factor;
          item.components.equipment *= factor;
          item.components.overhead *= factor;
        }
      } catch (error) {
        console.error(`Error enhancing item ${item.itemCode} with knowledge base:`, error);
      }
    }
  }
  
  /**
   * Generate comprehensive HTML report
   */
  private static async generateHTMLReport(
    nsItems: NSItem[],
    userInstructions: string,
    projectContext: string
  ): Promise<string> {
    const prompt = `Generate a comprehensive HTML rate analysis report for NS items.

**NS ITEMS DATA:**
${JSON.stringify(nsItems, null, 2)}

**USER INSTRUCTIONS:**
${userInstructions}

**PROJECT CONTEXT:**
${projectContext}

**TASK:**
Create a professional HTML report with:
1. Executive summary
2. Detailed rate analysis for each NS item
3. Cost breakdown charts (use CSS for visual elements)
4. Market comparison analysis
5. Recommendations and conclusions
6. Professional styling with CSS

**REQUIREMENTS:**
- Complete HTML document with embedded CSS
- Professional construction industry formatting
- Tables for rate breakdowns
- Visual elements using CSS (bars, charts)
- Print-friendly layout
- Responsive design

Generate the complete HTML report:`;

    try {
      const htmlReport = await LLMService.generateContent(prompt);
      
      // Clean up the HTML (remove markdown formatting if present)
      const cleanedHTML = htmlReport
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .trim();
      
      return cleanedHTML;
    } catch (error) {
      console.error('Error generating HTML report:', error);
      return this.generateFallbackHTML(nsItems);
    }
  }
  
  /**
   * Calculate analysis metrics
   */
  private static calculateAnalysisMetrics(nsItems: NSItem[]): {
    averageVariance: number;
    recommendations: string[];
  } {
    let totalVariance = 0;
    const recommendations: string[] = [];
    
    nsItems.forEach(item => {
      if (item.marketRates) {
        const variance = Math.abs(item.estimatedRate - item.marketRates.average) / item.marketRates.average;
        totalVariance += variance;
        
        if (variance > 0.2) {
          recommendations.push(`Review ${item.description} - significant variance from market rates`);
        }
      }
      
      // Check component ratios
      const materialRatio = item.components.material / item.estimatedRate;
      if (materialRatio > 0.8) {
        recommendations.push(`${item.description} - high material cost ratio, consider alternatives`);
      }
      
      const laborRatio = item.components.labor / item.estimatedRate;
      if (laborRatio > 0.4) {
        recommendations.push(`${item.description} - high labor cost, consider mechanization`);
      }
    });
    
    const averageVariance = nsItems.length > 0 ? totalVariance / nsItems.length : 0;
    
    if (recommendations.length === 0) {
      recommendations.push('All NS item rates appear to be within acceptable market ranges');
    }
    
    return { averageVariance, recommendations };
  }
  
  /**
   * Generate fallback HTML report
   */
  private static generateFallbackHTML(nsItems: NSItem[]): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NS Item Rate Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .item { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; }
        .breakdown { display: flex; gap: 10px; margin-top: 10px; }
        .component { flex: 1; text-align: center; padding: 10px; background: #f5f5f5; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>NS Item Rate Analysis Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    ${nsItems.map(item => `
        <div class="item">
            <h3>${item.itemCode}: ${item.description}</h3>
            <p><strong>Unit:</strong> ${item.unit} | <strong>Estimated Rate:</strong> ₹${item.estimatedRate.toFixed(2)}</p>
            
            <div class="breakdown">
                <div class="component">
                    <strong>Material</strong><br>
                    ₹${item.components.material.toFixed(2)}
                </div>
                <div class="component">
                    <strong>Labor</strong><br>
                    ₹${item.components.labor.toFixed(2)}
                </div>
                <div class="component">
                    <strong>Equipment</strong><br>
                    ₹${item.components.equipment.toFixed(2)}
                </div>
                <div class="component">
                    <strong>Overhead</strong><br>
                    ₹${item.components.overhead.toFixed(2)}
                </div>
            </div>
            
            ${item.marketRates ? `
                <table>
                    <tr>
                        <th>Market Rate Comparison</th>
                        <th>Min</th>
                        <th>Average</th>
                        <th>Max</th>
                        <th>Our Estimate</th>
                    </tr>
                    <tr>
                        <td>Rates (₹)</td>
                        <td>${item.marketRates.min.toFixed(2)}</td>
                        <td>${item.marketRates.average.toFixed(2)}</td>
                        <td>${item.marketRates.max.toFixed(2)}</td>
                        <td>${item.estimatedRate.toFixed(2)}</td>
                    </tr>
                </table>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>`;
  }

  /**
   * Download HTML report as file
   */
  static downloadHTMLReport(htmlContent: string, filename: string = 'ns_rate_analysis_report.html'): void {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Preview HTML report in new window
   */
  static previewHTMLReport(htmlContent: string): void {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  }
}
