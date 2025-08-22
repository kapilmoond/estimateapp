import React from 'react';
import { OutputMode } from '../types';

interface OutputModeSelectorProps {
  currentMode: OutputMode;
  onModeChange: (mode: OutputMode) => void;
  disabled?: boolean;
}

export const OutputModeSelector: React.FC<OutputModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false
}) => {
  const modes = [
    {
      id: 'discussion' as OutputMode,
      label: 'Discussion',
      description: 'Project scope, components, and items definition',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      id: 'design' as OutputMode,
      label: 'Design',
      description: 'Component design calculations and specifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'drawing' as OutputMode,
      label: 'Drawing',
      description: 'Technical drawings and dimensional details',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 21h10a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a4 4 0 004 4z" />
        </svg>
      )
    }
  ];

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-3">Output Mode</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            disabled={disabled}
            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
              currentMode === mode.id
                ? 'border-blue-500 bg-blue-50 text-blue-900'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center mb-2">
              <div className={`mr-3 ${currentMode === mode.id ? 'text-blue-600' : 'text-gray-400'}`}>
                {mode.icon}
              </div>
              <h4 className="font-semibold">{mode.label}</h4>
            </div>
            <p className="text-sm opacity-75">{mode.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
