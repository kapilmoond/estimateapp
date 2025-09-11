import React, { useState, useEffect } from 'react';
import { ProjectService, ProjectSummary, ProjectData } from '../services/projectService';
import { EnhancedProjectService } from '../services/enhancedProjectService';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSelected: (project: ProjectData) => void;
  onNewProject: (projectName: string) => void;
  currentProjectId?: string;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  isOpen,
  onClose,
  onProjectSelected,
  onNewProject,
  currentProjectId
}) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    try {
      // Try to load from IndexedDB first
      const projectSummaries = await EnhancedProjectService.getProjectSummaries();
      setProjects(projectSummaries);
      console.log(`Loaded ${projectSummaries.length} projects from IndexedDB`);
    } catch (error) {
      console.error('Error loading projects from IndexedDB, falling back to localStorage:', error);
      // Fallback to localStorage
      const projectSummaries = ProjectService.getProjectSummaries();
      setProjects(projectSummaries);
      console.log(`Loaded ${projectSummaries.length} projects from localStorage`);
    }
  };

  const handleNewProject = () => {
    if (!newProjectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    onNewProject(newProjectName.trim());
    setNewProjectName('');
    setShowNewProjectForm(false);
    onClose();
  };

  const handleSelectProject = (projectId: string) => {
    const project = ProjectService.loadProject(projectId);
    if (project) {
      onProjectSelected(project);
      onClose();
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      try {
        // Try to delete from IndexedDB first
        await EnhancedProjectService.deleteProject(projectId);
        console.log(`Deleted project ${projectName} from IndexedDB`);
      } catch (error) {
        console.error('Error deleting from IndexedDB, trying localStorage:', error);
        // Fallback to localStorage
        ProjectService.deleteProject(projectId);
        console.log(`Deleted project ${projectName} from localStorage`);
      }
      loadProjects();
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  const getProgressIcon = (progress: ProjectSummary['progress']) => {
    const completed = [progress.hasScope, progress.hasDesigns, progress.hasDrawings, progress.hasEstimate].filter(Boolean).length;
    const total = 4;
    const percentage = (completed / total) * 100;
    
    if (percentage === 0) return '🆕';
    if (percentage < 50) return '🟡';
    if (percentage < 100) return '🟠';
    return '✅';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Project Manager</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Manage your construction estimation projects
          </p>
        </div>

        <div className="p-6">
          {/* Actions */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setShowNewProjectForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🆕 New Project
            </button>
            
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* New Project Form */}
          {showNewProjectForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-3">Create New Project</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter project name (e.g., 'Residential Foundation 2024')"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleNewProject()}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  autoFocus
                />
                <button
                  onClick={handleNewProject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewProjectForm(false);
                    setNewProjectName('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {projects.length === 0 ? (
                  <div>
                    <p className="text-lg mb-2">No projects yet</p>
                    <p className="text-sm">Create your first project to get started</p>
                  </div>
                ) : (
                  <p>No projects match your search</p>
                )}
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                    project.id === currentProjectId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getProgressIcon(project.progress)}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {project.name}
                            {project.id === currentProjectId && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Current
                              </span>
                            )}
                          </h3>
                          <div className="text-sm text-gray-600">
                            <span>Created: {formatDate(project.createdAt)}</span>
                            {project.lastModified.getTime() !== project.createdAt.getTime() && (
                              <span className="ml-4">Modified: {formatDate(project.lastModified)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>💬 {project.progress.conversationCount} messages</span>
                        {project.progress.hasScope && <span>📋 Scope</span>}
                        {project.progress.hasDesigns && <span>🎨 Designs</span>}
                        {project.progress.hasDrawings && <span>📐 Drawings</span>}
                        {project.progress.hasEstimate && <span>💰 Estimate</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectProject(project.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id, project.name)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        disabled={project.id === currentProjectId}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
