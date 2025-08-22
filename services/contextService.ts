import { ContextState, ContextItem, ProcessSummary, StepSummary } from '../types';

export class ContextService {
  private static readonly CONTEXT_KEY = 'hsr-context-state';
  private static readonly MAX_CONTEXT_ITEMS = 20;
  private static readonly MAX_SUMMARY_LENGTH = 500;

  // Initialize context for a new project
  static initializeContext(projectDescription: string): void {
    const summary: ProcessSummary = {
      id: this.generateId(),
      projectDescription: projectDescription.substring(0, 200),
      stepSummaries: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const contextState: ContextState = {
      summary,
      activeContextItems: [],
      compactSummary: projectDescription.substring(0, 100)
    };

    this.saveContext(contextState);
  }

  // Get current context state
  static getCurrentContext(): ContextState | null {
    try {
      const stored = localStorage.getItem(this.CONTEXT_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        summary: {
          ...parsed.summary,
          createdAt: new Date(parsed.summary.createdAt),
          updatedAt: new Date(parsed.summary.updatedAt),
          stepSummaries: parsed.summary.stepSummaries.map((step: any) => ({
            ...step,
            timestamp: new Date(step.timestamp),
            contextItems: step.contextItems.map((item: any) => ({
              ...item,
              createdAt: new Date(item.createdAt)
            }))
          }))
        },
        activeContextItems: parsed.activeContextItems.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt)
        }))
      };
    } catch (error) {
      console.error('Error loading context:', error);
      return null;
    }
  }

  // Add a step summary to the context
  static addStepSummary(step: string, summary: string, llmSummary?: string): void {
    const context = this.getCurrentContext();
    if (!context) return;

    const stepSummary: StepSummary = {
      step,
      timestamp: new Date(),
      summary: summary.substring(0, this.MAX_SUMMARY_LENGTH),
      llmSummary: llmSummary?.substring(0, 200),
      contextItems: []
    };

    context.summary.stepSummaries.push(stepSummary);
    context.summary.updatedAt = new Date();

    // Update compact summary
    context.compactSummary = this.generateCompactSummary(context.summary);

    this.saveContext(context);
  }

  // Add a context item
  static addContextItem(
    type: ContextItem['type'],
    title: string,
    content: string,
    includeInContext: boolean = true
  ): void {
    const context = this.getCurrentContext();
    if (!context) return;

    const contextItem: ContextItem = {
      id: this.generateId(),
      type,
      title: title.substring(0, 100),
      content: content.substring(0, 2000),
      includeInContext,
      createdAt: new Date()
    };

    context.activeContextItems.unshift(contextItem);

    // Limit the number of context items
    if (context.activeContextItems.length > this.MAX_CONTEXT_ITEMS) {
      context.activeContextItems = context.activeContextItems.slice(0, this.MAX_CONTEXT_ITEMS);
    }

    this.saveContext(context);
  }

  // Toggle context item inclusion
  static toggleContextItem(itemId: string): void {
    const context = this.getCurrentContext();
    if (!context) return;

    const item = context.activeContextItems.find(item => item.id === itemId);
    if (item) {
      item.includeInContext = !item.includeInContext;
      this.saveContext(context);
    }
  }

  // Generate context prompt for LLM
  static generateContextPrompt(): string {
    const context = this.getCurrentContext();
    if (!context) return '';

    const activeItems = context.activeContextItems.filter(item => item.includeInContext);
    if (activeItems.length === 0) return '';

    let prompt = '\n\n--- PROJECT CONTEXT ---\n';
    prompt += `Project: ${context.compactSummary}\n\n`;

    // Add recent step summaries
    const recentSteps = context.summary.stepSummaries.slice(-3);
    if (recentSteps.length > 0) {
      prompt += 'Recent Progress:\n';
      recentSteps.forEach(step => {
        prompt += `- ${step.step}: ${step.summary}\n`;
        if (step.llmSummary) {
          prompt += `  AI Summary: ${step.llmSummary}\n`;
        }
      });
      prompt += '\n';
    }

    // Add active context items
    if (activeItems.length > 0) {
      prompt += 'Relevant Context:\n';
      activeItems.slice(0, 5).forEach(item => {
        prompt += `- ${item.type.toUpperCase()}: ${item.title}\n`;
        prompt += `  ${item.content.substring(0, 300)}\n\n`;
      });
    }

    prompt += '--- END CONTEXT ---\n\n';
    return prompt;
  }

  // Add discussion to context
  static addDiscussionToContext(userMessage: string, includeInContext: boolean = true): void {
    this.addContextItem(
      'discussion',
      `Discussion: ${userMessage.substring(0, 50)}...`,
      userMessage,
      includeInContext
    );
  }

  // Extract LLM summary from response
  static extractLLMSummary(response: string): string {
    // Look for summary patterns in the response
    const summaryPatterns = [
      /Summary:\s*(.+?)(?:\n|$)/i,
      /In summary,?\s*(.+?)(?:\n|$)/i,
      /To summarize,?\s*(.+?)(?:\n|$)/i
    ];

    for (const pattern of summaryPatterns) {
      const match = response.match(pattern);
      if (match) {
        return match[1].trim().substring(0, 200);
      }
    }

    // Fallback: use first sentence or first 200 characters
    const firstSentence = response.split(/[.!?]/)[0];
    return firstSentence.length > 10 && firstSentence.length < 200 
      ? firstSentence.trim()
      : response.substring(0, 200).trim();
  }

  // Generate compact summary
  private static generateCompactSummary(summary: ProcessSummary): string {
    let compact = summary.projectDescription;

    if (summary.stepSummaries.length > 0) {
      const latestStep = summary.stepSummaries[summary.stepSummaries.length - 1];
      compact += ` | Latest: ${latestStep.step} - ${latestStep.summary.substring(0, 100)}`;
    }

    return compact.substring(0, this.MAX_SUMMARY_LENGTH);
  }

  // Save context to localStorage
  private static saveContext(context: ContextState): void {
    try {
      localStorage.setItem(this.CONTEXT_KEY, JSON.stringify(context));
    } catch (error) {
      console.error('Error saving context:', error);
    }
  }

  // Clear all context
  static clearContext(): void {
    localStorage.removeItem(this.CONTEXT_KEY);
  }

  // Generate unique ID
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get context statistics
  static getContextStats(): {
    totalItems: number;
    activeItems: number;
    stepCount: number;
    lastUpdated: Date | null;
  } {
    const context = this.getCurrentContext();
    if (!context) {
      return {
        totalItems: 0,
        activeItems: 0,
        stepCount: 0,
        lastUpdated: null
      };
    }

    return {
      totalItems: context.activeContextItems.length,
      activeItems: context.activeContextItems.filter(item => item.includeInContext).length,
      stepCount: context.summary.stepSummaries.length,
      lastUpdated: context.summary.updatedAt
    };
  }

  // Export context data
  static exportContext(): string {
    const context = this.getCurrentContext();
    return JSON.stringify(context, null, 2);
  }

  // Import context data
  static importContext(jsonData: string): void {
    try {
      const context = JSON.parse(jsonData);
      this.saveContext(context);
    } catch (error) {
      console.error('Error importing context:', error);
      throw new Error('Invalid context data format');
    }
  }
}
