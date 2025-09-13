import { LLMService } from './llmService';
import { EnhancedKnowledgeBaseService, KnowledgeBaseService } from './knowledgeBaseService';
import { IntelligentChunkingService } from './intelligentChunkingService';
import { DocumentChunk, KnowledgeBaseDocument, LLMSelectionResult, KnowledgeBaseConfig, DocumentSummaryFile } from '../types';

/**
 * LLM-based Knowledge Selection Service
 * Replaces RAG similarity search with intelligent LLM-powered chunk selection
 */
export class LLMKnowledgeService {
  private static readonly DEFAULT_COMPRESSION_RATIO = 0.1; // 10% summary
  private static readonly DEFAULT_MAX_SELECTED_CHUNKS = 5;

  /**
   * Process document with intelligent LLM chunking and summarization
   */
  static async processDocumentIntelligently(document: KnowledgeBaseDocument): Promise<DocumentSummaryFile> {
    console.log(`🤖 Starting intelligent processing for: ${document.fileName}`);

    try {
      // Get current configuration
      const config = await this.getLLMConfig();

      // Process document with intelligent chunking
      const summaryFile = await IntelligentChunkingService.processDocument(document, config);

      console.log(`✅ Intelligent processing complete: ${summaryFile.totalChunks} chunks created`);
      return summaryFile;
    } catch (error) {
      console.error('Error in intelligent document processing:', error);
      throw new Error(`Failed to process document intelligently: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process all documents with intelligent chunking
   */
  static async processAllDocuments(): Promise<{ processed: number; failed: number; errors: string[] }> {
    console.log(`🤖 Starting intelligent processing for all documents...`);

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Load documents from IndexedDB or localStorage
      let documents;
      try {
        documents = await EnhancedKnowledgeBaseService.loadDocuments();
        console.log(`✅ Loaded ${documents.length} documents from IndexedDB`);
      } catch (error) {
        console.log('🔄 Falling back to localStorage...');
        documents = KnowledgeBaseService.loadDocuments();
        console.log(`✅ Loaded ${documents.length} documents from localStorage`);
      }

      const activeDocuments = documents.filter(doc => doc.isActive);
      console.log(`📄 Processing ${activeDocuments.length} active documents...`);

      for (let i = 0; i < activeDocuments.length; i++) {
        const doc = activeDocuments[i];

        try {
          console.log(`🔄 Processing ${i + 1}/${activeDocuments.length}: ${doc.fileName}`);

          // Check if already processed
          const existingSummary = await IntelligentChunkingService.loadSummaryFile(doc.id);
          if (existingSummary && existingSummary.version === '2.0') {
            console.log(`⏭️ Skipping ${doc.fileName} - already processed with v2.0`);
            processed++;
            continue;
          }

          // Process with intelligent chunking
          await this.processDocumentIntelligently(doc);
          processed++;

          // Add delay between documents to avoid overwhelming LLM
          if (i < activeDocuments.length - 1) {
            console.log(`⏸️ Waiting 2 seconds before next document...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          failed++;
          const errorMsg = `Failed to process ${doc.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`✅ Batch processing complete: ${processed} processed, ${failed} failed`);
      return { processed, failed, errors };
    } catch (error) {
      console.error('Error in batch document processing:', error);
      throw new Error(`Failed to process documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Use LLM to intelligently select relevant chunks based on user query
   */
  static async selectRelevantChunks(
    userQuery: string,
    maxChunks: number = this.DEFAULT_MAX_SELECTED_CHUNKS
  ): Promise<LLMSelectionResult> {
    console.log(`🤖 LLM Selection: Starting intelligent chunk selection for query: "${userQuery}"`);

    // Load all processed documents (summary files)
    const summaryFiles = await IntelligentChunkingService.listSummaryFiles();

    if (summaryFiles.length === 0) {
      console.log('❌ No processed documents available for selection');
      return {
        selectedChunkIds: [],
        reasoning: 'No processed documents available for evaluation. Please process documents first.',
        confidence: 0,
        totalChunksEvaluated: 0
      };
    }

    // Collect all chunks with summaries from summary files
    const chunksWithSummaries: Array<{chunk: DocumentChunk, fileName: string}> = [];

    summaryFiles.forEach(summaryFile => {
      summaryFile.chunks.forEach(chunk => {
        chunksWithSummaries.push({
          chunk,
          fileName: summaryFile.fileName
        });
      });
    });

    if (chunksWithSummaries.length === 0) {
      console.log('❌ No chunks with summaries available for selection');
      return {
        selectedChunkIds: [],
        reasoning: 'No summarized chunks available for evaluation',
        confidence: 0,
        totalChunksEvaluated: 0
      };
    }

    console.log(`🤖 LLM Selection: Evaluating ${chunksWithSummaries.length} chunks from ${summaryFiles.length} documents`);

    // Create selection prompt with all summaries
    const summariesList = chunksWithSummaries.map((item, index) => {
      return `${index + 1}. [${item.fileName}] Chunk ${item.chunk.chunkIndex + 1}:
Summary: ${item.chunk.summary}
Start: "${item.chunk.startText}"
End: "${item.chunk.endText}"
ID: ${item.chunk.id}`;
    }).join('\n\n');

    const selectionPrompt = `You are an expert knowledge curator for a construction estimation system. Your task is to select the most relevant document chunks that would help answer the user's query.

USER QUERY: "${userQuery}"

AVAILABLE KNOWLEDGE CHUNKS (${chunksWithSummaries.length} total):
${summariesList}

SELECTION CRITERIA:
- Choose chunks that directly relate to the user's query
- Prioritize technical specifications, procedures, and actionable information
- Consider construction standards, codes, materials, and methods
- Select up to ${maxChunks} most relevant chunks
- Focus on practical applicability to the query
- Use the summary, start text, and end text to understand chunk content

Please respond in this exact JSON format:
{
  "selectedChunkIds": ["chunk_id_1", "chunk_id_2", ...],
  "reasoning": "Brief explanation of why these chunks were selected and how they relate to the query",
  "confidence": 0.85
}

IMPORTANT: Only include chunk IDs that appear in the list above. Confidence should be between 0 and 1.`;

    try {
      const response = await LLMService.generateContent(selectionPrompt);
      console.log(`🤖 LLM Selection Response: ${response.substring(0, 200)}...`);

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in LLM response');
      }

      const selectionResult = JSON.parse(jsonMatch[0]);

      // Validate selected chunk IDs
      const validChunkIds = chunksWithSummaries.map(item => item.chunk.id);
      const validSelectedIds = selectionResult.selectedChunkIds.filter((id: string) =>
        validChunkIds.includes(id)
      );

      const result: LLMSelectionResult = {
        selectedChunkIds: validSelectedIds,
        reasoning: selectionResult.reasoning || 'No reasoning provided',
        confidence: Math.max(0, Math.min(1, selectionResult.confidence || 0.5)),
        totalChunksEvaluated: chunksWithSummaries.length
      };

      console.log(`✅ LLM Selection: Selected ${result.selectedChunkIds.length} chunks with confidence ${result.confidence}`);
      console.log(`📝 Selection reasoning: ${result.reasoning}`);

      return result;
    } catch (error) {
      console.error('Error in LLM chunk selection:', error);
      return {
        selectedChunkIds: [],
        reasoning: `Selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
        totalChunksEvaluated: chunksWithSummaries.length
      };
    }
  }

  /**
   * Get full content of selected chunks for prompt enhancement
   */
  static async getSelectedChunksContent(
    selectedChunkIds: string[]
  ): Promise<{content: string, sources: string[]}> {
    if (selectedChunkIds.length === 0) {
      return { content: '', sources: [] };
    }

    // Load all summary files to find selected chunks
    const summaryFiles = await IntelligentChunkingService.listSummaryFiles();
    const selectedChunks: Array<{chunk: DocumentChunk, source: string}> = [];

    summaryFiles.forEach(summaryFile => {
      summaryFile.chunks.forEach(chunk => {
        if (selectedChunkIds.includes(chunk.id)) {
          selectedChunks.push({
            chunk,
            source: summaryFile.fileName
          });
        }
      });
    });

    if (selectedChunks.length === 0) {
      console.log('❌ No selected chunks found in summary files');
      return { content: '', sources: [] };
    }

    // Sort chunks by their original order
    selectedChunks.sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex);

    const contentParts = selectedChunks.map(item => {
      return `--- FROM: ${item.source} (Chunk ${item.chunk.chunkIndex + 1}) ---
Start: "${item.chunk.startText}"
End: "${item.chunk.endText}"

${item.chunk.content}`;
    });

    const content = contentParts.join('\n\n');
    const sources = [...new Set(selectedChunks.map(item => item.source))];

    console.log(`📄 Selected content: ${content.length} characters from ${sources.length} sources`);
    console.log(`📊 Selected chunks: ${selectedChunks.map(item => `${item.source}:${item.chunk.chunkIndex + 1}`).join(', ')}`);

    return { content, sources };
  }

  /**
   * Check if LLM-based selection is enabled in config
   */
  static async isLLMSelectionEnabled(): Promise<boolean> {
    try {
      const config = await EnhancedKnowledgeBaseService.getConfig();
      return config.enableLLMSelection || false;
    } catch (error) {
      // Fallback to localStorage config
      const config = KnowledgeBaseService.getConfig();
      return (config as any).enableLLMSelection || false;
    }
  }

  /**
   * Get LLM selection configuration
   */
  static async getLLMConfig(): Promise<Partial<KnowledgeBaseConfig>> {
    try {
      return await EnhancedKnowledgeBaseService.getConfig();
    } catch (error) {
      return KnowledgeBaseService.getConfig();
    }
  }
}
