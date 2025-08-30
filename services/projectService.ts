import { ChatMessage, ComponentDesign, TechnicalDrawing, HsrItem, ReferenceDoc, Step, OutputMode } from '../types';

export interface ProjectData {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
  
  // Project State
  step: Step;
  conversationHistory: ChatMessage[];
  currentMessage: string;
  finalizedScope: string;
  keywords: string[];
  hsrItems: HsrItem[];
  finalEstimateText: string;

  // Design & Drawing Data
  designs: ComponentDesign[];
  drawings: TechnicalDrawing[];

  // Reference Documents
  referenceDocs: ReferenceDoc[];

  // Context & Settings
  outputMode: OutputMode;
  purifiedContext: string;
  selectedTemplates: any[];
  templateInstructions: string;
  
  // Progress Indicators
  hasScope: boolean;
  hasDesigns: boolean;
  hasDrawings: boolean;
  hasEstimate: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
  progress: {
    hasScope: boolean;
    hasDesigns: boolean;
    hasDrawings: boolean;
    hasEstimate: boolean;
    conversationCount: number;
  };
}

export class ProjectService {
  private static readonly STORAGE_KEY = 'hsr-projects';
  private static readonly CURRENT_PROJECT_KEY = 'hsr-current-project';
  
  /**
   * Create a new project
   */
  static createProject(name: string): ProjectData {
    const project: ProjectData = {
      id: this.generateId(),
      name: name.trim(),
      createdAt: new Date(),
      lastModified: new Date(),
      
      // Initialize empty state
      step: 'scoping',
      conversationHistory: [{ role: 'model', text: 'Hello! Please describe the project you want to build.' }],
      currentMessage: '',
      finalizedScope: '',
      keywords: [],
      hsrItems: [],
      finalEstimateText: '',
      
      designs: [],
      drawings: [],
      referenceDocs: [],
      
      outputMode: 'discussion' as OutputMode,
      purifiedContext: '',
      selectedTemplates: [],
      templateInstructions: '',
      
      hasScope: false,
      hasDesigns: false,
      hasDrawings: false,
      hasEstimate: false
    };
    
    this.saveProject(project);
    this.setCurrentProject(project.id);
    
    console.log('ProjectService: Created new project:', project.name);
    return project;
  }
  
  /**
   * Save project data
   */
  static saveProject(project: ProjectData): void {
    const projects = this.loadAllProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    
    // Update progress indicators
    project.hasScope = project.finalizedScope.trim().length > 0;
    project.hasDesigns = project.designs.length > 0;
    project.hasDrawings = project.drawings.length > 0;
    project.hasEstimate = project.finalEstimateText.trim().length > 0;
    project.lastModified = new Date();
    
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
    console.log('ProjectService: Saved project:', project.name);
  }
  
  /**
   * Load all projects
   */
  static loadAllProjects(): ProjectData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const projects = JSON.parse(stored);
      return projects.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        lastModified: new Date(p.lastModified)
      }));
    } catch (error) {
      console.error('ProjectService: Error loading projects:', error);
      return [];
    }
  }
  
  /**
   * Get project summaries for listing
   */
  static getProjectSummaries(): ProjectSummary[] {
    const projects = this.loadAllProjects();
    return projects.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      lastModified: p.lastModified,
      progress: {
        hasScope: p.hasScope,
        hasDesigns: p.hasDesigns,
        hasDrawings: p.hasDrawings,
        hasEstimate: p.hasEstimate,
        conversationCount: p.conversationHistory.length
      }
    })).sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }
  
  /**
   * Load specific project
   */
  static loadProject(projectId: string): ProjectData | null {
    const projects = this.loadAllProjects();
    return projects.find(p => p.id === projectId) || null;
  }
  
  /**
   * Delete project
   */
  static deleteProject(projectId: string): void {
    const projects = this.loadAllProjects();
    const filtered = projects.filter(p => p.id !== projectId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    
    // If this was the current project, clear it
    if (this.getCurrentProjectId() === projectId) {
      this.clearCurrentProject();
    }
    
    console.log('ProjectService: Deleted project:', projectId);
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
  static loadCurrentProject(): ProjectData | null {
    const currentId = this.getCurrentProjectId();
    if (!currentId) return null;
    
    return this.loadProject(currentId);
  }
  
  /**
   * Update project name
   */
  static updateProjectName(projectId: string, newName: string): void {
    const project = this.loadProject(projectId);
    if (project) {
      project.name = newName.trim();
      this.saveProject(project);
    }
  }
  
  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  /**
   * Auto-save current project state
   */
  static autoSave(projectData: Partial<ProjectData>): void {
    const currentId = this.getCurrentProjectId();
    if (!currentId) return;
    
    const project = this.loadProject(currentId);
    if (!project) return;
    
    // Update project with new data
    Object.assign(project, projectData);
    this.saveProject(project);
  }
}
