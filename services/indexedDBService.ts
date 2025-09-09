/**
 * IndexedDB Service - Modern browser storage for large amounts of data
 * Replaces localStorage with a more robust, scalable solution
 */

export interface DBSchema {
  projects: {
    key: string;
    value: any;
  };
  conversations: {
    key: string;
    value: any;
  };
  designs: {
    key: string;
    value: any;
  };
  drawings: {
    key: string;
    value: any;
  };
  templates: {
    key: string;
    value: any;
  };
  guidelines: {
    key: string;
    value: any;
  };
  knowledgeBase: {
    key: string;
    value: any;
  };
  settings: {
    key: string;
    value: any;
  };
}

export class IndexedDBService {
  private static readonly DB_NAME = 'HSRConstructionEstimator';
  private static readonly DB_VERSION = 1;
  private static db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB connection
   */
  static async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        const stores = ['projects', 'conversations', 'designs', 'drawings', 'templates', 'guidelines', 'knowledgeBase', 'settings'];
        
        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            
            // Add indexes for common queries
            if (storeName === 'projects') {
              store.createIndex('name', 'name', { unique: false });
              store.createIndex('lastModified', 'lastModified', { unique: false });
            }
            if (storeName === 'conversations') {
              store.createIndex('projectId', 'projectId', { unique: false });
              store.createIndex('timestamp', 'timestamp', { unique: false });
            }
          }
        });
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private static async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  /**
   * Generic save method
   */
  static async save<T>(storeName: keyof DBSchema, data: T & { id: string }): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic load method
   */
  static async load<T>(storeName: keyof DBSchema, id: string): Promise<T | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic load all method
   */
  static async loadAll<T>(storeName: keyof DBSchema): Promise<T[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic delete method
   */
  static async delete(storeName: keyof DBSchema, id: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear entire store
   */
  static async clearStore(storeName: keyof DBSchema): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    storeName: string;
    count: number;
    estimatedSize: number;
  }[]> {
    const db = await this.ensureDB();
    const stores = ['projects', 'conversations', 'designs', 'drawings', 'templates', 'guidelines', 'knowledgeBase', 'settings'];
    const stats = [];

    for (const storeName of stores) {
      const count = await this.getStoreCount(storeName as keyof DBSchema);
      const estimatedSize = await this.getStoreSize(storeName as keyof DBSchema);
      stats.push({ storeName, count, estimatedSize });
    }

    return stats;
  }

  /**
   * Get count of items in store
   */
  private static async getStoreCount(storeName: keyof DBSchema): Promise<number> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Estimate store size (rough calculation)
   */
  private static async getStoreSize(storeName: keyof DBSchema): Promise<number> {
    const items = await this.loadAll(storeName);
    const jsonString = JSON.stringify(items);
    return new Blob([jsonString]).size;
  }

  /**
   * Migrate data from localStorage to IndexedDB
   */
  static async migrateFromLocalStorage(): Promise<{
    migrated: string[];
    errors: string[];
  }> {
    const migrated: string[] = [];
    const errors: string[] = [];

    const migrations = [
      { key: 'hsr-projects', store: 'projects' as keyof DBSchema },
      { key: 'hsr-conversation-threads', store: 'conversations' as keyof DBSchema },
      { key: 'hsr-component-designs', store: 'designs' as keyof DBSchema },
      { key: 'hsr_project_drawings', store: 'drawings' as keyof DBSchema },
      { key: 'hsr-master-templates', store: 'templates' as keyof DBSchema },
      { key: 'hsr-user-guidelines', store: 'guidelines' as keyof DBSchema },
      { key: 'hsr-knowledge-base', store: 'knowledgeBase' as keyof DBSchema },
    ];

    for (const migration of migrations) {
      try {
        const data = localStorage.getItem(migration.key);
        if (data) {
          const parsed = JSON.parse(data);
          
          if (Array.isArray(parsed)) {
            // Handle arrays of items
            for (const item of parsed) {
              if (item.id) {
                await this.save(migration.store, item);
              }
            }
          } else if (parsed.id) {
            // Handle single items
            await this.save(migration.store, parsed);
          }
          
          migrated.push(migration.key);
        }
      } catch (error) {
        console.error(`Failed to migrate ${migration.key}:`, error);
        errors.push(`${migration.key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { migrated, errors };
  }

  /**
   * Clear all data (for reset functionality)
   */
  static async clearAllData(): Promise<void> {
    const stores: (keyof DBSchema)[] = ['projects', 'conversations', 'designs', 'drawings', 'templates', 'guidelines', 'knowledgeBase', 'settings'];
    
    for (const store of stores) {
      await this.clearStore(store);
    }
  }

  /**
   * Export all data for backup
   */
  static async exportAllData(): Promise<Record<string, any[]>> {
    const stores: (keyof DBSchema)[] = ['projects', 'conversations', 'designs', 'drawings', 'templates', 'guidelines', 'knowledgeBase', 'settings'];
    const exportData: Record<string, any[]> = {};
    
    for (const store of stores) {
      exportData[store] = await this.loadAll(store);
    }
    
    return exportData;
  }

  /**
   * Import data from backup
   */
  static async importData(data: Record<string, any[]>): Promise<void> {
    for (const [storeName, items] of Object.entries(data)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.id) {
            await this.save(storeName as keyof DBSchema, item);
          }
        }
      }
    }
  }

  /**
   * Check if IndexedDB is supported
   */
  static isSupported(): boolean {
    return 'indexedDB' in window && indexedDB !== null;
  }

  /**
   * Get database size estimate
   */
  static async getDatabaseSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }

  /**
   * Get available storage space
   */
  static async getAvailableSpace(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      return quota - usage;
    }
    return 0;
  }

  /**
   * Format bytes to human readable format
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Conversation-specific methods
   */
  static async saveConversation(projectId: string, conversationHistory: any[]): Promise<void> {
    const conversationData = {
      id: `conversation_${projectId}`,
      projectId,
      messages: conversationHistory,
      timestamp: Date.now(),
      messageCount: conversationHistory.length
    };

    await this.save('conversations', conversationData);
  }

  static async loadConversation(projectId: string): Promise<any[] | null> {
    const conversation = await this.load('conversations', `conversation_${projectId}`);
    return conversation ? conversation.messages : null;
  }

  static async clearConversation(projectId: string): Promise<void> {
    await this.delete('conversations', `conversation_${projectId}`);
  }

  static async clearAllConversations(): Promise<void> {
    await this.clearStore('conversations');
  }

  /**
   * Get conversation statistics
   */
  static async getConversationStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    oldestConversation: Date | null;
    newestConversation: Date | null;
    estimatedSize: string;
  }> {
    const conversations = await this.loadAll<any>('conversations');

    let totalMessages = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    conversations.forEach(conv => {
      totalMessages += conv.messageCount || 0;
      if (conv.timestamp < oldestTimestamp) oldestTimestamp = conv.timestamp;
      if (conv.timestamp > newestTimestamp) newestTimestamp = conv.timestamp;
    });

    const estimatedSize = await this.getStoreSize('conversations');

    return {
      totalConversations: conversations.length,
      totalMessages,
      oldestConversation: oldestTimestamp === Infinity ? null : new Date(oldestTimestamp),
      newestConversation: newestTimestamp === 0 ? null : new Date(newestTimestamp),
      estimatedSize: this.formatBytes(estimatedSize)
    };
  }
}
