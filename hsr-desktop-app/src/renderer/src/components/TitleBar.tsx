import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Minus, Square, X, Clock, Crown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface TitleBarProps {
  isTrial: boolean;
  daysRemaining: number;
}

export function TitleBar({ isTrial, daysRemaining }: TitleBarProps) {
  const { actualTheme } = useTheme();

  const handleMinimize = () => {
    if (window.electronAPI?.window?.minimize) {
      window.electronAPI.window.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI?.window?.maximize) {
      window.electronAPI.window.maximize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.window?.close) {
      window.electronAPI.window.close();
    }
  };

  return (
    <div className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 select-none">
      {/* Left Section - Logo and Title */}
      <div className="flex items-center space-x-3">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
        >
          <Building2 className="w-5 h-5 text-white" />
        </motion.div>
        
        <div className="flex items-center space-x-2">
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            HSR Construction Estimator
          </h1>
          
          {/* License Status Badge */}
          {isTrial && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center space-x-1 px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full text-xs font-medium"
            >
              <Clock className="w-3 h-3" />
              <span>Trial: {daysRemaining} days</span>
            </motion.div>
          )}
          
          {!isTrial && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium"
            >
              <Crown className="w-3 h-3" />
              <span>Licensed</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Center Section - Drag Area */}
      <div className="flex-1 h-full" style={{ WebkitAppRegion: 'drag' as any }} />

      {/* Right Section - Window Controls */}
      <div className="flex items-center space-x-1">
        <motion.button
          whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          title="Minimize"
        >
          <Minus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </motion.button>

        <motion.button
          whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          title="Maximize"
        >
          <Square className="w-3 h-3 text-slate-600 dark:text-slate-400" />
        </motion.button>

        <motion.button
          whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors group"
          title="Close"
        >
          <X className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-red-500" />
        </motion.button>
      </div>
    </div>
  );
}
