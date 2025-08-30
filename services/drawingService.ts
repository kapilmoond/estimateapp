import { DrawingResult } from './ezdxfDrawingService';

export interface ProjectDrawing {
  id: string;
  projectId: string;
  title: string;
  description: string;
  specification: any; // LLM JSON specification
  generatedCode: string;
  result: DrawingResult;
  timestamp: number;
  settings?: any; // Drawing settings used
}

export class DrawingService {
  private static readonly STORAGE_KEY = 'hsr_project_drawings';

  /**
   * Save a drawing to localStorage
   */
  static saveDrawing(drawing: Omit<ProjectDrawing, 'id' | 'timestamp'>): ProjectDrawing {
    const drawings = this.loadAllDrawings();
    
    const newDrawing: ProjectDrawing = {
      ...drawing,
      id: this.generateId(),
      timestamp: Date.now()
    };
    
    drawings.push(newDrawing);
    this.saveAllDrawings(drawings);
    
    return newDrawing;
  }

  /**
   * Load all drawings from localStorage
   */
  static loadAllDrawings(): ProjectDrawing[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading drawings:', error);
    }
    return [];
  }

  /**
   * Load drawings for a specific project
   */
  static loadProjectDrawings(projectId: string): ProjectDrawing[] {
    const allDrawings = this.loadAllDrawings();
    return allDrawings.filter(drawing => drawing.projectId === projectId);
  }

  /**
   * Get the latest drawing for a project
   */
  static getLatestProjectDrawing(projectId: string): ProjectDrawing | null {
    const projectDrawings = this.loadProjectDrawings(projectId);
    if (projectDrawings.length === 0) return null;
    
    return projectDrawings.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * Update an existing drawing
   */
  static updateDrawing(updatedDrawing: ProjectDrawing): void {
    const drawings = this.loadAllDrawings();
    const index = drawings.findIndex(d => d.id === updatedDrawing.id);
    
    if (index !== -1) {
      drawings[index] = { ...updatedDrawing, timestamp: Date.now() };
      this.saveAllDrawings(drawings);
    }
  }

  /**
   * Delete a drawing
   */
  static deleteDrawing(drawingId: string): void {
    const drawings = this.loadAllDrawings();
    const filtered = drawings.filter(d => d.id !== drawingId);
    this.saveAllDrawings(filtered);
  }

  /**
   * Delete all drawings for a project
   */
  static deleteProjectDrawings(projectId: string): void {
    const drawings = this.loadAllDrawings();
    const filtered = drawings.filter(d => d.projectId !== projectId);
    this.saveAllDrawings(filtered);
  }

  /**
   * Get drawing by ID
   */
  static getDrawingById(drawingId: string): ProjectDrawing | null {
    const drawings = this.loadAllDrawings();
    return drawings.find(d => d.id === drawingId) || null;
  }

  /**
   * Get drawing statistics for a project
   */
  static getProjectDrawingStats(projectId: string): {
    totalDrawings: number;
    latestTimestamp: number;
    totalSize: number;
  } {
    const projectDrawings = this.loadProjectDrawings(projectId);
    
    return {
      totalDrawings: projectDrawings.length,
      latestTimestamp: projectDrawings.length > 0 
        ? Math.max(...projectDrawings.map(d => d.timestamp))
        : 0,
      totalSize: JSON.stringify(projectDrawings).length
    };
  }

  /**
   * Export project drawings as JSON
   */
  static exportProjectDrawings(projectId: string): void {
    const projectDrawings = this.loadProjectDrawings(projectId);
    
    const exportData = {
      projectId,
      exportTimestamp: Date.now(),
      drawings: projectDrawings
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `project_${projectId}_drawings.json`;
    link.click();
    
    URL.revokeObjectURL(link.href);
  }

  /**
   * Import project drawings from JSON
   */
  static async importProjectDrawings(file: File, targetProjectId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);
          
          if (!importData.drawings || !Array.isArray(importData.drawings)) {
            throw new Error('Invalid drawings file format');
          }
          
          const existingDrawings = this.loadAllDrawings();
          let importedCount = 0;
          
          importData.drawings.forEach((drawing: any) => {
            const newDrawing: ProjectDrawing = {
              ...drawing,
              id: this.generateId(), // Generate new ID
              projectId: targetProjectId, // Use target project ID
              timestamp: Date.now()
            };
            
            existingDrawings.push(newDrawing);
            importedCount++;
          });
          
          this.saveAllDrawings(existingDrawings);
          resolve(importedCount);
        } catch (error) {
          reject(new Error('Failed to import drawings: ' + (error as Error).message));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Clean up old drawings (keep only latest N per project)
   */
  static cleanupOldDrawings(maxPerProject: number = 10): number {
    const allDrawings = this.loadAllDrawings();
    const projectGroups = new Map<string, ProjectDrawing[]>();
    
    // Group by project
    allDrawings.forEach(drawing => {
      if (!projectGroups.has(drawing.projectId)) {
        projectGroups.set(drawing.projectId, []);
      }
      projectGroups.get(drawing.projectId)!.push(drawing);
    });
    
    const keptDrawings: ProjectDrawing[] = [];
    let removedCount = 0;
    
    // Keep only latest N drawings per project
    projectGroups.forEach(projectDrawings => {
      const sorted = projectDrawings.sort((a, b) => b.timestamp - a.timestamp);
      const toKeep = sorted.slice(0, maxPerProject);
      const toRemove = sorted.slice(maxPerProject);
      
      keptDrawings.push(...toKeep);
      removedCount += toRemove.length;
    });
    
    this.saveAllDrawings(keptDrawings);
    return removedCount;
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo(): {
    totalDrawings: number;
    totalSize: number;
    sizePerProject: { [projectId: string]: number };
  } {
    const allDrawings = this.loadAllDrawings();
    const sizePerProject: { [projectId: string]: number } = {};
    
    allDrawings.forEach(drawing => {
      const size = JSON.stringify(drawing).length;
      sizePerProject[drawing.projectId] = (sizePerProject[drawing.projectId] || 0) + size;
    });
    
    return {
      totalDrawings: allDrawings.length,
      totalSize: JSON.stringify(allDrawings).length,
      sizePerProject
    };
  }

  /**
   * Search drawings by title or description
   */
  static searchDrawings(query: string, projectId?: string): ProjectDrawing[] {
    const drawings = projectId 
      ? this.loadProjectDrawings(projectId)
      : this.loadAllDrawings();
    
    const lowerQuery = query.toLowerCase();
    
    return drawings.filter(drawing => 
      drawing.title.toLowerCase().includes(lowerQuery) ||
      drawing.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Private helper methods
   */
  private static saveAllDrawings(drawings: ProjectDrawing[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drawings));
    } catch (error) {
      console.error('Error saving drawings:', error);
      // Handle storage quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Clean up old drawings and try again
        const removedCount = this.cleanupOldDrawings(5);
        console.log(`Cleaned up ${removedCount} old drawings due to storage limit`);
        
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(drawings));
        } catch (retryError) {
          console.error('Failed to save drawings even after cleanup:', retryError);
        }
      }
    }
  }

  private static generateId(): string {
    return 'drawing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Validate drawing object
   */
  static validateDrawing(drawing: any): boolean {
    return (
      drawing &&
      typeof drawing.projectId === 'string' &&
      typeof drawing.title === 'string' &&
      typeof drawing.description === 'string' &&
      drawing.specification &&
      typeof drawing.generatedCode === 'string' &&
      drawing.result &&
      typeof drawing.timestamp === 'number'
    );
  }
}
