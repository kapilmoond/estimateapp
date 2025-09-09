/**
 * Enhanced Project Service using IndexedDB for better performance and storage capacity
 * Replaces localStorage-based ProjectService with modern browser storage
 */

import { ProjectData } from '../types';
import { IndexedDBService } from './indexedDBService';

export class EnhancedProjectService {
  private static readonly CURRENT_PROJECT_KEY = 'current-project-id';
  private static isInitialized = false;

  /**
   * Initialize the service and migrate from localStorage if needed
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize IndexedDB
      await IndexedDBService.initialize();
      
      // Check if we need to migrate from localStorage
      const hasLegacyData = localStorage.getItem('hsr-projects');
      if (hasLegacyData) {
        console.log('Migrating project data from localStorage to IndexedDB...');
        await this.migrateFromLocalStorage();
      }
      
      this.isInitialized = true;
      console.log('EnhancedProjectService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize EnhancedProjectService:', error);
      throw error;
    }
  }

  /**
   * Migrate data from localStorage to IndexedDB
   */
  private static async migrateFromLocalStorage(): Promise<void> {
    try {
      const legacyProjects = localStorage.getItem('hsr-projects');
      if (legacyProjects) {
        const projects = JSON.parse(legacyProjects);
        
        if (Array.isArray(projects)) {
          for (const project of projects) {
            // Ensure project has required fields
            const enhancedProject = {
              ...project,
              createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
              lastModified: project.lastModified ? new Date(project.lastModified) : new Date(),
              // Migrate conversation history to separate storage
              conversationHistory: project.conversationHistory || []
            };
            
            // Save project (without conversation history to reduce size)
            const { conversationHistory, ...projectWithoutHistory } = enhancedProject;
            await IndexedDBService.save('projects', projectWithoutHistory);
            
            // Save conversation history separately
            if (conversationHistory.length > 0) {
              await IndexedDBService.saveConversation(project.id, conversationHistory);
            }
          }
          
          console.log(`Migrated ${projects.length} projects from localStorage to IndexedDB`);
          
          // Keep localStorage as backup for now, but mark as migrated
          localStorage.setItem('hsr-projects-migrated', 'true');
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create a new project
   */
  static async createProject(name: string): Promise<ProjectData> {
    await this.initialize();
    
    const newProject: ProjectData = {
      id: this.generateId(),
      name: name.trim(),
      createdAt: new Date(),
      lastModified: new Date(),
      step: 'scoping',
      conversationHistory: [
        { role: 'model', text: 'Hello! I am your AI assistant for construction estimation. Please describe the project you want to build, and we can define its scope together.' }
      ],
      currentMessage: '',
      finalizedScope: '',
      keywords: [],
      hsrItems: [],
      designs: [],
      drawings: [],
      finalEstimateText: '',
      selectedTemplates: [],
      hasScope: false,
      hasDesigns: false,
      hasDrawings: false,
      hasEstimate: false
    };

    await this.saveProject(newProject);
    return newProject;
  }

  /**
   * Save project data
   */
  static async saveProject(project: ProjectData): Promise<void> {
    await this.initialize();
    
    // Update progress indicators
    project.hasScope = project.finalizedScope.trim().length > 0;
    project.hasDesigns = project.designs.length > 0;
    project.hasDrawings = project.drawings.length > 0;
    project.hasEstimate = project.finalEstimateText.trim().length > 0;
    project.lastModified = new Date();
    
    // Save conversation history separately for better performance
    const conversationHistory = project.conversationHistory || [];
    await IndexedDBService.saveConversation(project.id, conversationHistory);
    
    // Save project without conversation history to reduce main project size
    const { conversationHistory: _, ...projectWithoutHistory } = project;
    await IndexedDBService.save('projects', projectWithoutHistory);
    
    console.log('EnhancedProjectService: Saved project:', project.name);
  }

  /**
   * Load project by ID
   */
  static async loadProject(projectId: string): Promise<ProjectData | null> {
    await this.initialize();
    
    const project = await IndexedDBService.load<ProjectData>('projects', projectId);
    if (!project) return null;
    
    // Load conversation history separately
    const conversationHistory = await IndexedDBService.loadConversation(projectId);
    
    return {
      ...project,
      conversationHistory: conversationHistory || [
        { role: 'model', text: 'Hello! I am your AI assistant for construction estimation. Please describe the project you want to build, and we can define its scope together.' }
      ],
      createdAt: new Date(project.createdAt),
      lastModified: new Date(project.lastModified)
    };
  }

  /**
   * Load all projects
   */
  static async loadAllProjects(): Promise<ProjectData[]> {
    await this.initialize();
    
    const projects = await IndexedDBService.loadAll<ProjectData>('projects');
    
    // Convert dates and add basic conversation history for listing
    return projects.map(project => ({
      ...project,
      createdAt: new Date(project.createdAt),
      lastModified: new Date(project.lastModified),
      conversationHistory: [] // Don't load full conversation history for listing performance
    }));
  }

  /**
   * Delete project
   */
  static async deleteProject(projectId: string): Promise<void> {
    await this.initialize();
    
    await IndexedDBService.delete('projects', projectId);
    await IndexedDBService.clearConversation(projectId);
    
    // If this was the current project, clear it
    if (this.getCurrentProjectId() === projectId) {
      this.clearCurrentProject();
    }
    
    console.log('EnhancedProjectService: Deleted project:', projectId);
  }

  /**
   * Set current project
   */
  static setCurrentProject(projectId: string): void {
    localStorage.setItem(this.CURRENT_PROJECT_KEY, projectId);
  }

  /**
   * Get current project ID
   */
  static getCurrentProjectId(): string | null {
    return localStorage.getItem(this.CURRENT_PROJECT_KEY);
  }

  /**
   * Clear current project
   */
  static clearCurrentProject(): void {
    localStorage.removeItem(this.CURRENT_PROJECT_KEY);
  }

  /**
   * Load current project
   */
  static async loadCurrentProject(): Promise<ProjectData | null> {
    const currentId = this.getCurrentProjectId();
    if (!currentId) return null;
    
    return this.loadProject(currentId);
  }

  /**
   * Update project name
   */
  static async updateProjectName(projectId: string, newName: string): Promise<void> {
    const project = await this.loadProject(projectId);
    if (project) {
      project.name = newName.trim();
      await this.saveProject(project);
    }
  }

  /**
   * Clear conversation history for a project
   */
  static async clearProjectConversation(projectId: string): Promise<void> {
    await this.initialize();
    
    const project = await this.loadProject(projectId);
    if (project) {
      // Reset conversation to initial message
      project.conversationHistory = [
        { role: 'model', text: 'Hello! I am your AI assistant for construction estimation. Please describe the project you want to build, and we can define its scope together.' }
      ];
      
      await this.saveProject(project);
      console.log('EnhancedProjectService: Cleared conversation for project:', projectId);
    }
  }

  /**
   * Clear all conversation histories
   */
  static async clearAllConversations(): Promise<void> {
    await this.initialize();
    await IndexedDBService.clearAllConversations();
    console.log('EnhancedProjectService: Cleared all conversation histories');
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalProjects: number;
    totalConversations: number;
    totalMessages: number;
    databaseSize: string;
    availableSpace: string;
    conversationStats: any;
  }> {
    await this.initialize();
    
    const projects = await this.loadAllProjects();
    const conversationStats = await IndexedDBService.getConversationStats();
    const databaseSize = await IndexedDBService.getDatabaseSize();
    const availableSpace = await IndexedDBService.getAvailableSpace();
    
    return {
      totalProjects: projects.length,
      totalConversations: conversationStats.totalConversations,
      totalMessages: conversationStats.totalMessages,
      databaseSize: IndexedDBService.formatBytes(databaseSize),
      availableSpace: IndexedDBService.formatBytes(availableSpace),
      conversationStats
    };
  }

  /**
   * Export all data for backup
   */
  static async exportAllData(): Promise<Blob> {
    await this.initialize();
    
    const allData = await IndexedDBService.exportAllData();
    const jsonString = JSON.stringify(allData, null, 2);
    
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Import data from backup
   */
  static async importData(file: File): Promise<void> {
    await this.initialize();
    
    const text = await file.text();
    const data = JSON.parse(text);
    
    await IndexedDBService.importData(data);
    console.log('EnhancedProjectService: Data imported successfully');
  }

  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Check if IndexedDB is available, fallback to localStorage warning
   */
  static isIndexedDBAvailable(): boolean {
    return IndexedDBService.isSupported();
  }
}
