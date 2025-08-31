import { LLMService } from './llmService';
import { searchHSREnhanced } from './hsrService';
import { KeywordGenerationService, KeywordSet } from './keywordGenerationService';
import { HsrItem } from '../types';

export interface BackgroundHSRProgress {
  stage: 'idle' | 'generating_keywords' | 'searching_hsr' | 'processing_results' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  currentStep?: string;
  estimatedTimeRemaining?: number;
}

export interface BackgroundHSRResult {
  keywords: string[];
  hsrItems: HsrItem[];
  processingTime: number;
  success: boolean;
  error?: string;
}

export type ProgressCallback = (progress: BackgroundHSRProgress) => void;

export class BackgroundHSRService {
  private static activeProcesses = new Map<string, boolean>();
  
  /**
   * Process HSR search in background with progress updates
   */
  static async processHSRInBackground(
    userInstructions: string,
    projectScope: string,
    onProgress: ProgressCallback
  ): Promise<BackgroundHSRResult> {
    const processId = Date.now().toString();
    this.activeProcesses.set(processId, true);
    
    const startTime = Date.now();
    
    try {
      // Stage 1: Generate Keywords
      onProgress({
        stage: 'generating_keywords',
        progress: 10,
        message: 'Analyzing instructions and generating keywords...',
        currentStep: 'Keyword Generation',
        estimatedTimeRemaining: 15000
      });
      
      const keywords = await this.generateKeywordsFromInstructions(
        userInstructions,
        projectScope,
        (progress) => {
          onProgress({
            stage: 'generating_keywords',
            progress: 10 + (progress * 0.3), // 10-40%
            message: 'Generating optimized keywords...',
            currentStep: 'Keyword Generation'
          });
        }
      );
      
      if (!this.activeProcesses.get(processId)) {
        throw new Error('Process cancelled');
      }
      
      // Stage 2: Search HSR Database
      onProgress({
        stage: 'searching_hsr',
        progress: 45,
        message: 'Searching HSR database with generated keywords...',
        currentStep: 'HSR Database Search',
        estimatedTimeRemaining: 10000
      });
      
      const hsrResults = await this.searchHSRWithProgress(
        keywords,
        (progress) => {
          onProgress({
            stage: 'searching_hsr',
            progress: 45 + (progress * 0.4), // 45-85%
            message: 'Processing HSR search results...',
            currentStep: 'HSR Database Search'
          });
        }
      );
      
      if (!this.activeProcesses.get(processId)) {
        throw new Error('Process cancelled');
      }
      
      // Stage 3: Process Results
      onProgress({
        stage: 'processing_results',
        progress: 90,
        message: 'Optimizing and ranking HSR results...',
        currentStep: 'Result Processing',
        estimatedTimeRemaining: 2000
      });
      
      const optimizedResults = await this.optimizeHSRResults(hsrResults.results);
      
      // Complete
      onProgress({
        stage: 'complete',
        progress: 100,
        message: 'HSR processing completed successfully!',
        currentStep: 'Complete'
      });
      
      const processingTime = Date.now() - startTime;
      
      return {
        keywords,
        hsrItems: optimizedResults,
        processingTime,
        success: true
      };
      
    } catch (error) {
      onProgress({
        stage: 'error',
        progress: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        currentStep: 'Error'
      });
      
      return {
        keywords: [],
        hsrItems: [],
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.activeProcesses.delete(processId);
    }
  }
  
  /**
   * Generate keywords from user instructions with progress
   */
  private static async generateKeywordsFromInstructions(
    instructions: string,
    projectScope: string,
    onProgress: (progress: number) => void
  ): Promise<string[]> {
    onProgress(0);
    
    const prompt = `Generate optimized keywords for HSR search based on user instructions.

**USER INSTRUCTIONS:**
${instructions}

**PROJECT SCOPE:**
${projectScope}

**TASK:**
Generate 8-12 single-word keywords that will find the most relevant HSR items for the user's requirements.
Focus on:
1. Work types mentioned in instructions
2. Materials and specifications
3. Construction methods
4. Technical requirements

**RULES:**
- Single words only
- Construction industry terms
- Include technical specifications (grades, ratios, sizes)
- Prioritize user instruction keywords

**OUTPUT:**
Return only keywords separated by commas.`;

    onProgress(30);
    
    const response = await LLMService.generateContent(prompt);
    
    onProgress(70);
    
    const keywords = response
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0 && !k.includes(' '))
      .slice(0, 12);
    
    onProgress(100);
    
    return keywords;
  }
  
