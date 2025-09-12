import { RAGContext, DocumentChunk } from '../types';
import { EnhancedKnowledgeBaseService, KnowledgeBaseService } from './knowledgeBaseService';
import { FileParsingService, ParsedFile } from './fileParsingService';

export class RAGService {
  private static readonly MAX_CONTEXT_LENGTH = 8000; // Maximum characters for context
  private static readonly MAX_CHUNKS = 10; // Maximum number of chunks to include

  /**
   * Generate enhanced prompt with knowledge base context
   */
  static async enhancePromptWithKnowledgeBase(
    originalPrompt: string,
    includeKnowledgeBase: boolean = false,
    maxContextLength: number = this.MAX_CONTEXT_LENGTH
  ): Promise<{ enhancedPrompt: string; ragContext: RAGContext | null }> {
    console.log(`🔍 RAG Enhancement: includeKnowledgeBase=${includeKnowledgeBase}, prompt="${originalPrompt.substring(0, 100)}..."`);

    if (!includeKnowledgeBase) {
      console.log('❌ RAG Enhancement: Knowledge base not enabled');
      return { enhancedPrompt: originalPrompt, ragContext: null };
    }

    // Search for relevant context using enhanced service
    let ragContext: RAGContext;
    try {
      console.log('🔍 RAG Enhancement: Searching IndexedDB...');
      ragContext = await EnhancedKnowledgeBaseService.getRAGContext(originalPrompt, this.MAX_CHUNKS);
      console.log(`✅ RAG Enhancement: IndexedDB search completed, found ${ragContext.chunkCount} chunks`);
    } catch (error) {
      console.error('Error getting RAG context from IndexedDB, falling back to localStorage:', error);
      // Fallback to localStorage
      console.log('🔄 RAG Enhancement: Falling back to localStorage...');
      ragContext = KnowledgeBaseService.searchRelevantChunks(
        originalPrompt,
        this.MAX_CHUNKS
      );
      console.log(`✅ RAG Enhancement: localStorage search completed, found ${ragContext.chunkCount || ragContext.relevantChunks?.length || 0} chunks`);
    }

    if (ragContext.chunkCount === 0) {
      console.log('❌ RAG Enhancement: No relevant chunks found after progressive search');
      return { enhancedPrompt: originalPrompt, ragContext };
    }

    // Use the context directly from RAG service
    const contextText = ragContext.context;
    console.log(`✅ RAG Enhancement: Context text length: ${contextText.length} characters`);
    console.log(`📊 RAG Enhancement: Sources used: [${ragContext.sources.join(', ')}]`);

    // Create enhanced prompt
    const enhancedPrompt = this.createEnhancedPrompt(originalPrompt, contextText, ragContext);
    console.log(`✅ RAG Enhancement: Enhanced prompt length: ${enhancedPrompt.length} characters (${enhancedPrompt.length - originalPrompt.length} added)`);

    return { enhancedPrompt, ragContext };
  }

  /**
   * Build context text from document chunks
   */
  private static buildContextFromChunks(
    chunks: DocumentChunk[], 
    maxLength: number
  ): string {
    let contextText = '';
    let currentLength = 0;

    // Group chunks by document for better organization
    const chunksByDocument = this.groupChunksByDocument(chunks);

    for (const [documentId, documentChunks] of chunksByDocument.entries()) {
      const document = KnowledgeBaseService.loadDocuments()
        .find(doc => doc.id === documentId);
      
      if (!document) continue;

      const documentHeader = `\n--- FROM: ${document.fileName} ---\n`;
      
      if (currentLength + documentHeader.length > maxLength) break;
      
      contextText += documentHeader;
      currentLength += documentHeader.length;

      for (const chunk of documentChunks) {
        const chunkText = chunk.content.trim();
        const chunkWithNewlines = `\n${chunkText}\n`;
        
        if (currentLength + chunkWithNewlines.length > maxLength) {
          // Try to fit a truncated version
          const remainingSpace = maxLength - currentLength - 20; // Leave space for "..."
          if (remainingSpace > 100) {
            const truncatedChunk = chunkText.substring(0, remainingSpace) + '...';
            contextText += `\n${truncatedChunk}\n`;
          }
          break;
        }
        
        contextText += chunkWithNewlines;
        currentLength += chunkWithNewlines.length;
      }
    }

    return contextText;
  }

  /**
   * Group chunks by their document ID
   */
  private static groupChunksByDocument(chunks: DocumentChunk[]): Map<string, DocumentChunk[]> {
    const grouped = new Map<string, DocumentChunk[]>();
    
    chunks.forEach(chunk => {
      if (!grouped.has(chunk.documentId)) {
        grouped.set(chunk.documentId, []);
      }
      grouped.get(chunk.documentId)!.push(chunk);
    });

    // Sort chunks within each document by their index
    grouped.forEach(documentChunks => {
      documentChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    });

    return grouped;
  }

