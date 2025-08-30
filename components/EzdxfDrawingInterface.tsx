import React, { useState, useEffect } from 'react';
import { EzdxfDrawingService, DrawingRequest, DrawingResult } from '../services/ezdxfDrawingService';
import { DrawingCodeGenerator } from '../services/drawingCodeGenerator';
import { DrawingSpecificationParser } from '../services/drawingSpecificationParser';
import { DrawingSettingsPanel, DrawingSettings } from './DrawingSettingsPanel';
import { DrawingSettingsService } from '../services/drawingSettingsService';
import { DrawingService, ProjectDrawing } from '../services/drawingService';
import { ProjectService } from '../services/projectService';

interface EzdxfDrawingInterfaceProps {
  userInput: string;
  projectContext: string;
  designContext: string;
  guidelines: string;
  referenceText: string;
  onDrawingGenerated: (result: DrawingResult) => void;
  onError: (error: string) => void;
  onGenerateDrawing?: () => Promise<void>; // Function to trigger drawing generation
}

export const EzdxfDrawingInterface: React.FC<EzdxfDrawingInterfaceProps> = ({
  userInput,
  projectContext,
  designContext,
  guidelines,
  referenceText,
  onDrawingGenerated,
  onError,
  onGenerateDrawing
}) => {
  const [serverStatus, setServerStatus] = useState<{ running: boolean; message: string; version?: string } | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  // Settings management
  const [drawingSettings, setDrawingSettings] = useState<DrawingSettings>(DrawingSettingsService.loadSettings());
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Drawing persistence
  const [currentDrawing, setCurrentDrawing] = useState<ProjectDrawing | null>(null);
  const [projectDrawings, setProjectDrawings] = useState<ProjectDrawing[]>([]);

  // Get current project ID
  const getCurrentProjectId = (): string => {
    const currentProjectId = ProjectService.getCurrentProjectId();
    return currentProjectId || 'default';
  };

  // Load drawings on component mount and when project changes
  useEffect(() => {
    try {
      const projectId = getCurrentProjectId();
      const drawings = DrawingService.loadProjectDrawings(projectId);
      setProjectDrawings(drawings);

      // Load the latest drawing if available
      const latestDrawing = DrawingService.getLatestProjectDrawing(projectId);
      if (latestDrawing) {
        setCurrentDrawing(latestDrawing);
        // Restore the drawing result to display
        onDrawingGenerated(latestDrawing.result);
      }
    } catch (error) {
      console.error('Error loading drawings:', error);
      // Continue without crashing the app
    }
  }, []);



  // Check server status on component mount
  React.useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    setIsCheckingServer(true);
    try {
      const status = await EzdxfDrawingService.checkServerStatus();
      setServerStatus(status);
    } catch (error) {
      setServerStatus({
        running: false,
        message: 'Cannot connect to local server'
      });
    } finally {
      setIsCheckingServer(false);
    }
  };

  const testServer = async () => {
    setIsCheckingServer(true);
    try {
      const result = await EzdxfDrawingService.testServer();
      if (result.success) {
        setServerStatus({
          running: true,
          message: result.message,
          version: 'Working'
        });
      } else {
        setServerStatus({
          running: false,
          message: result.message
        });
      }
    } catch (error) {
      setServerStatus({
        running: false,
        message: 'Server test failed'
      });
    } finally {
      setIsCheckingServer(false);
    }
  };



  const handleSettingsChange = (newSettings: DrawingSettings) => {
    setDrawingSettings(newSettings);
    DrawingSettingsService.saveSettings(newSettings);
  };

  // Drawing generation function that can be called externally
  const generateDrawing = async (): Promise<void> => {
    if (!userInput.trim()) {
      onError('Please provide drawing requirements');
      return;
    }

    if (!serverStatus?.running) {
      onError('Please start the local ezdxf server first');
      return;
    }

    try {
      // Step 1: LLM provides precise attribute specifications
      const specification = await DrawingSpecificationParser.parseDescription(userInput);
      console.log('LLM Attribute Specification:', specification);

      // Step 2: App generates reliable Python code from attributes using settings
      const pythonCode = DrawingCodeGenerator.generatePythonCode(specification, drawingSettings);
      console.log('App-Generated Python Code:', pythonCode);

      // Step 3: Execute reliable code on local server
      const result = await EzdxfDrawingService.executeDrawingCode(pythonCode, specification.title || 'drawing');

      // Step 4: Save the drawing to persistence
      try {
        const savedDrawing = DrawingService.saveDrawing({
          projectId: getCurrentProjectId(),
          title: extractTitle(userInput),
          description: extractDescription(userInput),
          specification,
          generatedCode: pythonCode,
          result,
          settings: drawingSettings
        });

        setCurrentDrawing(savedDrawing);

        // Update project drawings list
        const updatedDrawings = DrawingService.loadProjectDrawings(getCurrentProjectId());
        setProjectDrawings(updatedDrawings);
      } catch (error) {
        console.error('Error saving drawing:', error);
        // Continue without crashing - drawing still works, just not saved
      }

      onDrawingGenerated(result);

    } catch (error) {
      console.error('Drawing generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate drawing';
      onError(errorMessage);
    }
  };

  // Helper functions
  const extractTitle = (input: string): string => {
    const lines = input.split('\n');
    const firstLine = lines[0].trim();

    if (firstLine.length > 5 && firstLine.length < 50 && !firstLine.includes('.')) {
      return firstLine;
    }

    const drawingMatch = input.match(/(?:draw|create|generate|design)\s+(?:a\s+)?(.+?)(?:\s+for|\s+with|\.|$)/i);
    if (drawingMatch && drawingMatch[1]) {
      return drawingMatch[1].trim();
    }

    return `Technical Drawing ${new Date().toLocaleDateString()}`;
  };

  const extractDescription = (input: string): string => {
    return input.trim().substring(0, 200) + (input.length > 200 ? '...' : '');
  };

  // Expose the generation function to parent component
  React.useEffect(() => {
    if (onGenerateDrawing) {
      // This allows the parent component to call generateDrawing
      (onGenerateDrawing as any).current = generateDrawing;
    }
  }, [userInput, drawingSettings, serverStatus]);





  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🔧 Professional CAD Drawing Generator
        </h3>
        <div className="text-sm text-gray-500">
          Powered by ezdxf + Google Cloud Functions
        </div>
      </div>

      {/* Server Status */}
      <div className={`mb-4 p-4 border rounded-lg ${
        serverStatus?.running
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`font-medium ${
            serverStatus?.running ? 'text-green-900' : 'text-red-900'
          }`}>
            🖥️ Local ezdxf Server Status
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={checkServerStatus}
              disabled={isCheckingServer}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
            >
              {isCheckingServer ? '⟳' : '🔄'} Check
            </button>
            {serverStatus?.running && (
              <button
                onClick={testServer}
                disabled={isCheckingServer}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                🧪 Test
              </button>
            )}
          </div>
        </div>

        <div className={`text-sm ${
          serverStatus?.running ? 'text-green-800' : 'text-red-800'
        }`}>
          {serverStatus?.running ? '✅' : '❌'} {serverStatus?.message || 'Checking server...'}
          {serverStatus?.version && (
            <span className="ml-2 text-xs opacity-75">
              (ezdxf {serverStatus.version})
            </span>
          )}
        </div>

        {!serverStatus?.running && (
          <div className="mt-2 text-xs text-red-700">
            <strong>To start the server:</strong><br/>
            • Windows: Double-click <code>start_server.bat</code> in the local-server folder<br/>
            • Linux/Mac: Run <code>./start_server.sh</code> in the local-server folder
          </div>
        )}
      </div>



      {/* Header with Settings */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex-1 mr-4">
            <div className="font-medium text-blue-900">🎯 Professional Attribute-Based Drawing</div>
            <div className="text-sm text-blue-700 mt-1">
              Describe your drawing requirements. AI will provide precise coordinates and attributes, then the app generates reliable code.
            </div>
          </div>

          <button
            onClick={() => setShowSettingsPanel(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
            title="Configure drawing settings"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </button>
        </div>

        {/* Current Settings Summary */}
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
          <strong>Current Settings:</strong> {drawingSettings.units} units,
          Text: {drawingSettings.dimensions.textHeight}px,
          Arrows: {drawingSettings.dimensions.arrowSize}px,
          Format: {drawingSettings.documentFormat}
        </div>

        {/* Current Drawing Info */}
        {currentDrawing && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200 mt-2">
            <strong>Current Drawing:</strong> {currentDrawing.title}
            <span className="text-blue-500 ml-2">
              (Saved {new Date(currentDrawing.timestamp).toLocaleString()})
            </span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Drawing Requirements:
        </label>
        <div className="p-3 bg-gray-50 border rounded-lg">
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {userInput || 'No requirements specified'}
          </div>
        </div>
      </div>

      {/* Context Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Project Context:</h4>
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
            {projectContext || 'No project context'}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Design Context:</h4>
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
            {designContext || 'No design context'}
          </div>
        </div>
      </div>

      {/* Simple Action Buttons */}
      <div className="flex items-center gap-3 mb-4">
        {/* Drawing Management Buttons */}
        {projectDrawings.length > 0 && (
          <>
            <button
              onClick={() => DrawingService.exportProjectDrawings(getCurrentProjectId())}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              title="Export all project drawings"
            >
              📤 Export Drawings
            </button>

            <button
              onClick={() => {
                if (confirm(`Clear all ${projectDrawings.length} drawings for this project?`)) {
                  DrawingService.deleteProjectDrawings(getCurrentProjectId());
                  setProjectDrawings([]);
                  setCurrentDrawing(null);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              title="Clear all project drawings"
            >
              🗑️ Clear All
            </button>
          </>
        )}
      </div>



      {/* Drawing History */}
      {projectDrawings.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">📋 Drawing History ({projectDrawings.length})</h4>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
            <div className="space-y-2">
              {projectDrawings
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5)
                .map((drawing) => (
                <div
                  key={drawing.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    currentDrawing?.id === drawing.id
                      ? 'bg-blue-100 border border-blue-200'
                      : 'bg-white hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    try {
                      setCurrentDrawing(drawing);
                      onDrawingGenerated(drawing.result);
                    } catch (error) {
                      console.error('Error loading drawing:', error);
                    }
                  }}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{drawing.title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(drawing.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {currentDrawing?.id === drawing.id && (
                      <span className="text-xs text-blue-600 font-medium">Current</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this drawing?')) {
                          DrawingService.deleteDrawing(drawing.id);
                          const updated = DrawingService.loadProjectDrawings(getCurrentProjectId());
                          setProjectDrawings(updated);
                          if (currentDrawing?.id === drawing.id) {
                            setCurrentDrawing(null);
                          }
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                      title="Delete drawing"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}

              {projectDrawings.length > 5 && (
                <div className="text-xs text-gray-500 text-center pt-2">
                  ... and {projectDrawings.length - 5} more drawings
                </div>
              )}
            </div>
          </div>
        </div>
      )}





      {/* Drawing Settings Panel */}
      {showSettingsPanel && (
        <DrawingSettingsPanel
          settings={drawingSettings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettingsPanel(false)}
        />
      )}
    </div>
  );
};
