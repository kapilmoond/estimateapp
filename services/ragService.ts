import { RAGContext, DocumentChunk } from '../types';
import { EnhancedKnowledgeBaseService, KnowledgeBaseService } from './knowledgeBaseService';
import { FileParsingService, ParsedFile } from './fileParsingService';
import { LLMKnowledgeService } from './llmKnowledgeService';
import { LLMService } from './llmService';
import { IntelligentChunkingService } from './intelligentChunkingService';

export class RAGService {
  private static readonly MAX_CONTEXT_LENGTH = 8000; // Maximum characters for context
  private static readonly MAX_CHUNKS = 10; // Maximum number of chunks to include

  /**
   * Generate enhanced prompt with knowledge base context using two-stage LLM process
   */
  static async enhancePromptWithKnowledgeBase(
    originalPrompt: string,
    includeKnowledgeBase: boolean = false,
    maxContextLength: number = this.MAX_CONTEXT_LENGTH
  ): Promise<{ enhancedPrompt: string; ragContext: RAGContext | null }> {
    console.log(`🔍 Knowledge Enhancement: includeKnowledgeBase=${includeKnowledgeBase}, prompt="${originalPrompt.substring(0, 100)}..."`);

    if (!includeKnowledgeBase) {
      console.log('❌ Knowledge Enhancement: Knowledge base not enabled');
      return { enhancedPrompt: originalPrompt, ragContext: null };
    }

    // Check if LLM-based selection is enabled
    const isLLMSelectionEnabled = await LLMKnowledgeService.isLLMSelectionEnabled();
    console.log(`🤖 Knowledge Enhancement: LLM Selection ${isLLMSelectionEnabled ? 'ENABLED' : 'DISABLED'}`);

    if (isLLMSelectionEnabled) {
      return await this.enhanceWithTwoStageLLMProcess(originalPrompt);
    } else {
      return await this.enhanceWithRAGSearch(originalPrompt);
    }
  }

  /**
   * Enhanced prompt using LLM-based intelligent chunk selection
   */
  private static async enhanceWithLLMSelection(originalPrompt: string): Promise<{ enhancedPrompt: string; ragContext: RAGContext | null }> {
    try {
      console.log('🤖 LLM Selection: Loading documents...');

      // Load documents from IndexedDB or localStorage
      let documents;
      try {
        documents = await EnhancedKnowledgeBaseService.loadDocuments();
        console.log(`✅ LLM Selection: Loaded ${documents.length} documents from IndexedDB`);
      } catch (error) {
        console.log('🔄 LLM Selection: Falling back to localStorage...');
        documents = KnowledgeBaseService.loadDocuments();
        console.log(`✅ LLM Selection: Loaded ${documents.length} documents from localStorage`);
      }

      const activeDocuments = documents.filter(doc => doc.isActive);
      if (activeDocuments.length === 0) {
        console.log('❌ LLM Selection: No active documents found');
        return { enhancedPrompt: originalPrompt, ragContext: null };
      }

      // Get configuration
      const config = await LLMKnowledgeService.getLLMConfig();
      const maxChunks = config.maxSelectedChunks || 5;

      // Use LLM to select relevant chunks
      console.log(`🤖 LLM Selection: Selecting relevant chunks (max: ${maxChunks})...`);
      const selectionResult = await LLMKnowledgeService.selectRelevantChunks(
        originalPrompt,
        maxChunks
      );

      if (selectionResult.selectedChunkIds.length === 0) {
        console.log('❌ LLM Selection: No relevant chunks selected');
        return { enhancedPrompt: originalPrompt, ragContext: null };
      }

      // Get full content of selected chunks
      const { content: contextText, sources } = await LLMKnowledgeService.getSelectedChunksContent(
        selectionResult.selectedChunkIds
      );

      console.log(`✅ LLM Selection: Selected ${selectionResult.selectedChunkIds.length} chunks`);
      console.log(`📊 LLM Selection: Context length: ${contextText.length} characters`);
      console.log(`📊 LLM Selection: Sources: [${sources.join(', ')}]`);
      console.log(`🎯 LLM Selection: Confidence: ${selectionResult.confidence}, Reasoning: ${selectionResult.reasoning}`);

      // Create RAG context for compatibility
      const ragContext: RAGContext = {
        query: originalPrompt,
        context: contextText,
        sources,
        chunkCount: selectionResult.selectedChunkIds.length,
        totalTokens: contextText.length
      };

      // Create enhanced prompt
      const enhancedPrompt = this.createEnhancedPromptWithLLMSelection(originalPrompt, contextText, selectionResult, sources);
      console.log(`✅ LLM Selection: Enhanced prompt length: ${enhancedPrompt.length} characters (${enhancedPrompt.length - originalPrompt.length} added)`);

      return { enhancedPrompt, ragContext };
    } catch (error) {
      console.error('Error in LLM-based knowledge enhancement:', error);
      console.log('🔄 LLM Selection: Falling back to RAG search...');
      return await this.enhanceWithRAGSearch(originalPrompt);
    }
  }

