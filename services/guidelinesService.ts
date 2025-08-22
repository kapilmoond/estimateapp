import { UserGuideline } from '../types';

export class GuidelinesService {
  private static readonly STORAGE_KEY = 'hsr-user-guidelines';

  static saveGuidelines(guidelines: UserGuideline[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(guidelines));
    } catch (error) {
      console.error('Failed to save guidelines:', error);
    }
  }

  static loadGuidelines(): UserGuideline[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return this.getDefaultGuidelines();
      
      const guidelines = JSON.parse(stored);
      return guidelines.map((g: any) => ({
        ...g,
        createdAt: new Date(g.createdAt),
        updatedAt: new Date(g.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to load guidelines:', error);
      return this.getDefaultGuidelines();
    }
  }

  static addGuideline(guideline: Omit<UserGuideline, 'id' | 'createdAt' | 'updatedAt'>): UserGuideline {
    const newGuideline: UserGuideline = {
      ...guideline,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const guidelines = this.loadGuidelines();
    guidelines.push(newGuideline);
    this.saveGuidelines(guidelines);
    
    return newGuideline;
  }

  static updateGuideline(id: string, updates: Partial<UserGuideline>): UserGuideline | null {
    const guidelines = this.loadGuidelines();
    const index = guidelines.findIndex(g => g.id === id);
    
    if (index === -1) return null;
    
    guidelines[index] = {
      ...guidelines[index],
      ...updates,
      updatedAt: new Date()
    };
    
    this.saveGuidelines(guidelines);
    return guidelines[index];
  }

  static deleteGuideline(id: string): boolean {
    const guidelines = this.loadGuidelines();
    const filtered = guidelines.filter(g => g.id !== id);
    
    if (filtered.length === guidelines.length) return false;
    
    this.saveGuidelines(filtered);
    return true;
  }

  static getActiveGuidelines(category?: string): UserGuideline[] {
    const guidelines = this.loadGuidelines();
    return guidelines.filter(g => 
      g.isActive && (!category || g.category === category)
    );
  }

  static formatGuidelinesForPrompt(guidelines: UserGuideline[]): string {
    if (guidelines.length === 0) return '';
    
    const formatted = guidelines.map(g => 
      `**${g.title}** (${g.category}): ${g.content}`
    ).join('\n');
    
    return `\n\n**USER-DEFINED GUIDELINES:**\nThe user has provided the following guidelines that must be followed:\n${formatted}\n`;
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static getDefaultGuidelines(): UserGuideline[] {
    return [
      {
        id: 'default-1',
        title: 'Safety First',
        content: 'Always prioritize safety considerations in all design and estimation decisions',
        category: 'general',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'default-2',
        title: 'Code Compliance',
        content: 'Ensure all designs comply with relevant Indian building codes and standards',
        category: 'design',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'default-3',
        title: 'Material Quality',
        content: 'Specify standard quality materials unless premium quality is explicitly required',
        category: 'estimation',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  static exportGuidelines(): string {
    const guidelines = this.loadGuidelines();
    return JSON.stringify(guidelines, null, 2);
  }

  static importGuidelines(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) return false;
      
      const validGuidelines = imported.filter(g => 
        g.id && g.title && g.content && g.category
      );
      
      this.saveGuidelines(validGuidelines);
      return true;
    } catch (error) {
      console.error('Failed to import guidelines:', error);
      return false;
    }
  }
}
