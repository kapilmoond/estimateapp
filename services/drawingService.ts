import { DrawingResult } from './ezdxfDrawingService';
import { IndexedDBService } from './indexedDBService';

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
  includeInContext?: boolean; // Whether to include this drawing in LLM context
}

/**
 * Enhanced Drawing Service using IndexedDB for persistent storage
 */
export class EnhancedDrawingService {
  /**
   * Save a drawing to IndexedDB
   */
  static async saveDrawing(drawing: Omit<ProjectDrawing, 'id' | 'timestamp'>): Promise<ProjectDrawing> {
    const newDrawing: ProjectDrawing = {
      ...drawing,
      id: this.generateId(),
      timestamp: Date.now(),
      includeInContext: drawing.includeInContext ?? true,
    };

    await IndexedDBService.save('drawings', newDrawing);
    console.log('Drawing saved to IndexedDB:', newDrawing.id);
    return newDrawing;
  }

  /**
   * Load all drawings from IndexedDB
   */
  static async loadAllDrawings(): Promise<ProjectDrawing[]> {
    try {
      const drawings = await IndexedDBService.loadAll<ProjectDrawing>('drawings');
      return drawings.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error loading drawings from IndexedDB:', error);
      return [];
    }
  }

  /**
   * Load drawings for a specific project
   */
  static async loadProjectDrawings(projectId: string): Promise<ProjectDrawing[]> {
    const allDrawings = await this.loadAllDrawings();
    return allDrawings.filter(drawing => drawing.projectId === projectId);
  }

  /**
   * Delete a specific drawing
   */
  static async deleteDrawing(drawingId: string): Promise<boolean> {
    try {
      await IndexedDBService.delete('drawings', drawingId);
      console.log('Drawing deleted from IndexedDB:', drawingId);
      return true;
    } catch (error) {
      console.error('Error deleting drawing:', error);
      return false;
    }
  }

  /**
   * Delete all drawings for a project
   */
  static async deleteProjectDrawings(projectId: string): Promise<number> {
    const projectDrawings = await this.loadProjectDrawings(projectId);
    let deletedCount = 0;

    for (const drawing of projectDrawings) {
      const success = await this.deleteDrawing(drawing.id);
      if (success) deletedCount++;
    }

    console.log(`Deleted ${deletedCount} drawings for project ${projectId}`);
    return deletedCount;
  }

  /**
   * Update a drawing
   */
  static async updateDrawing(drawingId: string, updates: Partial<ProjectDrawing>): Promise<ProjectDrawing | null> {
    try {
      const existingDrawing = await IndexedDBService.load<ProjectDrawing>('drawings', drawingId);
      if (!existingDrawing) return null;

      const updatedDrawing = { ...existingDrawing, ...updates, timestamp: Date.now() };
      await IndexedDBService.save('drawings', updatedDrawing);

      console.log('Drawing updated in IndexedDB:', drawingId);
      return updatedDrawing;
    } catch (error) {
      console.error('Error updating drawing:', error);
      return null;
    }
  }

  /**
   * Get a specific drawing by ID
   */
  static async getDrawing(drawingId: string): Promise<ProjectDrawing | null> {
    try {
      return await IndexedDBService.load<ProjectDrawing>('drawings', drawingId);
    } catch (error) {
      console.error('Error getting drawing:', error);
      return null;
    }
  }

  /**
   * Clear all drawings (with confirmation)
   */
  static async clearAllDrawings(): Promise<number> {
    try {
      const allDrawings = await this.loadAllDrawings();
      const count = allDrawings.length;

      await IndexedDBService.clearStore('drawings');
      console.log(`Cleared ${count} drawings from IndexedDB`);
      return count;
    } catch (error) {
      console.error('Error clearing drawings:', error);
      return 0;
    }
  }

