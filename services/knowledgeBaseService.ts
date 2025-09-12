import {
  KnowledgeBaseDocument,
  DocumentChunk,
  DocumentMetadata,
  ChunkMetadata,
  KnowledgeBaseConfig,
  RAGContext,
  KnowledgeBaseStats
} from '../types';
import { FileParsingService, ParsedFile } from './fileParsingService';
import { IndexedDBService } from './indexedDBService';

/**
 * Enhanced Knowledge Base Service using IndexedDB
 * Provides unlimited storage capacity for large documents
 */
export class EnhancedKnowledgeBaseService {
  private static readonly CONFIG_KEY = 'kb-config';

  private static defaultConfig: KnowledgeBaseConfig = {
    chunkSize: 1000,
    chunkOverlap: 200,
    maxChunks: 100,
    enableEmbeddings: false,
    embeddingModel: 'text-embedding-ada-002',
    similarityThreshold: 0.7
  };

  // Load all knowledge base documents from IndexedDB
  static async loadDocuments(): Promise<KnowledgeBaseDocument[]> {
    try {
      const documents = await IndexedDBService.loadAll<KnowledgeBaseDocument>('knowledgeBase');
      return documents.map((doc: any) => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading knowledge base documents from IndexedDB:', error);
      return [];
    }
  }

  // Save documents to IndexedDB
  static async saveDocument(document: KnowledgeBaseDocument): Promise<void> {
    try {
      await IndexedDBService.save('knowledgeBase', document);
    } catch (error) {
      console.error('Error saving knowledge base document to IndexedDB:', error);
      throw new Error('Failed to save knowledge base document');
    }
  }

  // Add a new document to the knowledge base with professional parsing
  static async addDocument(
    file: File,
    content?: string,
    metadata?: Partial<DocumentMetadata>
  ): Promise<KnowledgeBaseDocument> {
    const config = await this.getConfig();
    const documentId = this.generateId();

    // Use professional file parsing
    let parsedFile: ParsedFile;
    let finalContent: string;

    if (content) {
      // Use provided content (legacy support)
      finalContent = content;
      parsedFile = {
        name: file.name,
        type: FileParsingService.getFileType(file),
        size: file.size,
        content,
        metadata: {},
        parsedAt: Date.now()
      };
    } else {
      // Use professional file parsing
      parsedFile = await FileParsingService.parseFile(file);
      finalContent = parsedFile.content;
    }

    // Enhanced file metadata with parsing information
    const fileMetadata: DocumentMetadata = {
      fileSize: file.size,
      title: parsedFile.name,
      fileType: parsedFile.type,
      parsedAt: parsedFile.parsedAt,
      parsingMetadata: parsedFile.metadata,
      ...metadata
    };

    // Create document chunks from parsed content
    const chunks = this.createChunks(documentId, finalContent, config);

    const document: KnowledgeBaseDocument = {
      id: documentId,
      fileName: file.name,
      fileType: parsedFile.type,
      content: finalContent,
      chunks,
      metadata: fileMetadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    // Save to IndexedDB
    await this.saveDocument(document);

    return document;
  }

  // Remove a document from the knowledge base
  static async removeDocument(documentId: string): Promise<void> {
    try {
      await IndexedDBService.delete('knowledgeBase', documentId);
    } catch (error) {
      console.error('Error removing knowledge base document:', error);
      throw new Error('Failed to remove knowledge base document');
    }
  }

  // Toggle document active status
  static async toggleDocumentStatus(documentId: string): Promise<void> {
    try {
      const document = await IndexedDBService.load<KnowledgeBaseDocument>('knowledgeBase', documentId);
      if (document) {
        document.isActive = !document.isActive;
        document.updatedAt = new Date();
        await this.saveDocument(document);
      }
    } catch (error) {
      console.error('Error toggling document status:', error);
      throw new Error('Failed to toggle document status');
    }
  }

  // Get configuration from IndexedDB
  static async getConfig(): Promise<KnowledgeBaseConfig> {
    try {
      const config = await IndexedDBService.load<KnowledgeBaseConfig>('settings', this.CONFIG_KEY);
      return config || this.defaultConfig;
    } catch (error) {
      console.error('Error loading knowledge base config:', error);
      return this.defaultConfig;
    }
  }

  // Save configuration to IndexedDB
  static async saveConfig(config: KnowledgeBaseConfig): Promise<void> {
    try {
      await IndexedDBService.save('settings', { id: this.CONFIG_KEY, ...config });
    } catch (error) {
      console.error('Error saving knowledge base config:', error);
      throw new Error('Failed to save knowledge base configuration');
    }
  }

  // Clear all knowledge base data
  static async clearAll(): Promise<void> {
    try {
      await IndexedDBService.clearStore('knowledgeBase');
      await IndexedDBService.delete('settings', this.CONFIG_KEY);
    } catch (error) {
      console.error('Error clearing knowledge base:', error);
      throw new Error('Failed to clear knowledge base');
    }
  }

  // Export knowledge base data
  static async exportData(): Promise<string> {
    try {
      const documents = await this.loadDocuments();
      const config = await this.getConfig();
      return JSON.stringify({ documents, config }, null, 2);
    } catch (error) {
      console.error('Error exporting knowledge base data:', error);
      throw new Error('Failed to export knowledge base data');
    }
  }

  // Import knowledge base data
  static async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      if (data.documents) {
        for (const doc of data.documents) {
          await this.saveDocument(doc);
        }
      }
      if (data.config) {
        await this.saveConfig(data.config);
      }
    } catch (error) {
      console.error('Error importing knowledge base data:', error);
      throw new Error('Invalid knowledge base data format');
    }
  }

