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
import { IntelligentChunkingService } from './intelligentChunkingService';

/**
 * Enhanced Knowledge Base Service using IndexedDB
 * Provides unlimited storage capacity for large documents
 */
export class EnhancedKnowledgeBaseService {
  private static readonly CONFIG_KEY = 'kb-config';

  private static defaultConfig: KnowledgeBaseConfig = {
    // New intelligent LLM-based settings
    maxInputTextLength: 50000, // 50k characters per LLM call
    summaryCompressionRatio: 0.1, // 10% compression ratio
    maxSelectedChunks: 5, // Maximum chunks to include in final prompt
    autoGenerateSummaries: true, // Automatically generate summaries for new documents
    enableLLMSelection: true, // Always true for new system
    // Deprecated fields (kept for migration compatibility)
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

  /**
   * Process document with intelligent LLM chunking and summarization
   */
  static async processDocumentIntelligently(document: KnowledgeBaseDocument): Promise<void> {
    try {
      console.log(`🤖 Starting intelligent processing for: ${document.fileName}`);

      // Get current configuration
      const config = await this.getConfig();

      // Process document with intelligent chunking
      const summaryFile = await IntelligentChunkingService.processDocument(document, config);

      // Update document with new chunks (for backward compatibility)
      const updatedDocument: KnowledgeBaseDocument = {
        ...document,
        chunks: summaryFile.chunks,
        updatedAt: new Date()
      };

      // Save updated document
      await this.saveDocument(updatedDocument);

      console.log(`✅ Intelligent processing complete: ${summaryFile.totalChunks} chunks created`);
    } catch (error) {
      console.error('Error in intelligent document processing:', error);
      throw new Error(`Failed to process document intelligently: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get document summary file (new intelligent format)
   */
  static async getDocumentSummaryFile(documentId: string) {
    return await IntelligentChunkingService.loadSummaryFile(documentId);
  }

  /**
   * List all processed documents with summaries
   */
  static async listProcessedDocuments() {
    return await IntelligentChunkingService.listSummaryFiles();
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

  // Enhanced search with progressive similarity threshold
  static async searchDocuments(query: string, limit: number = 10): Promise<DocumentChunk[]> {
    try {
      const documents = await this.loadDocuments();
      const activeDocuments = documents.filter(doc => doc.isActive);

      console.log(`🔍 Enhanced RAG Search: Total documents: ${documents.length}, Active: ${activeDocuments.length}`);
      console.log(`🔍 Enhanced RAG Search: Query: "${query}", Target chunks: ${limit}`);

      return await this.progressiveSimilaritySearch(query, activeDocuments, limit);
    } catch (error) {
      console.error('Error in enhanced search:', error);
      return [];
    }
  }

  // Progressive similarity threshold search - starts high, decreases until chunks found
  private static async progressiveSimilaritySearch(
    query: string,
    documents: any[],
    targetChunks: number
  ): Promise<DocumentChunk[]> {
    const queryTerms = this.extractSearchTerms(query);
    console.log(`🎯 Progressive Search: Extracted terms: [${queryTerms.join(', ')}]`);

    // Progressive thresholds: start high (exact matches) and decrease
    const maxThreshold = 1.0;
    const minThreshold = 0.01;
    const decrement = 0.001;

    let bestChunks: Array<{chunk: DocumentChunk, score: number, source: string}> = [];
    let currentThreshold = maxThreshold;

    console.log(`🔄 Progressive Search: Starting with threshold ${maxThreshold}, target: ${targetChunks} chunks`);

    while (currentThreshold >= minThreshold) {
      const roundedThreshold = Math.round(currentThreshold * 1000) / 1000; // Round to 3 decimal places

      // Search all chunks with current threshold
      const candidateChunks = this.searchWithThreshold(query, queryTerms, documents, roundedThreshold);

      if (candidateChunks.length > 0) {
        console.log(`✅ Progressive Search: Found ${candidateChunks.length} chunks at threshold ${roundedThreshold}`);
        bestChunks = candidateChunks;

        // If we have enough chunks, stop searching
        if (bestChunks.length >= targetChunks) {
          console.log(`🎯 Progressive Search: Target reached! Using ${bestChunks.length} chunks at threshold ${roundedThreshold}`);
          break;
        }
      }

      // Decrease threshold for next iteration
      currentThreshold -= decrement;

      // Log progress every 0.1 threshold decrease
      if (Math.round(currentThreshold * 10) % 1 === 0) {
        console.log(`🔄 Progressive Search: Threshold ${roundedThreshold} → ${Math.round(currentThreshold * 1000) / 1000}, found: ${candidateChunks.length}`);
      }
    }

    // Final results
    const finalChunks = bestChunks
      .sort((a, b) => b.score - a.score) // Sort by relevance score
      .slice(0, targetChunks) // Take only the requested number
      .map(item => item.chunk);

    console.log(`🏁 Progressive Search Complete: Found ${finalChunks.length}/${targetChunks} chunks`);
    if (bestChunks.length > 0) {
      const finalThreshold = Math.round((maxThreshold - currentThreshold + decrement) * 1000) / 1000;
      console.log(`📊 Progressive Search Stats: Best threshold: ${finalThreshold}, Sources: [${[...new Set(bestChunks.slice(0, targetChunks).map(item => item.source))].join(', ')}]`);
    }

    return finalChunks;
  }

  // Extract meaningful search terms from query
  private static extractSearchTerms(query: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
      'his', 'her', 'its', 'our', 'their', 'what', 'when', 'where', 'why', 'how', 'which', 'who'
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter(term => term.length > 2 && !stopWords.has(term)) // Filter meaningful terms
      .slice(0, 10); // Limit to top 10 terms
  }

  // Search chunks with specific similarity threshold
  private static searchWithThreshold(
    originalQuery: string,
    queryTerms: string[],
    documents: any[],
    threshold: number
  ): Array<{chunk: DocumentChunk, score: number, source: string}> {
    const results: Array<{chunk: DocumentChunk, score: number, source: string}> = [];
    const queryLower = originalQuery.toLowerCase();

    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        const chunkLower = chunk.content.toLowerCase();

        // Calculate similarity score
        const score = this.calculateSimilarityScore(queryLower, queryTerms, chunkLower);

        // Include chunk if score meets threshold
        if (score >= threshold) {
          results.push({
            chunk,
            score,
            source: doc.fileName
          });
        }
      }
    }

    return results;
  }

  // Calculate similarity score between query and chunk
  private static calculateSimilarityScore(
    queryLower: string,
    queryTerms: string[],
    chunkLower: string
  ): number {
    let score = 0;
    const chunkWords = chunkLower.split(/\s+/);
    const chunkWordSet = new Set(chunkWords);

    // 1. Exact phrase match (highest weight)
    if (chunkLower.includes(queryLower)) {
      score += 1.0;
    }

    // 2. Individual term matches (weighted by term frequency)
    let termMatches = 0;
    for (const term of queryTerms) {
      if (chunkWordSet.has(term)) {
        termMatches++;
        // Count frequency of term in chunk
        const termFreq = (chunkLower.match(new RegExp(term, 'g')) || []).length;
        score += (termFreq / chunkWords.length) * 0.5; // Weighted by frequency
      }
    }

    // 3. Term coverage bonus (percentage of query terms found)
    if (queryTerms.length > 0) {
      const coverage = termMatches / queryTerms.length;
      score += coverage * 0.3;
    }

    // 4. Partial word matches (lower weight)
    for (const term of queryTerms) {
      if (term.length > 3) { // Only for longer terms
        const partialMatches = chunkWords.filter(word =>
          word.includes(term) || term.includes(word)
        ).length;
        score += (partialMatches / chunkWords.length) * 0.1;
      }
    }

    // 5. Semantic proximity bonus (words appearing near each other)
    if (termMatches > 1) {
      score += this.calculateProximityBonus(queryTerms, chunkWords) * 0.2;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  // Calculate bonus for terms appearing close to each other
  private static calculateProximityBonus(queryTerms: string[], chunkWords: string[]): number {
    let proximityScore = 0;
    const positions: {[term: string]: number[]} = {};

    // Find positions of query terms in chunk
    queryTerms.forEach(term => {
      positions[term] = [];
      chunkWords.forEach((word, index) => {
        if (word === term) {
          positions[term].push(index);
        }
      });
    });

    // Calculate proximity between terms
    const termPairs = [];
    for (let i = 0; i < queryTerms.length; i++) {
      for (let j = i + 1; j < queryTerms.length; j++) {
        termPairs.push([queryTerms[i], queryTerms[j]]);
      }
    }

    termPairs.forEach(([term1, term2]) => {
      const pos1 = positions[term1] || [];
      const pos2 = positions[term2] || [];

      if (pos1.length > 0 && pos2.length > 0) {
        // Find minimum distance between any occurrence of the two terms
        let minDistance = Infinity;
        pos1.forEach(p1 => {
          pos2.forEach(p2 => {
            minDistance = Math.min(minDistance, Math.abs(p1 - p2));
          });
        });

        // Closer terms get higher bonus (max bonus when distance = 1)
        if (minDistance < 10) { // Only consider if within 10 words
          proximityScore += 1 / minDistance;
        }
      }
    });

    return Math.min(proximityScore / termPairs.length, 1.0);
  }

  // Get RAG context for a query
  static async getRAGContext(query: string, maxChunks: number = 5): Promise<RAGContext> {
    try {
      const relevantChunks = await this.searchDocuments(query, maxChunks);
      const documents = await this.loadDocuments();

      console.log(`🔍 RAG Search: Found ${relevantChunks.length} chunks for query: "${query}"`);

      // Build context text properly from chunks
      const contextParts = relevantChunks.map(chunk => {
        const doc = documents.find(d => d.id === chunk.documentId);
        const source = doc ? doc.fileName : 'Unknown';
        return `--- FROM: ${source} ---\n${chunk.content}`;
      });

      const context = contextParts.join('\n\n');

      const sources = [...new Set(relevantChunks.map(chunk => {
        const doc = documents.find(d => d.id === chunk.documentId);
        return doc ? doc.fileName : 'Unknown';
      }))];

      console.log(`✅ RAG Context: ${context.length} characters from ${sources.length} sources`);

      return {
        query,
        context,
        sources,
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
