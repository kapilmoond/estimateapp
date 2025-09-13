import React from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  PenTool,
  Ruler,
  Calculator,
  FileText,
  FolderOpen,
  Settings,
  Database,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useAppState } from '../contexts/AppStateContext';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  activePanel: 'projects' | 'settings' | 'rag' | null;
  onPanelChange: (panel: 'projects' | 'settings' | 'rag' | null) => void;
}

export function Sidebar({ activePanel, onPanelChange }: SidebarProps) {
  const { state, setCurrentStep } = useAppState();
  const { theme, setTheme, actualTheme } = useTheme();

  const steps = [
    { id: 'scoping', icon: MessageSquare, label: 'Project Scope', description: 'Define project requirements' },
    { id: 'design', icon: PenTool, label: 'Component Design', description: 'Create detailed designs' },
    { id: 'drawing', icon: Ruler, label: 'Technical Drawing', description: 'Generate CAD drawings' },
    { id: 'estimation', icon: Calculator, label: 'Cost Estimation', description: 'Calculate project costs' },
    { id: 'review', icon: FileText, label: 'Review & Export', description: 'Finalize and export' },
  ];

  const handleStepClick = (stepId: string) => {
    setCurrentStep(stepId as any);
  };

  const handleThemeToggle = () => {
    if (theme === 'system') {
      setTheme(actualTheme === 'light' ? 'dark' : 'light');
    } else {
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  };

  return (
    <div className="w-16 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      {/* Step Navigation */}
      <div className="flex-1 py-4">
        <div className="space-y-2 px-2">
          {steps.map((step, index) => {
            const isActive = state.currentStep === step.id;
            const isCompleted = false; // TODO: Add completion logic
            const Icon = step.icon;

            return (
              <motion.button
                key={step.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleStepClick(step.id)}
                className={`
                  w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }
                  ${isCompleted ? 'ring-2 ring-green-400' : ''}
                `}
                title={step.label}
              >
                <Icon className="w-5 h-5" />
                
                {/* Step Number */}
                <div className={`
                  absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center
                  ${isActive 
                    ? 'bg-white text-blue-500' 
                    : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                  }
                `}>
                  {index + 1}
                </div>

                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  <div className="font-medium">{step.label}</div>
                  <div className="text-xs text-slate-300">{step.description}</div>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-200 dark:bg-slate-700 mx-2" />

      {/* Panel Toggles */}
      <div className="py-4 space-y-2 px-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPanelChange('projects')}
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative
            ${activePanel === 'projects'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }
          `}
          title="Project Manager"
        >
          <FolderOpen className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPanelChange('rag')}
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative
            ${activePanel === 'rag'
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }
          `}
          title="Knowledge Base"
        >
          <Database className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPanelChange('settings')}
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative
            ${activePanel === 'settings'
              ? 'bg-orange-500 text-white shadow-lg'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }
          `}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-200 dark:bg-slate-700 mx-2" />

      {/* Theme Toggle */}
      <div className="py-4 px-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleThemeToggle}
          className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all duration-200"
          title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'system' ? (
            <Monitor className="w-5 h-5" />
          ) : actualTheme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
