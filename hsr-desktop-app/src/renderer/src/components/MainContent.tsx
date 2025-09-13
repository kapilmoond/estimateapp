import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '../contexts/AppStateContext';
import { ScopingStep } from './steps/ScopingStep';
import { DesignStep } from './steps/DesignStep';
import { DrawingStep } from './steps/DrawingStep';
import { EstimationStep } from './steps/EstimationStep';
import { ReviewStep } from './steps/ReviewStep';
import { WelcomeScreen } from './WelcomeScreen';

export function MainContent() {
  const { state } = useAppState();

  const renderCurrentStep = () => {
    if (!state.currentProject) {
      return <WelcomeScreen />;
    }

    switch (state.currentStep) {
      case 'scoping':
        return <ScopingStep />;
      case 'design':
        return <DesignStep />;
      case 'drawing':
        return <DrawingStep />;
      case 'estimation':
        return <EstimationStep />;
      case 'review':
        return <ReviewStep />;
      default:
        return <ScopingStep />;
    }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={state.currentProject?.id || 'welcome'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {renderCurrentStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
