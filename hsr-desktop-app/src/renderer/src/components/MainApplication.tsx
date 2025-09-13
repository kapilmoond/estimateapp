import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '../contexts/AppStateContext';
import { useTheme } from '../contexts/ThemeContext';
import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { StatusBar } from './StatusBar';
import { ProjectManager } from './ProjectManager';
import { SettingsPanel } from './SettingsPanel';
import { RAGManager } from './RAGManager';

interface MainApplicationProps {
  isTrial: boolean;
  daysRemaining: number;
}

export function MainApplication({ isTrial, daysRemaining }: MainApplicationProps) {
  const { state } = useAppState();
  const { actualTheme } = useTheme();
  const [activePanel, setActivePanel] = useState<'projects' | 'settings' | 'rag' | null>(null);

  useEffect(() => {
    // Load saved projects on startup
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      // Load projects from storage
      const savedProjects = localStorage.getItem('hsr-projects');
      if (savedProjects) {
        const projects = JSON.parse(savedProjects);
        // Dispatch to app state
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handlePanelChange = (panel: 'projects' | 'settings' | 'rag' | null) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Custom Title Bar */}
      <TitleBar isTrial={isTrial} daysRemaining={daysRemaining} />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activePanel={activePanel}
          onPanelChange={handlePanelChange}
        />

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Side Panels */}
          <motion.div
            initial={false}
            animate={{
              width: activePanel ? '400px' : '0px',
              opacity: activePanel ? 1 : 0,
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            {activePanel === 'projects' && (
              <ProjectManager onClose={() => setActivePanel(null)} />
            )}
            {activePanel === 'settings' && (
              <SettingsPanel onClose={() => setActivePanel(null)} />
            )}
            {activePanel === 'rag' && (
              <RAGManager onClose={() => setActivePanel(null)} />
            )}
          </motion.div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <MainContent />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}
