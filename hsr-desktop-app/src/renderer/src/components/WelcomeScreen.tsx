import React from 'react';
import { motion } from 'framer-motion';
import { Plus, FolderOpen, Building2, Zap, Shield, Database } from 'lucide-react';
import { useAppState } from '../contexts/AppStateContext';

export function WelcomeScreen() {
  const { createProject, state } = useAppState();

  const handleCreateProject = () => {
    const projectName = `Project ${state.projects.length + 1}`;
    createProject(projectName);
  };

  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Estimation',
      description: 'Advanced AI algorithms for accurate cost estimation and project planning',
    },
    {
      icon: Database,
      title: 'RAG Knowledge Base',
      description: 'Upload documents and leverage semantic search for enhanced accuracy',
    },
    {
      icon: Building2,
      title: 'Professional Drawings',
      description: 'Generate technical CAD drawings with professional standards',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'All data processed locally with enterprise-grade security',
    },
  ];

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            Welcome to HSR Construction Estimator
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Professional construction cost estimation powered by AI. Create accurate estimates, 
            generate technical drawings, and manage your construction projects efficiently.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center space-x-4 mb-16"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateProject}
            className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Project</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-3 px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
          >
            <FolderOpen className="w-5 h-5" />
            <span>Open Existing Project</span>
          </motion.button>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 border border-slate-200 dark:border-slate-700"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  {feature.title}
                </h3>
                
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Recent Projects */}
        {state.projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-16"
          >
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">
              Recent Projects
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.projects.slice(0, 6).map((project) => (
                <motion.div
                  key={project.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    {project.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Last modified: {new Date(project.lastModified).toLocaleDateString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
