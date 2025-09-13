import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Database, Server, Clock } from 'lucide-react';
import { useAppState } from '../contexts/AppStateContext';

export function StatusBar() {
  const { state } = useAppState();

  return (
    <div className="h-8 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 text-xs">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* RAG Server Status */}
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            state.ragServerStatus.isRunning ? 'bg-green-400' : 'bg-red-400'
          }`} />
          <Database className="w-3 h-3 text-slate-500" />
          <span className="text-slate-600 dark:text-slate-400">
            RAG: {state.ragServerStatus.isRunning ? 'Connected' : 'Disconnected'}
          </span>
          {state.ragServerStatus.isRunning && (
            <span className="text-slate-500">
              ({state.ragServerStatus.documentsCount} docs)
            </span>
          )}
        </div>

        {/* Processing Status */}
        {state.isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-1"
          >
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-600 dark:text-blue-400">Processing...</span>
          </motion.div>
        )}
      </div>

      {/* Center Section */}
      <div className="flex items-center space-x-2">
        {state.currentProject && (
          <span className="text-slate-600 dark:text-slate-400">
            {state.currentProject.name} • Step {state.currentStep}
          </span>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* LLM Provider */}
        <div className="flex items-center space-x-1">
          <Server className="w-3 h-3 text-slate-500" />
          <span className="text-slate-600 dark:text-slate-400">
            {state.llmProvider.provider} • {state.llmProvider.model}
          </span>
        </div>

        {/* Current Time */}
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3 text-slate-500" />
          <span className="text-slate-600 dark:text-slate-400">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
