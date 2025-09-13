import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Ruler, Plus, Download, ArrowRight, FileImage } from 'lucide-react';
import { useAppState } from '../../contexts/AppStateContext';
import toast from 'react-hot-toast';

export function DrawingStep() {
  const { state, setCurrentStep } = useAppState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [drawingPrompt, setDrawingPrompt] = useState('');

  const handleGenerateDrawing = async () => {
    if (!drawingPrompt.trim()) {
      toast.error('Please enter drawing requirements');
      return;
    }

    setIsGenerating(true);
    try {
      // TODO: Integrate with drawing service
      setTimeout(() => {
        toast.success('Technical drawing generated successfully!');
        setIsGenerating(false);
        setDrawingPrompt('');
      }, 4000);
    } catch (error) {
      toast.error('Failed to generate drawing');
      setIsGenerating(false);
    }
  };

  const handleProceedToEstimation = () => {
    setCurrentStep('estimation');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Technical Drawing
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Generate professional CAD drawings with dimensions and annotations
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleProceedToEstimation}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <span>Proceed to Estimation</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Drawing Input */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Generate Technical Drawing
            </h2>
            
            <div className="space-y-4">
              <textarea
                value={drawingPrompt}
                onChange={(e) => setDrawingPrompt(e.target.value)}
                placeholder="Describe the technical drawing you need (e.g., foundation plan, elevation view, structural details)..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={4}
              />
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateDrawing}
                disabled={isGenerating || !drawingPrompt.trim()}
                className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Generating Drawing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Generate Drawing</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Existing Drawings */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Project Drawings
            </h2>
            
            {state.currentProject?.drawings && state.currentProject.drawings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.currentProject.drawings.map((drawing, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-slate-800 dark:text-slate-200">
                        Drawing {index + 1}
                      </h3>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:text-green-500 dark:hover:text-green-400 transition-colors"
                        title="Download drawing"
                      >
                        <Download className="w-4 h-4" />
                      </motion.button>
                    </div>
                    
                    <div className="aspect-video bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center mb-3">
                      <FileImage className="w-8 h-8 text-slate-400" />
                    </div>
                    
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      <p>Technical drawing preview would be displayed here...</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Ruler className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  No drawings created yet
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Generate your first technical drawing using the form above
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