  /**
   * Create enhanced prompt with knowledge base context
   */
  private static createEnhancedPrompt(
    originalPrompt: string,
    contextText: string,
    ragContext: RAGContext
  ): string {
    const sourcesList = ragContext.sources.length > 0
      ? `\nSources: ${ragContext.sources.join(', ')}`
      : '';

    const contextHeader = `KNOWLEDGE BASE CONTEXT:
The following information is from the user's personal knowledge base documents (${ragContext.chunkCount} relevant chunks found using progressive similarity search). Use this information to provide more accurate and relevant responses when applicable.${sourcesList}

${contextText}

--- END OF KNOWLEDGE BASE CONTEXT ---

`;

    const enhancedPrompt = `${contextHeader}

USER REQUEST:
${originalPrompt}

Please use the knowledge base context above when relevant to provide a more informed response. If the knowledge base contains relevant information, reference it in your response and mention which source documents you're drawing from. If the context is not directly relevant, proceed with your general knowledge but acknowledge that you've reviewed the available knowledge base.`;

    return enhancedPrompt;
  }

  /**
   * Search knowledge base for specific query
   */
  static searchKnowledgeBase(
    query: string, 
    maxResults: number = 5
  ): RAGContext {
    return KnowledgeBaseService.searchRelevantChunks(query, maxResults);
  }

  /**
   * Get knowledge base summary for context
   */
  static getKnowledgeBaseSummary(): string {
    const stats = KnowledgeBaseService.getStats();
    const documents = KnowledgeBaseService.loadDocuments()
      .filter(doc => doc.isActive);

    if (documents.length === 0) {
      return 'No knowledge base documents available.';
    }

    const documentList = documents
      .map(doc => `- ${doc.fileName} (${doc.chunks.length} chunks)`)
      .join('\n');

    return `Knowledge Base Summary:
- ${stats.activeDocuments} active documents
- ${stats.totalChunks} total chunks
- Documents available:
${documentList}`;
  }

  /**
   * Validate if knowledge base is available and has content
   */
  static isKnowledgeBaseAvailable(): boolean {
    const stats = KnowledgeBaseService.getStats();
    return stats.activeDocuments > 0;
  }

  /**
   * Get relevant context for a specific topic or domain
   */
  static getTopicContext(
    topic: string, 
    maxChunks: number = 5
  ): { context: string; sources: string[] } {
    const ragContext = this.searchKnowledgeBase(topic, maxChunks);
    
    if (ragContext.relevantChunks.length === 0) {
      return { context: '', sources: [] };
    }

    const context = this.buildContextFromChunks(
      ragContext.relevantChunks, 
      this.MAX_CONTEXT_LENGTH
    );

    // Get unique source documents
    const documentIds = [...new Set(ragContext.relevantChunks.map(chunk => chunk.documentId))];
    const documents = KnowledgeBaseService.loadDocuments();
    const sources = documentIds
      .map(id => documents.find(doc => doc.id === id)?.fileName)
      .filter(Boolean) as string[];

    return { context, sources };
  }

  /**
   * Format RAG context for display
   */
  static formatRAGContextForDisplay(ragContext: RAGContext): string {
    if (ragContext.relevantChunks.length === 0) {
      return 'No relevant knowledge base content found.';
    }

    const documents = KnowledgeBaseService.loadDocuments();
    const chunksByDocument = this.groupChunksByDocument(ragContext.relevantChunks);
    
    let formatted = `Found ${ragContext.relevantChunks.length} relevant chunks from ${chunksByDocument.size} documents:\n\n`;

    chunksByDocument.forEach((chunks, documentId) => {
      const document = documents.find(doc => doc.id === documentId);
      if (document) {
        formatted += `📄 ${document.fileName} (${chunks.length} chunks)\n`;
        chunks.forEach(chunk => {
          const preview = chunk.content.substring(0, 100) + '...';
          formatted += `  • ${preview}\n`;
        });
        formatted += '\n';
      }
    });

    return formatted;
  }

  /**
   * Extract key terms from a query for better search
   */
  private static extractKeyTerms(query: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2 && !stopWords.has(term))
      .slice(0, 10); // Limit to top 10 terms
  }

  /**
   * Get statistics about knowledge base usage
   */
  static getUsageStats(): {
    totalSearches: number;
    averageRelevantChunks: number;
    mostSearchedTerms: string[];
  } {
    // This would be enhanced with actual usage tracking
    // For now, return basic stats
    const stats = KnowledgeBaseService.getStats();
    
    return {
      totalSearches: 0, // Would track this in localStorage
      averageRelevantChunks: stats.totalChunks > 0 ? Math.min(5, stats.totalChunks) : 0,
      mostSearchedTerms: [] // Would track this in localStorage
    };
  }

  /**
   * Clear knowledge base cache (if any caching is implemented)
   */
  static clearCache(): void {
    // Implementation for clearing any cached embeddings or search results
    // Currently not needed as we're using simple keyword search
  }
}
