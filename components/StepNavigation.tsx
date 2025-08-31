import React from 'react';

type Step = 'scoping' | 'generatingKeywords' | 'approvingKeywords' | 'approvingHsrItems' | 'approvingRefinedHsrItems' | 'generatingEstimate' | 'reviewingEstimate' | 'done';

interface StepNavigationProps {
  currentStep: Step;
  onStepChange: (step: Step) => void;
  hasScope: boolean;
  hasKeywords: boolean;
  hasHsrItems: boolean;
  hasEstimate: boolean;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  onStepChange,
  hasScope,
  hasKeywords,
  hasHsrItems,
  hasEstimate
}) => {
  const steps = [
    { id: 'scoping' as Step, label: '📋 Project Scope', enabled: true },
    { id: 'approvingKeywords' as Step, label: '🔑 Keywords', enabled: hasScope },
    { id: 'approvingHsrItems' as Step, label: '📊 HSR Items', enabled: hasKeywords },
    { id: 'reviewingEstimate' as Step, label: '💰 Cost Estimate', enabled: hasHsrItems }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep);
  };

  const handleStepClick = (stepId: Step) => {
    const step = steps.find(s => s.id === stepId);
    if (step && step.enabled) {
      onStepChange(stepId);
    }
  };

  const canGoBack = () => {
    const currentIndex = getCurrentStepIndex();
    return currentIndex > 0;
  };

  const canGoForward = () => {
    const currentIndex = getCurrentStepIndex();
    return currentIndex < steps.length - 1 && steps[currentIndex + 1].enabled;
  };

  const goBack = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      onStepChange(steps[currentIndex - 1].id);
    }
  };

  const goForward = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1 && steps[currentIndex + 1].enabled) {
      onStepChange(steps[currentIndex + 1].id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">🧭 Project Navigation</h3>
        <div className="text-sm text-gray-500">
          Step {getCurrentStepIndex() + 1} of {steps.length}
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="mt-4 mb-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isCompleted = index < getCurrentStepIndex();
            const isEnabled = step.enabled;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isEnabled}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors
                    ${isCurrent 
                      ? 'bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : isEnabled 
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                  title={step.label}
                >
                  {isCompleted ? '✓' : index + 1}
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-1 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between mt-2">
          {steps.map((step) => (
            <div key={step.id} className="text-xs text-center" style={{ width: '80px' }}>
              <div className={`${step.id === currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={!canGoBack()}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous Step
        </button>

        <div className="text-sm text-gray-600">
          Navigate between completed project phases
        </div>

        <button
          onClick={goForward}
          disabled={!canGoForward()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Next Step →
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-2">Quick Actions:</div>
        <div className="flex flex-wrap gap-2">
          {hasScope && (
            <button
              onClick={() => onStepChange('approvingKeywords')}
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors"
            >
              🔑 Regenerate Keywords
            </button>
          )}
          {hasKeywords && (
            <button
              onClick={() => onStepChange('approvingHsrItems')}
              className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
            >
              📊 Search HSR Again
            </button>
          )}
          {hasEstimate && (
            <button
              onClick={() => onStepChange('reviewingEstimate')}
              className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
            >
              💰 Review Estimate
            </button>
          )}
        </div>
      </div>

      {/* Phase Information */}
      <div className="mt-3 p-3 bg-gray-50 rounded-md">
        <div className="text-xs text-gray-600">
          <strong>Current Phase:</strong> {steps.find(s => s.id === currentStep)?.label}
          <br />
          <strong>Status:</strong> You can navigate back to any completed phase to make changes or review work.
        </div>
      </div>
    </div>
  );
};