  /**
   * Two-stage LLM process: Stage 1 (Selection) + Stage 2 (Final Response)
   */
  private static async enhanceWithTwoStageLLMProcess(originalPrompt: string): Promise<{ enhancedPrompt: string; ragContext: RAGContext | null }> {
    try {
      console.log('🎯 Two-Stage LLM: Starting Stage 1 - Document Selection...');

      // STAGE 1: Get all document summaries and let LLM select relevant documents
      const allSummaryFiles = await IntelligentChunkingService.listSummaryFiles();

      // Filter out inactive documents and clean up orphaned summaries
      const activeSummaryFiles = await this.filterActiveDocuments(allSummaryFiles);

      if (activeSummaryFiles.length === 0) {
        console.log('🎯 Two-Stage LLM: No active processed documents found');
        return { enhancedPrompt: originalPrompt, ragContext: null };
      }

      console.log(`🎯 Two-Stage LLM: Using ${activeSummaryFiles.length} active documents (${allSummaryFiles.length - activeSummaryFiles.length} inactive excluded)`);
      const summaryFiles = activeSummaryFiles;

      // Create comprehensive summaries list for Stage 1 - include ALL chunk summaries with IDs
      const allSummaries = summaryFiles.map(file => {
        const chunkSummaries = file.chunks.map((chunk, index) => {
          return `  Chunk ${index + 1} [ID: ${chunk.id}]: ${chunk.summary}`;
        }).join('\n');

        return `Document: ${file.fileName}
Document Summary: ${file.documentSummary}
Total Chunks: ${file.totalChunks}
Document ID: ${file.documentId}

Individual Chunk Summaries (with unique IDs):
${chunkSummaries}`;
      }).join('\n\n---\n\n');

      // Stage 1 Prompt: LLM selects relevant chunks by their unique IDs
      const stage1Prompt = `You are an expert knowledge curator for a construction estimation system. Your task is to analyze the user's query and select the most relevant document chunks from the complete knowledge base using their unique chunk IDs.

USER QUERY: "${originalPrompt}"

COMPLETE KNOWLEDGE BASE (${summaryFiles.length} documents with ALL chunk summaries and unique IDs):
${allSummaries}

SELECTION TASK:
1. Analyze the user's query to understand exactly what information they need
2. Review ALL chunk summaries from ALL documents to identify relevant content
3. Select specific chunks by their unique IDs [ID: chunk_id] that contain information relevant to the query
4. Look for technical specifications, procedures, standards, rates, materials, and actionable information
5. Consider chunks from ANY document that might be relevant, not just the most obvious ones
6. Select up to 10 chunks total from across all documents
7. IMPORTANT: Use the exact chunk IDs shown in brackets [ID: chunk_id] for reliable retrieval

Please respond in this exact JSON format:
{
  "selectedChunkIds": [
    {
      "chunkId": "exact_chunk_id_from_brackets",
      "fileName": "filename.xlsx",
      "chunkDescription": "Brief description of what this chunk contains",
      "relevanceReason": "Why this specific chunk is relevant to the query"
    }
  ],
  "overallReasoning": "Brief explanation of the selection strategy and how these chunks relate to the query",
  "confidence": 0.85,
  "totalChunksSelected": 6
}

RESPOND WITH ONLY THE JSON OBJECT:`;

      console.log('🎯 Stage 1: Sending document selection prompt to LLM...');
      const stage1Response = await LLMService.generateContent(stage1Prompt);
      console.log(`🎯 Stage 1: Received response (${stage1Response.length} chars)`);

      // Parse Stage 1 response
      const stage1Result = this.parseStage1Response(stage1Response);
      if (!stage1Result || stage1Result.selectedChunkIds.length === 0) {
        console.log('🎯 Stage 1: No chunks selected');
        return { enhancedPrompt: originalPrompt, ragContext: null };
      }

      console.log(`🎯 Stage 1: Selected ${stage1Result.totalChunksSelected || stage1Result.selectedChunkIds.length} chunks by ID`);

      // STAGE 2: Get actual chunks from selected documents and create final prompt
      return await this.executeStage2(originalPrompt, stage1Result, summaryFiles);

    } catch (error) {
      console.error('Error in two-stage LLM process:', error);
      console.log('🔄 Two-Stage LLM: Falling back to traditional LLM selection...');
      return await this.enhanceWithLLMSelection(originalPrompt);
    }
  }

