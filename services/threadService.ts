import { ConversationThread, ChatMessage, OutputMode } from '../types';

export class ThreadService {
  private static readonly STORAGE_KEY = 'hsr-conversation-threads';

  static saveThreads(threads: ConversationThread[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(threads));
    } catch (error) {
      console.error('Failed to save threads:', error);
    }
  }

  static loadThreads(): ConversationThread[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const threads = JSON.parse(stored);
      return threads.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to load threads:', error);
      return [];
    }
  }

  static createThread(mode: OutputMode, initialMessage?: ChatMessage): ConversationThread {
    const thread: ConversationThread = {
      id: this.generateId(),
      mode,
      messages: initialMessage ? [initialMessage] : [],
      summary: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const threads = this.loadThreads();
    threads.push(thread);
    this.saveThreads(threads);
    
    return thread;
  }

  static updateThread(threadId: string, updates: Partial<ConversationThread>): ConversationThread | null {
    const threads = this.loadThreads();
    const index = threads.findIndex(t => t.id === threadId);
    
    if (index === -1) return null;
    
    threads[index] = {
      ...threads[index],
      ...updates,
      updatedAt: new Date()
    };
    
    this.saveThreads(threads);
    return threads[index];
  }

  static addMessageToThread(threadId: string, message: ChatMessage): ConversationThread | null {
    const threads = this.loadThreads();
    const thread = threads.find(t => t.id === threadId);
    
    if (!thread) return null;
    
    thread.messages.push(message);
    thread.updatedAt = new Date();
    
    this.saveThreads(threads);
    return thread;
  }

  static getThread(threadId: string): ConversationThread | null {
    const threads = this.loadThreads();
    return threads.find(t => t.id === threadId) || null;
  }

  static getThreadsByMode(mode: OutputMode): ConversationThread[] {
    const threads = this.loadThreads();
    return threads.filter(t => t.mode === mode);
  }

  static deleteThread(threadId: string): boolean {
    const threads = this.loadThreads();
    const filtered = threads.filter(t => t.id !== threadId);
    
    if (filtered.length === threads.length) return false;
    
    this.saveThreads(filtered);
    return true;
  }

  static clearAllThreads(): void {
    this.saveThreads([]);
  }

  static getThreadSummary(threadId: string): string {
    const thread = this.getThread(threadId);
    if (!thread || thread.messages.length === 0) return '';
    
    if (thread.summary) return thread.summary;
    
    // Generate basic summary from messages
    const userMessages = thread.messages.filter(m => m.role === 'user');
    const modelMessages = thread.messages.filter(m => m.role === 'model');
    
    return `${thread.mode} thread with ${userMessages.length} user inputs and ${modelMessages.length} AI responses`;
  }

  static getRecentContext(mode: OutputMode, maxMessages: number = 10): ChatMessage[] {
    const threads = this.getThreadsByMode(mode);
    if (threads.length === 0) return [];
    
    // Get the most recent thread for this mode
    const recentThread = threads.sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    )[0];
    
    return recentThread.messages.slice(-maxMessages);
  }

  static getAllContextForMode(mode: OutputMode): string {
    const threads = this.getThreadsByMode(mode);
    if (threads.length === 0) return '';
    
    return threads.map(thread => {
      const summary = this.getThreadSummary(thread.id);
      const recentMessages = thread.messages.slice(-3).map(m => 
        `${m.role.toUpperCase()}: ${m.text}`
      ).join('\n');
      
      return `Thread Summary: ${summary}\nRecent Messages:\n${recentMessages}`;
    }).join('\n\n---\n\n');
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static exportThreads(): string {
    const threads = this.loadThreads();
    return JSON.stringify(threads, null, 2);
  }

  static importThreads(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) return false;
      
      const validThreads = imported.filter(t => 
        t.id && t.mode && Array.isArray(t.messages)
      );
      
      this.saveThreads(validThreads);
      return true;
    } catch (error) {
      console.error('Failed to import threads:', error);
      return false;
    }
  }
}