  /**
   * Search HSR with progress tracking
   */
  private static async searchHSRWithProgress(
    keywords: string[],
    onProgress: (progress: number) => void
  ): Promise<{ results: HsrItem[]; stats: any }> {
    onProgress(0);
    
    // Create keyword sets for enhanced search
    const keywordSets: KeywordSet[] = [{
      itemDescription: 'Background HSR Search',
      keywords: keywords,
      generatedAt: Date.now()
    }];
    
    onProgress(30);
    
    const searchOptions = {
      maxResultsPerSet: 50,
      includePartialMatches: true,
      prioritizeExactMatches: true,
      includeHSRNumbers: true
    };
    
    onProgress(60);
    
    const results = searchHSREnhanced(keywordSets, searchOptions);
    
    onProgress(100);
    
    return results;
  }
  
  /**
   * Optimize HSR results for better relevance
   */
  private static async optimizeHSRResults(hsrItems: HsrItem[]): Promise<HsrItem[]> {
    // Sort by relevance and remove duplicates
    const uniqueItems = new Map<string, HsrItem>();
    
    hsrItems.forEach(item => {
      const key = item['HSR No.'];
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    });
    
    // Convert back to array and limit to top 100 results
    return Array.from(uniqueItems.values()).slice(0, 100);
  }
  
  /**
   * Cancel background process
   */
  static cancelProcess(processId: string): void {
    this.activeProcesses.set(processId, false);
  }
  
  /**
   * Check if any background processes are running
   */
  static hasActiveProcesses(): boolean {
    return this.activeProcesses.size > 0;
  }
  
  /**
   * Get estimated processing time based on complexity
   */
  static estimateProcessingTime(
    instructionLength: number,
    scopeLength: number
  ): number {
    // Base time: 10 seconds
    let estimatedTime = 10000;
    
    // Add time based on instruction complexity
    estimatedTime += Math.min(instructionLength * 50, 5000);
    
    // Add time based on scope complexity
    estimatedTime += Math.min(scopeLength * 10, 3000);
    
    return estimatedTime;
  }
  
  /**
   * Create progress indicator component data
   */
  static createProgressData(progress: BackgroundHSRProgress): {
    percentage: number;
    color: string;
    icon: string;
    title: string;
    subtitle: string;
  } {
    const stageConfig = {
      idle: { color: 'gray', icon: '⏳', title: 'Ready', subtitle: 'Waiting to start' },
      generating_keywords: { color: 'blue', icon: '🔑', title: 'Generating Keywords', subtitle: 'Analyzing requirements' },
      searching_hsr: { color: 'purple', icon: '🔍', title: 'Searching HSR', subtitle: 'Finding relevant items' },
      processing_results: { color: 'orange', icon: '⚙️', title: 'Processing Results', subtitle: 'Optimizing matches' },
      complete: { color: 'green', icon: '✅', title: 'Complete', subtitle: 'HSR data ready' },
      error: { color: 'red', icon: '❌', title: 'Error', subtitle: 'Processing failed' }
    };
    
    const config = stageConfig[progress.stage];
    
    return {
      percentage: progress.progress,
      color: config.color,
      icon: config.icon,
      title: config.title,
      subtitle: progress.message || config.subtitle
    };
  }
}