  /**
   * Get drawing statistics
   */
  static async getDrawingStats(): Promise<{
    totalDrawings: number;
    projectCounts: Record<string, number>;
    totalSize: number;
    oldestDrawing?: ProjectDrawing;
    newestDrawing?: ProjectDrawing;
  }> {
    const allDrawings = await this.loadAllDrawings();
    const projectCounts: Record<string, number> = {};

    allDrawings.forEach(drawing => {
      projectCounts[drawing.projectId] = (projectCounts[drawing.projectId] || 0) + 1;
    });

    const totalSize = JSON.stringify(allDrawings).length;
    const oldestDrawing = allDrawings.length > 0 ? allDrawings[allDrawings.length - 1] : undefined;
    const newestDrawing = allDrawings.length > 0 ? allDrawings[0] : undefined;

    return {
      totalDrawings: allDrawings.length,
      projectCounts,
      totalSize,
      oldestDrawing,
      newestDrawing
    };
  }

  /**
   * Migrate from localStorage to IndexedDB
   */
  static async migrateFromLocalStorage(): Promise<number> {
    try {
      // Check if there are drawings in localStorage
      const legacyDrawings = DrawingService.loadAllDrawings();
      if (legacyDrawings.length === 0) return 0;

      console.log(`Migrating ${legacyDrawings.length} drawings from localStorage to IndexedDB...`);

      let migratedCount = 0;
      for (const drawing of legacyDrawings) {
        try {
          await IndexedDBService.save('drawings', drawing);
          migratedCount++;
        } catch (error) {
          console.error('Error migrating drawing:', drawing.id, error);
        }
      }

      console.log(`Successfully migrated ${migratedCount} drawings to IndexedDB`);
      return migratedCount;
    } catch (error) {
      console.error('Error during migration:', error);
      return 0;
    }
  }

  /**
   * Generate unique ID for drawings
   */
  private static generateId(): string {
    return `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Legacy Drawing Service (localStorage) - kept for backward compatibility
 */
export class DrawingService {
  private static readonly STORAGE_KEY = 'hsr_project_drawings';

  /**
   * Save a drawing to localStorage
   */
  static saveDrawing(drawing: Omit<ProjectDrawing, 'id' | 'timestamp'>): ProjectDrawing {
    const drawings = this.loadAllDrawings();

    // Minimize payload to avoid localStorage quota issues
    const slimResult = this.slimDrawingResult(drawing.result);
    const slimSpec = this.slimSpecification(drawing.specification);

    const newDrawing: ProjectDrawing = {
      ...drawing,
      specification: slimSpec,
      result: slimResult,
      id: this.generateId(),
      timestamp: Date.now(),
      includeInContext: drawing.includeInContext ?? true,
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
      drawing.specification !== undefined &&
      typeof drawing.generatedCode === 'string' &&
      drawing.result &&
      typeof drawing.timestamp === 'number'
    );
  }

  // Reduce size of DrawingResult before storing - AGGRESSIVE REDUCTION for quota
  private static slimDrawingResult(result: DrawingResult): DrawingResult {
    const title = result.title;
    const description = result.description;
    // Store only essential Python code (remove comments and extra whitespace)
    const pythonCode = this.compressPythonCode(result.pythonCode || '');
    // Store only DXF filename reference, not full content (too large for localStorage)
    const dxfContent = result.dxfContent ? `DXF_GENERATED_${Date.now()}.dxf` : '';
    const executionLog = (result.executionLog || '').slice(0, 500); // cap log to 500 chars
    return { title, description, pythonCode, dxfContent, executionLog } as DrawingResult;
  }

  // Compress Python code by removing comments and extra whitespace
  private static compressPythonCode(code: string): string {
    return code
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('"""') && !line.startsWith('print('))
      .join('\n')
      .slice(0, 3000); // Cap at 3KB max for storage
  }

  // Keep only essential parts of specification for regeneration
  private static slimSpecification(spec: any): any {
    if (!spec) return null;
    if (typeof spec === 'string') {
      // For text analysis, keep only first 2000 chars
      return spec.slice(0, 2000);
    }
    return spec; // preserve JSON specs as-is
  }
}