  /**
   * Enhanced prompt using traditional RAG similarity search
   */
  private static async enhanceWithRAGSearch(originalPrompt: string): Promise<{ enhancedPrompt: string; ragContext: RAGContext | null }> {
    // Search for relevant context using enhanced service
    let ragContext: RAGContext;
    try {
      console.log('🔍 RAG Search: Searching IndexedDB...');
      ragContext = await EnhancedKnowledgeBaseService.getRAGContext(originalPrompt, this.MAX_CHUNKS);
      console.log(`✅ RAG Search: IndexedDB search completed, found ${ragContext.chunkCount} chunks`);
    } catch (error) {
      console.error('Error getting RAG context from IndexedDB, falling back to localStorage:', error);
      // Fallback to localStorage
      console.log('🔄 RAG Search: Falling back to localStorage...');
      ragContext = KnowledgeBaseService.searchRelevantChunks(
        originalPrompt,
        this.MAX_CHUNKS
      );
      console.log(`✅ RAG Search: localStorage search completed, found ${ragContext.chunkCount || ragContext.relevantChunks?.length || 0} chunks`);
    }

    if (ragContext.chunkCount === 0) {
      console.log('❌ RAG Search: No relevant chunks found after progressive search');
      return { enhancedPrompt: originalPrompt, ragContext };
    }

    // Use the context directly from RAG service
    const contextText = ragContext.context;
    console.log(`✅ RAG Search: Context text length: ${contextText.length} characters`);
    console.log(`📊 RAG Search: Sources used: [${ragContext.sources.join(', ')}]`);

    // Create enhanced prompt
    const enhancedPrompt = this.createEnhancedPrompt(originalPrompt, contextText, ragContext);
    console.log(`✅ RAG Search: Enhanced prompt length: ${enhancedPrompt.length} characters (${enhancedPrompt.length - originalPrompt.length} added)`);

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
   * Create enhanced prompt with LLM-selected knowledge base context
   */
  private static createEnhancedPromptWithLLMSelection(
    originalPrompt: string,
    contextText: string,
    selectionResult: any,
    sources: string[]
  ): string {
    const sourcesList = sources.length > 0
      ? `\nSources: ${sources.join(', ')}`
      : '';

    const contextHeader = `KNOWLEDGE BASE CONTEXT:
The following information was intelligently selected from the user's personal knowledge base documents using LLM-powered analysis. ${selectionResult.selectedChunkIds.length} most relevant chunks were chosen from ${selectionResult.totalChunksEvaluated} available chunks with ${Math.round(selectionResult.confidence * 100)}% confidence.

Selection Reasoning: ${selectionResult.reasoning}${sourcesList}

${contextText}

--- END OF KNOWLEDGE BASE CONTEXT ---

`;

    const enhancedPrompt = `${contextHeader}

USER REQUEST:
${originalPrompt}

Please use the intelligently selected knowledge base context above to provide a more informed response. The content was specifically chosen as most relevant to your request. Reference the source documents when applicable and build upon the technical information provided. If the selected context doesn't fully address the request, supplement with your general knowledge while acknowledging the knowledge base review.`;

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
   * Parse Stage 1 LLM response for chunk ID selection
   */
  private static parseStage1Response(response: string): any {
    try {
      // Extract JSON from response
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = response.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonStr);

        // Validate structure - looking for selectedChunkIds (new ID-based format)
        if (parsed.selectedChunkIds && Array.isArray(parsed.selectedChunkIds)) {
          console.log(`🎯 Stage 1: Parsed ${parsed.selectedChunkIds.length} chunk IDs`);
          return parsed;
        }

        // Fallback: if old chunk number format is used, convert it
        if (parsed.selectedChunks && Array.isArray(parsed.selectedChunks)) {
          console.log('🔄 Converting chunk number format to chunk ID format (fallback)');
          return {
            selectedChunkIds: parsed.selectedChunks.flatMap(chunkGroup =>
              chunkGroup.chunkNumbers.map(chunkNumber => ({
                chunkId: `${chunkGroup.documentId}-chunk-${chunkNumber - 1}`, // Estimate ID
                fileName: chunkGroup.fileName,
                chunkDescription: `Chunk ${chunkNumber} from ${chunkGroup.fileName}`,
                relevanceReason: chunkGroup.relevanceReason
              }))
            ),
            overallReasoning: parsed.overallReasoning,
            confidence: parsed.confidence,
            totalChunksSelected: parsed.selectedChunks.reduce((sum, group) => sum + group.chunkNumbers.length, 0)
          };
        }

        // Fallback: if very old document format is used, convert it
        if (parsed.selectedDocuments && Array.isArray(parsed.selectedDocuments)) {
          console.log('🔄 Converting old document format to chunk ID format (fallback)');
          return {
            selectedChunkIds: parsed.selectedDocuments.flatMap(doc =>
              Array.from({length: doc.suggestedChunkCount || 3}, (_, i) => ({
                chunkId: `${doc.documentId}-chunk-${i}`, // Estimate ID
                fileName: doc.fileName,
                chunkDescription: `Chunk ${i + 1} from ${doc.fileName}`,
                relevanceReason: doc.relevanceReason
              }))
            ),
            overallReasoning: parsed.overallReasoning,
            confidence: parsed.confidence,
            totalChunksSelected: parsed.selectedDocuments.reduce((sum, doc) => sum + (doc.suggestedChunkCount || 3), 0)
          };
        }
      }

      console.error('Invalid Stage 1 response format - no recognized structure found');
      return null;
    } catch (error) {
      console.error('Error parsing Stage 1 response:', error);
      console.log('Response preview:', response.substring(0, 500));
      return null;
    }
  }

