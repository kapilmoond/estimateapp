import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PenTool, Plus, Edit, Download, ArrowRight } from 'lucide-react';
import { useAppState } from '../../contexts/AppStateContext';
import toast from 'react-hot-toast';

export function DesignStep() {
  const { state, setCurrentStep } = useAppState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [designPrompt, setDesignPrompt] = useState('');

  const handleGenerateDesign = async () => {
    if (!designPrompt.trim()) {
      toast.error('Please enter design requirements');
      return;
    }

    setIsGenerating(true);
    try {
      // TODO: Integrate with LLM service for design generation
      setTimeout(() => {
        toast.success('Design generated successfully!');
        setIsGenerating(false);
        setDesignPrompt('');
      }, 3000);
    } catch (error) {
      toast.error('Failed to generate design');
      setIsGenerating(false);
    }
  };

  const handleProceedToDrawing = () => {
    setCurrentStep('drawing');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Component Design
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Generate detailed component designs with specifications and materials
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleProceedToDrawing}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <span>Proceed to Drawing</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Design Input */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Generate New Design
            </h2>
            
            <div className="space-y-4">
              <textarea
                value={designPrompt}
                onChange={(e) => setDesignPrompt(e.target.value)}
                placeholder="Describe the component you want to design (e.g., foundation details, beam specifications, column design)..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
              />
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateDesign}
                disabled={isGenerating || !designPrompt.trim()}
                className="flex items-center space-x-2 px-6 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Generating Design...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Generate Design</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Existing Designs */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Project Designs
            </h2>
            
            {state.currentProject?.designs && state.currentProject.designs.length > 0 ? (
              <div className="space-y-4">
                {state.currentProject.designs.map((design, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-slate-800 dark:text-slate-200">
                        Design Component {index + 1}
                      </h3>
                      <div className="flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
                          title="Edit design"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:text-green-500 dark:hover:text-green-400 transition-colors"
                          title="Download design"
                        >
                          <Download className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      <p>Design specifications and details would be displayed here...</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <PenTool className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  No designs created yet
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Generate your first component design using the form above
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
