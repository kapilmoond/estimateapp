import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Search, Download, ArrowRight, DollarSign } from 'lucide-react';
import { useAppState } from '../../contexts/AppStateContext';
import toast from 'react-hot-toast';

export function EstimationStep() {
  const { state, setCurrentStep } = useAppState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleGenerateEstimate = async () => {
    setIsGenerating(true);
    try {
      // TODO: Integrate with RAG service and HSR database
      // Skip keyword generation as requested - use RAG directly
      setTimeout(() => {
        toast.success('Cost estimate generated successfully!');
        setIsGenerating(false);
      }, 3000);
    } catch (error) {
      toast.error('Failed to generate estimate');
      setIsGenerating(false);
    }
  };

  const handleSearchHSR = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter search terms');
      return;
    }

    try {
      // TODO: Implement HSR search with RAG
      toast.info('Searching HSR database...');
    } catch (error) {
      toast.error('Failed to search HSR database');
    }
  };

  const handleProceedToReview = () => {
    setCurrentStep('review');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Cost Estimation
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Generate accurate cost estimates using AI-powered HSR database search
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleProceedToReview}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <span>Review & Export</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Estimation Controls */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Generate Cost Estimate
            </h2>
            
            <div className="space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                Generate a comprehensive cost estimate based on your project scope, designs, and drawings.
                The system will use AI-powered semantic search to find relevant HSR items without manual keyword generation.
              </p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateEstimate}
                disabled={isGenerating}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Generating Estimate...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    <span>Generate Estimate</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Manual HSR Search */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Manual HSR Search
            </h2>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search HSR items (e.g., concrete, steel, excavation)..."
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchHSR()}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSearchHSR}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Estimate Results */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Cost Estimate
            </h2>
            
            {state.currentProject?.estimate ? (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="text-slate-600 dark:text-slate-400">
                    <p>Detailed cost estimate would be displayed here...</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-600">
                  <div className="flex items-center space-x-2 text-lg font-semibold text-slate-800 dark:text-slate-200">
                    <DollarSign className="w-5 h-5" />
                    <span>Total Estimate: ₹0.00</span>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Estimate</span>
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calculator className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  No estimate generated yet
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Generate your cost estimate using the controls above
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