  /**
   * Execute Stage 2: Get selected chunks by their unique IDs and create final enhanced prompt
   */
  private static async executeStage2(originalPrompt: string, stage1Result: any, summaryFiles: any[]): Promise<{ enhancedPrompt: string; ragContext: RAGContext | null }> {
    try {
      console.log('🎯 Stage 2: Retrieving chunks by their unique IDs...');

      const selectedChunks = [];
      const sources = [];
      const notFoundChunkIds = [];

      // Create a comprehensive chunk lookup map by ID
      const chunkLookupMap = new Map();
      summaryFiles.forEach(file => {
        file.chunks.forEach(chunk => {
          chunkLookupMap.set(chunk.id, {
            ...chunk,
            sourceFileName: file.fileName,
            documentId: file.documentId
          });
        });
      });

      console.log(`🎯 Stage 2: Created lookup map with ${chunkLookupMap.size} chunks from ${summaryFiles.length} documents`);

      // Retrieve chunks by their exact IDs - ID-based system only
      for (const selectedChunk of stage1Result.selectedChunkIds) {
        const chunkId = selectedChunk.chunkId;
        const chunk = chunkLookupMap.get(chunkId);

        if (chunk) {
          selectedChunks.push({
            ...chunk,
            relevanceReason: selectedChunk.relevanceReason,
            chunkDescription: selectedChunk.chunkDescription
          });

          if (!sources.includes(chunk.sourceFileName)) {
            sources.push(chunk.sourceFileName);
          }

          console.log(`✅ Stage 2: Found chunk ID "${chunkId}" from ${chunk.sourceFileName}`);
          console.log(`📄 Content preview: ${chunk.content.substring(0, 100)}...`);
        } else {
          notFoundChunkIds.push(chunkId);
          console.error(`❌ Stage 2: Chunk ID "${chunkId}" not found in knowledge base`);
        }
      }

      if (notFoundChunkIds.length > 0) {
        console.error(`🎯 Stage 2: ${notFoundChunkIds.length} chunk IDs not found: [${notFoundChunkIds.join(', ')}]`);
        console.error('🔧 This indicates a problem with chunk ID generation or storage. Check chunk processing.');
      }

      if (selectedChunks.length === 0) {
        console.log('🎯 Stage 2: No valid chunks retrieved');
        return { enhancedPrompt: originalPrompt, ragContext: null };
      }

      // Create context text from selected chunks with detailed attribution
      const contextText = selectedChunks.map((chunk, index) => {
        return `[Source: ${chunk.sourceFileName} - Chunk ID: ${chunk.id}]
Summary: ${chunk.summary}
Description: ${chunk.chunkDescription || 'AI-selected content'}
Relevance: ${chunk.relevanceReason || 'Selected by AI'}

Full Content:
${chunk.content}`;
      }).join('\n\n---\n\n');

      console.log(`🎯 Stage 2: Created context with ${selectedChunks.length} chunks (${contextText.length} chars)`);
      console.log(`📊 Stage 2: Successfully retrieved ${selectedChunks.length}/${stage1Result.selectedChunkIds.length} requested chunks`);

      // Create RAG context
      const ragContext: RAGContext = {
        query: originalPrompt,
        context: contextText,
        sources: [...new Set(sources)],
        chunkCount: selectedChunks.length,
        totalTokens: contextText.length
      };

      // Create final enhanced prompt
      const enhancedPrompt = this.createTwoStageEnhancedPrompt(originalPrompt, contextText, stage1Result, sources);

      console.log(`✅ Two-Stage LLM: Final prompt length: ${enhancedPrompt.length} characters`);
      console.log(`📊 Two-Stage LLM: Used ${selectedChunks.length} chunks from ${sources.length} documents`);

      return { enhancedPrompt, ragContext };

    } catch (error) {
      console.error('Error in Stage 2 execution:', error);
      throw error;
    }
  }

