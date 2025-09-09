import React, { useState, useEffect } from 'react';
import { EnhancedProjectService } from '../services/enhancedProjectService';
import { IndexedDBService } from '../services/indexedDBService';
import { EnhancedDrawingService, ProjectDrawing } from '../services/drawingService';

interface StorageManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId?: string;
  onConversationCleared?: () => void;
}

interface StorageStats {
  totalProjects: number;
  totalConversations: number;
  totalMessages: number;
  databaseSize: string;
  availableSpace: string;
  conversationStats: any;
}

interface DrawingStats {
  totalDrawings: number;
  projectCounts: Record<string, number>;
  totalSize: number;
  oldestDrawing?: ProjectDrawing;
  newestDrawing?: ProjectDrawing;
}

export const StorageManager: React.FC<StorageManagerProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onConversationCleared
}) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [drawingStats, setDrawingStats] = useState<DrawingStats | null>(null);
  const [projectDrawings, setProjectDrawings] = useState<ProjectDrawing[]>([]);
  const [selectedDrawings, setSelectedDrawings] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'drawings' | 'backup'>('overview');

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load storage stats
      const storageStats = await EnhancedProjectService.getStorageStats();
      setStats(storageStats);

      // Load drawing stats
      const drawingStatsData = await EnhancedDrawingService.getDrawingStats();
      setDrawingStats(drawingStatsData);

      // Load current project drawings if available
      if (currentProjectId) {
        const drawings = await EnhancedDrawingService.loadProjectDrawings(currentProjectId);
        setProjectDrawings(drawings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCurrentConversation = async () => {
    if (!currentProjectId) {
      setError('No current project selected');
      return;
    }

    if (!confirm('Are you sure you want to clear the conversation history for this project? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await EnhancedProjectService.clearProjectConversation(currentProjectId);
      await loadStats();
      onConversationCleared?.();
      alert('Conversation history cleared successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllConversations = async () => {
    if (!confirm('Are you sure you want to clear ALL conversation histories for ALL projects? This action cannot be undone and will free up significant memory.')) {
      return;
    }

    try {
      setLoading(true);
      await EnhancedProjectService.clearAllConversations();
      await loadStats();
      onConversationCleared?.();
      alert('All conversation histories cleared successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const blob = await EnhancedProjectService.exportAllData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hsr-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Data exported successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('Importing data will add to existing data. Are you sure you want to continue?')) {
      return;
    }

    try {
      setLoading(true);
      await EnhancedProjectService.importData(file);
      await loadStats();
      alert('Data imported successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  // Drawing Management Functions
  const handleDeleteSelectedDrawings = async () => {
    if (selectedDrawings.size === 0) return;

    if (!window.confirm(`⚠️ This will permanently delete ${selectedDrawings.size} selected drawing(s). This action cannot be undone. Continue?`)) {
      return;
    }

    try {
      setLoading(true);
      let deletedCount = 0;

      for (const drawingId of selectedDrawings) {
        const success = await EnhancedDrawingService.deleteDrawing(drawingId);
        if (success) deletedCount++;
      }

      setSelectedDrawings(new Set());
      await loadStats();

      alert(`Successfully deleted ${deletedCount} drawings`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete drawings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProjectDrawings = async (projectId: string) => {
    if (!window.confirm(`⚠️ This will permanently delete ALL drawings for this project. This action cannot be undone. Continue?`)) {
      return;
    }

    try {
      setLoading(true);
      const deletedCount = await EnhancedDrawingService.deleteProjectDrawings(projectId);
      await loadStats();

      alert(`Successfully deleted ${deletedCount} drawings for project`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project drawings');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllDrawings = async () => {
    if (!window.confirm('⚠️ This will permanently delete ALL drawings across ALL projects. This action cannot be undone. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const deletedCount = await EnhancedDrawingService.clearAllDrawings();
      await loadStats();

      alert(`Successfully deleted ${deletedCount} drawings`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all drawings');
    } finally {
      setLoading(false);
    }
  };

  const toggleDrawingSelection = (drawingId: string) => {
    const newSelection = new Set(selectedDrawings);
    if (newSelection.has(drawingId)) {
      newSelection.delete(drawingId);
    } else {
      newSelection.add(drawingId);
    }
    setSelectedDrawings(newSelection);
  };

  const selectAllDrawings = () => {
    setSelectedDrawings(new Set(projectDrawings.map(d => d.id)));
  };

  const clearDrawingSelection = () => {
    setSelectedDrawings(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">💾 Storage Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading storage information...</p>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Storage Statistics */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">📊 Storage Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalProjects}</div>
                  <div className="text-sm text-gray-600">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.totalMessages}</div>
                  <div className="text-sm text-gray-600">Chat Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{drawingStats?.totalDrawings || 0}</div>
                  <div className="text-sm text-gray-600">Drawings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.databaseSize}</div>
                  <div className="text-sm text-gray-600">Database Size</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-lg font-semibold text-gray-700">Available Space: {stats.availableSpace}</div>
                <div className="text-sm text-gray-500">Local browser storage remaining</div>
              </div>
            </div>

            {/* Memory Management */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">🧹 Memory Management</h3>
              <p className="text-gray-700 mb-4">
                Clear conversation histories to free up browser memory and improve performance.
                Your projects and data will remain intact.
              </p>
              
              <div className="space-y-3">
                {currentProjectId && (
                  <button
                    onClick={handleClearCurrentConversation}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
                  >
                    🗑️ Clear Current Project Chat History
                  </button>
                )}
                
                <button
                  onClick={handleClearAllConversations}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                >
                  🗑️ Clear ALL Chat Histories (All Projects)
                </button>
              </div>
              
              <div className="mt-3 text-sm text-gray-600">
                💡 <strong>Tip:</strong> Clearing chat histories can free up significant memory, especially for projects with long conversations.
              </div>
            </div>

            {/* Drawing Management */}
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-800 mb-3">📐 Drawing Management</h3>
              <p className="text-gray-700 mb-4">
                Manage your technical drawings and CAD files. Drawings are stored persistently and linked to projects.
              </p>

              {drawingStats && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-orange-600">Total Drawings:</span>
                      <div className="text-orange-800">{drawingStats.totalDrawings}</div>
                    </div>
                    <div>
                      <span className="font-medium text-orange-600">Storage Size:</span>
                      <div className="text-orange-800">{(drawingStats.totalSize / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <div>
                      <span className="font-medium text-orange-600">Projects:</span>
                      <div className="text-orange-800">{Object.keys(drawingStats.projectCounts).length}</div>
                    </div>
                  </div>

                  {Object.keys(drawingStats.projectCounts).length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-orange-600 text-sm">Per Project:</span>
                      <div className="text-orange-800 text-sm">
                        {Object.entries(drawingStats.projectCounts).map(([projectId, count]) => (
                          <span key={projectId} className="inline-block mr-3">
                            {projectId}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Current Project Drawings */}
              {currentProjectId && projectDrawings.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-orange-700 mb-2">Current Project Drawings ({projectDrawings.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {projectDrawings.map((drawing) => (
                      <div key={drawing.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedDrawings.has(drawing.id)}
                            onChange={() => toggleDrawingSelection(drawing.id)}
                            className="mr-2"
                          />
                          <div>
                            <div className="font-medium">{drawing.title}</div>
                            <div className="text-gray-500 text-xs">
                              {new Date(drawing.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => EnhancedDrawingService.deleteDrawing(drawing.id).then(() => loadStats())}
                          className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-2 text-sm">
                    <button
                      onClick={selectAllDrawings}
                      className="px-3 py-1 bg-orange-200 text-orange-800 rounded hover:bg-orange-300"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearDrawingSelection}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Clear Selection
                    </button>
                    {selectedDrawings.size > 0 && (
                      <button
                        onClick={handleDeleteSelectedDrawings}
                        className="px-3 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300"
                      >
                        Delete Selected ({selectedDrawings.size})
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {currentProjectId && (
                  <button
                    onClick={() => handleDeleteProjectDrawings(currentProjectId)}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
                  >
                    🗑️ Clear Current Project Drawings
                  </button>
                )}

                <button
                  onClick={handleClearAllDrawings}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                >
                  🗑️ Clear ALL Drawings (All Projects)
                </button>
              </div>

              <div className="mt-3 text-sm text-gray-600">
                💡 <strong>Tip:</strong> Drawings are stored persistently and will remain after browser refresh. Use selective deletion to manage storage space.
              </div>
            </div>

            {/* Data Backup & Restore */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3">💾 Backup & Restore</h3>
              <p className="text-gray-700 mb-4">
                Export your data for backup or import previously exported data.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleExportData}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  📤 Export All Data (Backup)
                </button>
                
                <div>
                  <label className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-center transition-colors">
                    📥 Import Data (Restore)
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                      disabled={loading}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* IndexedDB Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">ℹ️ Storage Technology</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>✅ IndexedDB:</strong> Your data is stored locally on your computer using modern browser technology.
                </p>
                <p>
                  <strong>🔒 Privacy:</strong> No data is sent to external servers - everything stays on your device.
                </p>
                <p>
                  <strong>📈 Capacity:</strong> Can store gigabytes of data, much more than traditional localStorage.
                </p>
                <p>
                  <strong>⚡ Performance:</strong> Optimized for large amounts of data with better memory management.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
