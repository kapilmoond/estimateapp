import React, { useEffect, useState } from 'react';
import { BackgroundHSRProgress, BackgroundHSRService } from '../services/backgroundHSRService';

interface BackgroundHSRProgressProps {
  progress: BackgroundHSRProgress;
  onCancel?: () => void;
  showDetails?: boolean;
}

export const BackgroundHSRProgressComponent: React.FC<BackgroundHSRProgressProps> = ({
  progress,
  onCancel,
  showDetails = true
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const progressData = BackgroundHSRService.createProgressData(progress);
  
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getProgressBarColor = (stage: string): string => {
    switch (stage) {
      case 'generating_keywords': return 'bg-blue-500';
      case 'searching_hsr': return 'bg-purple-500';
      case 'processing_results': return 'bg-orange-500';
      case 'complete': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStageIcon = (stage: string): string => {
    switch (stage) {
      case 'generating_keywords': return '🔑';
      case 'searching_hsr': return '🔍';
      case 'processing_results': return '⚙️';
      case 'complete': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getStageIcon(progress.stage)}</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Background HSR Processing
            </h3>
            <p className="text-sm text-gray-600">
              {progress.currentStep || 'Processing...'}
            </p>
          </div>
        </div>
        
        {onCancel && progress.stage !== 'complete' && progress.stage !== 'error' && (
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {progress.message}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress.progress)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor(progress.stage)}`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          {[
            { id: 'generating_keywords', label: 'Keywords', icon: '🔑' },
            { id: 'searching_hsr', label: 'Search', icon: '🔍' },
            { id: 'processing_results', label: 'Process', icon: '⚙️' },
            { id: 'complete', label: 'Complete', icon: '✅' }
          ].map((stage, index) => {
            const isActive = progress.stage === stage.id;
            const isCompleted = ['generating_keywords', 'searching_hsr', 'processing_results', 'complete'].indexOf(progress.stage) > index;
            const isCurrent = progress.stage === stage.id;
            
            return (
              <div key={stage.id} className="flex items-center">
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors
                    ${isCurrent 
                      ? 'bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {isCompleted ? '✓' : stage.icon}
                </div>
                {index < 3 && (
                  <div className={`w-8 h-1 mx-1 ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          {[
            { label: 'Keywords' },
            { label: 'Search' },
            { label: 'Process' },
            { label: 'Complete' }
          ].map((stage) => (
            <div key={stage.label} className="text-xs text-center text-gray-600" style={{ width: '60px' }}>
              {stage.label}
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium text-gray-700">Time Elapsed</div>
            <div className="text-gray-900">{formatTime(timeElapsed)}</div>
          </div>
          
          {progress.estimatedTimeRemaining && progress.stage !== 'complete' && progress.stage !== 'error' && (
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium text-gray-700">Est. Remaining</div>
              <div className="text-gray-900">{formatTime(progress.estimatedTimeRemaining)}</div>
            </div>
          )}
          
          {progress.stage === 'complete' && (
            <div className="bg-green-50 p-3 rounded">
              <div className="font-medium text-green-700">Status</div>
              <div className="text-green-900">Processing Complete</div>
            </div>
          )}
          
          {progress.stage === 'error' && (
            <div className="bg-red-50 p-3 rounded">
              <div className="font-medium text-red-700">Error</div>
              <div className="text-red-900">Processing Failed</div>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {progress.stage === 'complete' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span className="text-green-800 font-medium">
              HSR processing completed successfully! Keywords generated and HSR items found.
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {progress.stage === 'error' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">❌</span>
            <span className="text-red-800 font-medium">
              HSR processing failed. Please try again.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for inline display
export const CompactHSRProgress: React.FC<{
  progress: BackgroundHSRProgress;
  onCancel?: () => void;
}> = ({ progress, onCancel }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-lg">{getStageIcon(progress.stage)}</div>
          <div>
            <div className="text-sm font-medium text-blue-900">
              {progress.currentStep || 'Processing...'}
            </div>
            <div className="text-xs text-blue-700">
              {progress.message}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-blue-900">
            {Math.round(progress.progress)}%
          </div>
          {onCancel && progress.stage !== 'complete' && progress.stage !== 'error' && (
            <button
              onClick={onCancel}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
        <div
          className="h-2 bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    </div>
  );
};

function getStageIcon(stage: string): string {
  switch (stage) {
    case 'generating_keywords': return '🔑';
    case 'searching_hsr': return '🔍';
    case 'processing_results': return '⚙️';
    case 'complete': return '✅';
    case 'error': return '❌';
    default: return '⏳';
  }
}
