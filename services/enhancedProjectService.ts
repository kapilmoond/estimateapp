/**
 * Enhanced Project Service using IndexedDB for better performance and storage capacity
 * Replaces localStorage-based ProjectService with modern browser storage
 */

import { ProjectData, ProjectSummary } from './projectService';
import { IndexedDBService } from './indexedDBService';

export class EnhancedProjectService {
  private static readonly CURRENT_PROJECT_KEY = 'current-project-id';
  private static readonly LEGACY_STORAGE_KEY = 'hsr-projects';
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
      // Check if migration is needed and avoid duplicates
      const migrated = localStorage.getItem('hsr-projects-migrated');
      if (!migrated) {
        console.log('Checking for projects to migrate from localStorage to IndexedDB...');

        // Check if IndexedDB already has projects to avoid duplicates
        const existingProjects = await IndexedDBService.loadAll<ProjectData>('projects');

        if (existingProjects.length === 0) {
          const legacyProjects = localStorage.getItem('hsr-projects');
          if (legacyProjects) {
            const projects = JSON.parse(legacyProjects);

            if (Array.isArray(projects) && projects.length > 0) {
              console.log(`Migrating ${projects.length} projects from localStorage to IndexedDB...`);

              for (const project of projects) {
                // Check if project already exists in IndexedDB
                const existingProject = await IndexedDBService.load<ProjectData>('projects', project.id);
                if (!existingProject) {
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

                  console.log(`Migrated project: ${project.name}`);
                } else {
                  console.log(`Project already exists in IndexedDB: ${project.name}`);
                }
              }

              console.log(`Migration completed successfully`);
            }
          }
        } else {
          console.log(`IndexedDB already has ${existingProjects.length} projects, skipping migration`);
        }

        // Mark as migrated to prevent future attempts
        localStorage.setItem('hsr-projects-migrated', 'true');
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
      referenceDocs: [],
      outputMode: 'plain',
      purifiedContext: '',
      selectedTemplates: [],
      templateInstructions: '',
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
   * Get all projects from IndexedDB
   */
  static async getAllProjects(): Promise<ProjectData[]> {
    await this.initialize();
    return IndexedDBService.loadAll<ProjectData>('projects');
  }

  /**
   * Get project summaries for listing
   */
  static async getProjectSummaries(): Promise<ProjectSummary[]> {
    const projects = await this.getAllProjects();
    return projects.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      lastModified: p.lastModified,
      step: p.step
    }));
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

  /**
   * Clean up localStorage to free space and prevent quota exceeded errors
   */
  static cleanupLocalStorage(): void {
    try {
      console.log('EnhancedProjectService: Cleaning up localStorage to free space...');

      // Remove legacy project data that should now be in IndexedDB
      const legacyProjects = localStorage.getItem(this.LEGACY_STORAGE_KEY);
      if (legacyProjects) {
        console.log('Removing legacy project data from localStorage');
        localStorage.removeItem(this.LEGACY_STORAGE_KEY);
      }

      // Remove other large data that might be stored in localStorage
      const keysToCheck = [
        'hsr-designs',
        'hsr-drawings',
        'dxf-drawings',
        'hsr-templates',
        'knowledge-base-documents',
        'conversation-history',
        'drawing-cache'
      ];

      keysToCheck.forEach(key => {
        const data = localStorage.getItem(key);
        if (data && data.length > 10000) { // Remove items larger than 10KB
          console.log(`Removing large localStorage item: ${key} (${data.length} chars)`);
          localStorage.removeItem(key);
        }
      });

      console.log('EnhancedProjectService: localStorage cleanup completed');
    } catch (error) {
      console.error('Error during localStorage cleanup:', error);
    }
  }
}