  // Get storage statistics
  static async getStats(): Promise<KnowledgeBaseStats> {
    try {
      const documents = await this.loadDocuments();
      const activeDocuments = documents.filter(doc => doc.isActive);

      const totalSize = documents.reduce((sum, doc) => sum + (doc.metadata.fileSize || 0), 0);
      const totalChunks = documents.reduce((sum, doc) => sum + doc.chunks.length, 0);

      return {
        totalDocuments: documents.length,
        activeDocuments: activeDocuments.length,
        totalSize,
        totalChunks,
        averageChunkSize: totalChunks > 0 ? Math.round(totalSize / totalChunks) : 0
      };
    } catch (error) {
      console.error('Error getting knowledge base stats:', error);
      return {
        totalDocuments: 0,
        activeDocuments: 0,
        totalSize: 0,
        totalChunks: 0,
        averageChunkSize: 0
      };
    }
  }

  // Search documents by query (simple text matching)
  static async searchDocuments(query: string, limit: number = 10): Promise<DocumentChunk[]> {
    try {
      const documents = await this.loadDocuments();
      const activeDocuments = documents.filter(doc => doc.isActive);

      const matchingChunks: DocumentChunk[] = [];
      const queryLower = query.toLowerCase();

      for (const doc of activeDocuments) {
        for (const chunk of doc.chunks) {
          if (chunk.content.toLowerCase().includes(queryLower)) {
            matchingChunks.push(chunk);
          }
        }
      }

      // Sort by relevance (simple: by query frequency in chunk)
      matchingChunks.sort((a, b) => {
        const aMatches = (a.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
        const bMatches = (b.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
        return bMatches - aMatches;
      });

      return matchingChunks.slice(0, limit);
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  // Get RAG context for a query
  static async getRAGContext(query: string, maxChunks: number = 5): Promise<RAGContext> {
    try {
      const relevantChunks = await this.searchDocuments(query, maxChunks);
      const documents = await this.loadDocuments();

      const context = relevantChunks.map(chunk => {
        const doc = documents.find(d => d.id === chunk.documentId);
        return {
          content: chunk.content,
          source: doc ? doc.fileName : 'Unknown',
          relevanceScore: 1.0 // Simple implementation
        };
      }).join('\n\n');

      return {
        query,
        context,
        sources: [...new Set(relevantChunks.map(chunk => {
          const doc = documents.find(d => d.id === chunk.documentId);
          return doc ? doc.fileName : 'Unknown';
        }))],
        chunkCount: relevantChunks.length,
        totalTokens: context.length // Approximate
      };
    } catch (error) {
      console.error('Error getting RAG context:', error);
      return {
        query,
        context: '',
        sources: [],
        chunkCount: 0,
        totalTokens: 0
      };
    }
  }

  // Private utility methods (same as original)
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static createChunks(
    documentId: string,
    content: string,
    config: KnowledgeBaseConfig
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const chunkSize = config.chunkSize;
    const overlap = config.chunkOverlap;

    let start = 0;
    let chunkIndex = 0;

    while (start < content.length && chunkIndex < config.maxChunks) {
      const end = Math.min(start + chunkSize, content.length);
      const chunkContent = content.slice(start, end);

      const chunk: DocumentChunk = {
        id: `${documentId}_chunk_${chunkIndex}`,
        documentId,
        content: chunkContent,
        startIndex: start,
        endIndex: end,
        metadata: {
          chunkIndex,
          wordCount: chunkContent.split(/\s+/).length,
          characterCount: chunkContent.length
        }
      };

      chunks.push(chunk);

      // Move start position with overlap
      start = end - overlap;
      chunkIndex++;
    }

    return chunks;
  }
}

/**
 * Legacy Knowledge Base Service using localStorage (for fallback)
 */
export class KnowledgeBaseService {
  private static readonly STORAGE_KEY = 'hsr-knowledge-base';
  private static readonly CONFIG_KEY = 'hsr-kb-config';
  
  private static defaultConfig: KnowledgeBaseConfig = {
    chunkSize: 1000,
    chunkOverlap: 200,
    maxChunks: 100,
    enableEmbeddings: false, // Disabled by default for browser-only implementation
    embeddingModel: 'text-embedding-ada-002',
    similarityThreshold: 0.7
  };

  // Load all knowledge base documents
  static loadDocuments(): KnowledgeBaseDocument[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const documents = JSON.parse(stored);
      return documents.map((doc: any) => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading knowledge base documents:', error);
      return [];
    }
  }

  // Save documents to localStorage
  static saveDocuments(documents: KnowledgeBaseDocument[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documents));
    } catch (error) {
      console.error('Error saving knowledge base documents:', error);
      throw new Error('Failed to save knowledge base documents');
    }
  }

  // Add a new document to the knowledge base with professional parsing
  static async addDocument(
    file: File,
    content?: string,
    metadata?: Partial<DocumentMetadata>
  ): Promise<KnowledgeBaseDocument> {
    const config = this.getConfig();
    const documentId = this.generateId();

    // Use professional file parsing
    let parsedFile: ParsedFile;
    let finalContent: string;

    if (content) {
      // Use provided content (legacy support)
      finalContent = content;
      parsedFile = {
        name: file.name,
        type: FileParsingService.getFileType(file),
        size: file.size,
        content,
        metadata: {},
        parsedAt: Date.now()
      };
    } else {
      // Use professional file parsing
      parsedFile = await FileParsingService.parseFile(file);
      finalContent = parsedFile.content;
    }

    // Enhanced file metadata with parsing information
    const fileMetadata: DocumentMetadata = {
      fileSize: file.size,
      title: parsedFile.name,
      fileType: parsedFile.type,
      parsedAt: parsedFile.parsedAt,
      parsingMetadata: parsedFile.metadata,
      ...metadata
    };

    // Create document chunks from parsed content
    const chunks = this.createChunks(documentId, finalContent, config);

    const document: KnowledgeBaseDocument = {
      id: documentId,
      fileName: file.name,
      fileType: parsedFile.type,
      content: finalContent,
      chunks,
      metadata: fileMetadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    // Save to storage
    const documents = this.loadDocuments();
    documents.push(document);
    this.saveDocuments(documents);

    return document;
  }

  // Remove a document from the knowledge base
  static removeDocument(documentId: string): void {
    const documents = this.loadDocuments();
    const filteredDocuments = documents.filter(doc => doc.id !== documentId);
    this.saveDocuments(filteredDocuments);
  }

  // Toggle document active status
  static toggleDocumentStatus(documentId: string): void {
    const documents = this.loadDocuments();
    const document = documents.find(doc => doc.id === documentId);
    if (document) {
      document.isActive = !document.isActive;
      document.updatedAt = new Date();
      this.saveDocuments(documents);
    }
  }

  // Create text chunks from document content
  private static createChunks(
    documentId: string, 
    content: string, 
    config: KnowledgeBaseConfig
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { chunkSize, chunkOverlap } = config;
    
    // Simple text chunking by character count
    let startPosition = 0;
    let chunkIndex = 0;
    
    while (startPosition < content.length && chunkIndex < config.maxChunks) {
      const endPosition = Math.min(startPosition + chunkSize, content.length);
      const chunkContent = content.slice(startPosition, endPosition);
      
      // Try to break at word boundaries
      let adjustedEndPosition = endPosition;
      if (endPosition < content.length) {
        const lastSpaceIndex = chunkContent.lastIndexOf(' ');
        if (lastSpaceIndex > chunkSize * 0.8) { // Only adjust if we don't lose too much content
          adjustedEndPosition = startPosition + lastSpaceIndex;
        }
      }
      
      const finalChunkContent = content.slice(startPosition, adjustedEndPosition);
      
      const chunk: DocumentChunk = {
        id: this.generateId(),
        documentId,
        content: finalChunkContent.trim(),
        chunkIndex,
        startPosition,
        endPosition: adjustedEndPosition,
        metadata: {
          wordCount: finalChunkContent.split(/\s+/).length,
          characterCount: finalChunkContent.length
        }
      };
      
      chunks.push(chunk);
      
      // Move to next chunk with overlap
      startPosition = Math.max(adjustedEndPosition - chunkOverlap, adjustedEndPosition);
      chunkIndex++;
    }
    
    return chunks;
  }

  // Search for relevant chunks based on query
  static searchRelevantChunks(query: string, maxResults: number = 5): RAGContext {
    const documents = this.loadDocuments().filter(doc => doc.isActive);
    const allChunks: DocumentChunk[] = [];
    
    documents.forEach(doc => {
      allChunks.push(...doc.chunks);
    });
    
    // Simple keyword-based search (can be enhanced with embeddings later)
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const scoredChunks = allChunks.map(chunk => {
      const chunkText = chunk.content.toLowerCase();
      let score = 0;
      
      queryTerms.forEach(term => {
        const termCount = (chunkText.match(new RegExp(term, 'g')) || []).length;
        score += termCount;
      });
      
      // Boost score for exact phrase matches
      if (chunkText.includes(query.toLowerCase())) {
        score += 10;
      }
      
      return { chunk, score };
    });
    
    // Sort by score and take top results
    const relevantChunks = scoredChunks
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.chunk);
    
    const totalContextLength = relevantChunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
    const averageScore = relevantChunks.length > 0 
      ? scoredChunks.filter(item => item.score > 0).reduce((sum, item) => sum + item.score, 0) / relevantChunks.length 
      : 0;
    
    return {
      query,
      relevantChunks,
      totalDocuments: documents.length,
      searchScore: averageScore,
      contextLength: totalContextLength
    };
  }

  // Get knowledge base statistics
  static getStats(): KnowledgeBaseStats {
    const documents = this.loadDocuments();
    const activeDocuments = documents.filter(doc => doc.isActive);
    const totalChunks = documents.reduce((sum, doc) => sum + doc.chunks.length, 0);
    const totalSize = documents.reduce((sum, doc) => sum + doc.metadata.fileSize, 0);
    const lastUpdated = documents.length > 0 
      ? new Date(Math.max(...documents.map(doc => doc.updatedAt.getTime())))
      : new Date();
    
    return {
      totalDocuments: documents.length,
      totalChunks,
      totalSize,
      lastUpdated,
      activeDocuments: activeDocuments.length
    };
  }

  // Configuration management
  static getConfig(): KnowledgeBaseConfig {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (!stored) return this.defaultConfig;
      return { ...this.defaultConfig, ...JSON.parse(stored) };
    } catch (error) {
      console.error('Error loading knowledge base config:', error);
      return this.defaultConfig;
    }
  }

  static saveConfig(config: Partial<KnowledgeBaseConfig>): void {
    try {
      const currentConfig = this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error('Error saving knowledge base config:', error);
    }
  }

  // Utility methods
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static getFileType(fileName: string): KnowledgeBaseDocument['fileType'] {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'txt': return 'txt';
      case 'xlsx': return 'xlsx';
      case 'xls': return 'xls';
      default: return 'txt';
    }
  }

  // Clear all knowledge base data
  static clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.CONFIG_KEY);
  }

  // Export knowledge base data
  static exportData(): string {
    const documents = this.loadDocuments();
    const config = this.getConfig();
    return JSON.stringify({ documents, config }, null, 2);
  }

  // Import knowledge base data
  static importData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      if (data.documents) {
        this.saveDocuments(data.documents);
      }
      if (data.config) {
        this.saveConfig(data.config);
      }
    } catch (error) {
      console.error('Error importing knowledge base data:', error);
      throw new Error('Invalid knowledge base data format');
    }
  }
}