  /**
   * Create enhanced prompt for two-stage process
   */
  private static createTwoStageEnhancedPrompt(
    originalPrompt: string,
    contextText: string,
    stage1Result: any,
    sources: string[]
  ): string {
    const sourcesList = sources.length > 0 ? `\nSources: ${sources.join(', ')}` : '';

    return `INTELLIGENT KNOWLEDGE BASE CONTEXT:
The following information was intelligently selected from your personal knowledge base using a two-stage AI process. Stage 1 analyzed your query and selected the most relevant documents. Stage 2 retrieved the specific chunks that best match your needs.${sourcesList}

SELECTION REASONING: ${stage1Result.overallReasoning}
CONFIDENCE: ${Math.round((stage1Result.confidence || 0.8) * 100)}%

RELEVANT KNOWLEDGE:
${contextText}

--- END OF KNOWLEDGE BASE CONTEXT ---

USER REQUEST:
${originalPrompt}

Please use the intelligently selected knowledge base context above to provide a comprehensive and accurate response. The content was specifically chosen through a two-stage AI selection process to be most relevant to your request. Reference the source documents when applicable and build upon the technical information provided.`;
  }



  /**
   * Filter active documents and clean up orphaned summaries
   */
  private static async filterActiveDocuments(summaryFiles: any[]): Promise<any[]> {
    try {
      // Get current active documents from knowledge base
      const currentDocuments = await EnhancedKnowledgeBaseService.loadDocuments();
      const activeDocumentIds = new Set(
        currentDocuments
          .filter(doc => doc.isActive)
          .map(doc => doc.id)
      );

      console.log(`📋 Knowledge Base: ${currentDocuments.length} total documents, ${activeDocumentIds.size} active`);

      // Filter summary files to only include active documents
      const activeSummaryFiles = summaryFiles.filter(summaryFile => {
        const isActive = activeDocumentIds.has(summaryFile.documentId);
        if (!isActive) {
          console.log(`🗑️ Excluding inactive/deleted document: ${summaryFile.fileName}`);
        }
        return isActive;
      });

      // Clean up orphaned summaries (summaries without corresponding documents)
      const orphanedSummaries = summaryFiles.filter(summaryFile =>
        !currentDocuments.some(doc => doc.id === summaryFile.documentId)
      );

      if (orphanedSummaries.length > 0) {
        console.log(`🧹 Found ${orphanedSummaries.length} orphaned summaries, cleaning up...`);
        await this.cleanupOrphanedSummaries(orphanedSummaries);
      }

      return activeSummaryFiles;

    } catch (error) {
      console.error('Error filtering active documents:', error);
      // Fallback: return all summary files if filtering fails
      return summaryFiles;
    }
  }

  /**
   * Clean up orphaned summary files
   */
  private static async cleanupOrphanedSummaries(orphanedSummaries: any[]): Promise<void> {
    try {
      for (const orphanedSummary of orphanedSummaries) {
        await IntelligentChunkingService.deleteSummaryFile(orphanedSummary.documentId);
        console.log(`🗑️ Deleted orphaned summary: ${orphanedSummary.fileName}`);
      }
    } catch (error) {
      console.error('Error cleaning up orphaned summaries:', error);
    }
  }

  /**
   * Clear complete knowledge base including summaries and chunks
   */
  static async clearCompleteKnowledgeBase(): Promise<void> {
    try {
      console.log('🧹 Clearing complete knowledge base...');

      // Clear all documents from knowledge base
      await EnhancedKnowledgeBaseService.clearAll();
      console.log('✅ Cleared all documents from knowledge base');

      // Clear all summary files
      await IntelligentChunkingService.clearAllSummaryFiles();
      console.log('✅ Cleared all summary files and chunks');

      console.log('🎯 Complete knowledge base cleared successfully');

    } catch (error) {
      console.error('Error clearing complete knowledge base:', error);
      throw new Error(`Failed to clear knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
