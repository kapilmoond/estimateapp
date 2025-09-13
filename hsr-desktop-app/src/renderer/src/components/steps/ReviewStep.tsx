import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Share, CheckCircle, Eye } from 'lucide-react';
import { useAppState } from '../../contexts/AppStateContext';
import toast from 'react-hot-toast';

export function ReviewStep() {
  const { state } = useAppState();

  const handleExportProject = () => {
    toast.success('Project exported successfully!');
  };

  const handleShareProject = () => {
    toast.info('Share functionality coming soon');
  };

  const projectSections = [
    {
      title: 'Project Scope',
      icon: FileText,
      completed: state.currentProject?.finalizedScope ? true : false,
      data: state.currentProject?.finalizedScope || 'No scope defined',
    },
    {
      title: 'Component Designs',
      icon: Eye,
      completed: state.currentProject?.designs && state.currentProject.designs.length > 0,
      data: `${state.currentProject?.designs?.length || 0} designs created`,
    },
    {
      title: 'Technical Drawings',
      icon: FileText,
      completed: state.currentProject?.drawings && state.currentProject.drawings.length > 0,
      data: `${state.currentProject?.drawings?.length || 0} drawings generated`,
    },
    {
      title: 'Cost Estimate',
      icon: CheckCircle,
      completed: state.currentProject?.estimate ? true : false,
      data: state.currentProject?.estimate || 'No estimate generated',
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Review & Export
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Review your complete project and export the final deliverables
            </p>
          </div>
          
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShareProject}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              <Share className="w-4 h-4" />
              <span>Share</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportProject}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              <span>Export Project</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Project Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Project Summary
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Project Name</label>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {state.currentProject?.name || 'Untitled Project'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Created</label>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {state.currentProject?.createdAt ? new Date(state.currentProject.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Modified</label>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {state.currentProject?.lastModified ? new Date(state.currentProject.lastModified).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</label>
                <p className="text-green-600 dark:text-green-400 font-medium">Ready for Export</p>
              </div>
            </div>
          </div>

          {/* Project Sections */}
          <div className="space-y-4">
            {projectSections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        section.completed 
                          ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                          {section.title}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {section.data}
                        </p>
                      </div>
                    </div>
                    
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                      section.completed
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      <CheckCircle className="w-4 h-4" />
                      <span>{section.completed ? 'Complete' : 'Incomplete'}</span>
                    </div>
                  </div>
                  
                  {section.completed && (
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {typeof section.data === 'string' && section.data.length > 100
                          ? `${section.data.substring(0, 100)}...`
                          : section.data
                        }
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Export Options */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Export Options
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left"
              >
                <FileText className="w-6 h-6 text-blue-500 mb-2" />
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-1">PDF Report</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Complete project report with all sections</p>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left"
              >
                <Download className="w-6 h-6 text-green-500 mb-2" />
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-1">DXF Files</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Technical drawings in CAD format</p>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left"
              >
                <FileText className="w-6 h-6 text-purple-500 mb-2" />
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-1">Excel Estimate</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Detailed cost breakdown spreadsheet</p>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
