import React, { useState, useEffect } from 'react';
import { EnhancedProjectService } from '../services/enhancedProjectService';
import { IndexedDBService } from '../services/indexedDBService';

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

export const StorageManager: React.FC<StorageManagerProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  onConversationCleared
}) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const storageStats = await EnhancedProjectService.getStorageStats();
      setStats(storageStats);
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalProjects}</div>
                  <div className="text-sm text-gray-600">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.totalMessages}</div>
                  <div className="text-sm text-gray-600">Chat Messages</div>
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
