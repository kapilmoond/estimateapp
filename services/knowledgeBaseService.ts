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
