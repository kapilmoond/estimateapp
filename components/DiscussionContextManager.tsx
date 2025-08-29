import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { LLMService } from '../services/llmService';

interface DiscussionContextManagerProps {
  conversationHistory: ChatMessage[];
  onContextPurified: (purifiedContext: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const DiscussionContextManager: React.FC<DiscussionContextManagerProps> = ({
  conversationHistory,
  onContextPurified,
  isVisible,
  onClose
}) => {
  const [isPurifying, setIsPurifying] = useState(false);
  const [purifiedContext, setPurifiedContext] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const handlePurifyContext = async () => {
    setIsPurifying(true);
    
    try {
      // Create a comprehensive prompt for context purification
      const conversationText = conversationHistory
        .map(msg => `${msg.role.toUpperCase()}: ${msg.text}`)
        .join('\n\n');

      const purificationPrompt = `Analyze the following construction project discussion and create a comprehensive, purified context summary that captures all final decisions, requirements, and project details.

**ORIGINAL DISCUSSION:**
${conversationText}

**CONTEXT PURIFICATION REQUIREMENTS:**
1. Extract all final project requirements and specifications
2. Identify confirmed decisions (ignore reversed or changed decisions)
3. Summarize project scope, objectives, and constraints
4. Include all technical requirements and standards mentioned
5. Capture material preferences, design criteria, and quality standards
6. Note any specific codes, regulations, or compliance requirements
7. Include budget considerations, timeline constraints, or special conditions
8. Summarize site conditions, environmental factors, or location-specific details
9. Extract any stakeholder requirements or approval criteria
10. Include any lessons learned or important considerations discussed

**OUTPUT FORMAT:**
Create a well-organized summary with clear sections:

# PROJECT CONTEXT SUMMARY

## Project Overview
[Brief description of the project type, scale, and primary objectives]

## Scope and Requirements
[Detailed list of confirmed project requirements and specifications]

## Technical Specifications
[Technical standards, codes, materials, and design criteria]

## Constraints and Considerations
[Budget, timeline, site conditions, regulatory requirements]

## Key Decisions Made
[Important decisions reached during the discussion]

## Special Requirements
[Any unique or special requirements for this project]

**IMPORTANT:** 
- Focus only on FINAL decisions and confirmed requirements
- Ignore any discussions about options that were ultimately rejected
- Be comprehensive but concise
- Use professional construction industry terminology
- Organize information logically for easy reference
- This summary will be used as context for future design and estimation work

Generate a professional context summary that captures the essence of the project discussion for use in subsequent design and estimation phases.`;

      const purified = await LLMService.generateContent(purificationPrompt);
      
      if (!purified || purified.trim().length < 50) {
        throw new Error('Generated context summary is too short. Please try again.');
      }

      setPurifiedContext(purified);
      setShowPreview(true);
      
    } catch (error) {
      console.error('Context purification error:', error);
      alert(`Failed to purify context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPurifying(false);
    }
  };

  const handleApplyPurifiedContext = () => {
    onContextPurified(purifiedContext);
    setPurifiedContext('');
    setShowPreview(false);
    onClose();
  };

  const handleDownloadContext = () => {
    const blob = new Blob([purifiedContext], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_context_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b bg-blue-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              🧹 Discussion Context Manager
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Purify your discussion context to create a clean, comprehensive summary of final project decisions and requirements.
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!showPreview ? (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Current Discussion Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Total Messages:</strong> {conversationHistory.length}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Discussion Length:</strong> {conversationHistory.reduce((acc, msg) => acc + msg.text.length, 0).toLocaleString()} characters
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Last Updated:</strong> {new Date().toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">What Context Purification Does</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• <strong>Extracts final decisions</strong> - Ignores reversed or changed decisions</li>
                  <li>• <strong>Summarizes requirements</strong> - Creates comprehensive project scope</li>
                  <li>• <strong>Organizes information</strong> - Structures data for easy reference</li>
                  <li>• <strong>Removes redundancy</strong> - Eliminates repetitive discussions</li>
                  <li>• <strong>Focuses on outcomes</strong> - Captures what was decided, not the process</li>
                </ul>
              </div>

              <button
                onClick={handlePurifyContext}
                disabled={isPurifying || conversationHistory.length === 0}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {isPurifying ? '🔄 Purifying Context...' : '🧹 Purify Discussion Context'}
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Purified Context Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadContext}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    📄 Download
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    ← Back
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border mb-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {purifiedContext}
                </pre>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleApplyPurifiedContext}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Apply Purified Context
                </button>
                <button
                  onClick={() => {
                    setPurifiedContext('');
                    setShowPreview(false);
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
