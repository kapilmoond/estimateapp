import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, FolderOpen, Trash2, Edit, Calendar } from 'lucide-react';
import { useAppState } from '../contexts/AppStateContext';
import toast from 'react-hot-toast';

interface ProjectManagerProps {
  onClose: () => void;
}

export function ProjectManager({ onClose }: ProjectManagerProps) {
  const { state, createProject, switchProject } = useAppState();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    createProject(newProjectName.trim());
    setNewProjectName('');
    setShowCreateForm(false);
    toast.success('Project created successfully!');
  };

  const handleDeleteProject = (projectId: string) => {
    // TODO: Implement project deletion
    toast.info('Project deletion coming soon');
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Project Manager
        </h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Create New Project */}
        <div className="mb-6">
          {!showCreateForm ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Project</span>
            </motion.button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                autoFocus
              />
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreateProject}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Create
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewProjectName('');
                  }}
                  className="flex-1 px-3 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* Project List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Recent Projects
          </h3>
          
          {state.projects.length > 0 ? (
            <div className="space-y-2">
              {state.projects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 group ${
                    state.currentProject?.id === project.id
                      ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                  onClick={() => switchProject(project.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FolderOpen className={`w-5 h-5 ${
                        state.currentProject?.id === project.id
                          ? 'text-blue-500'
                          : 'text-slate-400'
                      }`} />
                      <div>
                        <h4 className="font-medium text-slate-800 dark:text-slate-200">
                          {project.name}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(project.lastModified).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement edit
                        }}
                        className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                        title="Edit project"
                      >
                        <Edit className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Progress Indicators */}
                  <div className="mt-3 flex space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      project.finalizedScope ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'
                    }`} title="Scope" />
                    <div className={`w-2 h-2 rounded-full ${
                      project.designs.length > 0 ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'
                    }`} title="Designs" />
                    <div className={`w-2 h-2 rounded-full ${
                      project.drawings.length > 0 ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'
                    }`} title="Drawings" />
                    <div className={`w-2 h-2 rounded-full ${
                      project.estimate ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'
                    }`} title="Estimate" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No projects yet
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-xs">
                Create your first project to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
