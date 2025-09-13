import { LLMService } from './llmService';
import { EnhancedKnowledgeBaseService, KnowledgeBaseService } from './knowledgeBaseService';
import { DocumentChunk, KnowledgeBaseDocument, LLMSelectionResult, KnowledgeBaseConfig } from '../types';

/**
 * LLM-based Knowledge Selection Service
 * Replaces RAG similarity search with intelligent LLM-powered chunk selection
 */
export class LLMKnowledgeService {
  private static readonly DEFAULT_COMPRESSION_RATIO = 0.1; // 10% summary
  private static readonly DEFAULT_MAX_SELECTED_CHUNKS = 5;

  /**
   * Generate LLM summary for a document chunk (10% compression)
   */
  static async generateChunkSummary(chunk: DocumentChunk, compressionRatio: number = this.DEFAULT_COMPRESSION_RATIO): Promise<string> {
    const targetLength = Math.max(50, Math.floor(chunk.content.length * compressionRatio));
    
    const prompt = `Please create a concise summary of the following text. The summary should be approximately ${Math.floor(compressionRatio * 100)}% of the original length (target: ~${targetLength} characters) and capture the key technical information, concepts, and actionable details.

ORIGINAL TEXT:
${chunk.content}

SUMMARY REQUIREMENTS:
- Focus on technical specifications, procedures, and important details
- Maintain construction/engineering terminology
- Include specific measurements, standards, or codes mentioned
- Keep the most actionable and reference-worthy information
- Target length: ~${targetLength} characters

CONCISE SUMMARY:`;

    try {
      console.log(`📝 Generating summary for chunk ${chunk.id} (${chunk.content.length} → ~${targetLength} chars)`);
      const summary = await LLMService.generateContent(prompt);
      console.log(`✅ Summary generated: ${summary.length} characters`);
      return summary.trim();
    } catch (error) {
      console.error('Error generating chunk summary:', error);
      // Fallback to simple truncation
      return chunk.content.substring(0, targetLength) + '...';
    }
  }

  /**
   * Generate summaries for all chunks in a document
   */
  static async generateDocumentSummaries(
    document: KnowledgeBaseDocument, 
    compressionRatio: number = this.DEFAULT_COMPRESSION_RATIO
  ): Promise<KnowledgeBaseDocument> {
    console.log(`📚 Generating summaries for document: ${document.fileName} (${document.chunks.length} chunks)`);
    
    const updatedChunks = [...document.chunks];
    let summariesGenerated = 0;

    for (let i = 0; i < updatedChunks.length; i++) {
      const chunk = updatedChunks[i];
      
      // Skip if summary already exists and is recent
      if (chunk.summaryGenerated && chunk.summary && chunk.lastSummaryUpdate) {
        const daysSinceUpdate = (Date.now() - chunk.lastSummaryUpdate) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 30) { // Summary is less than 30 days old
          console.log(`⏭️ Skipping chunk ${chunk.id} - summary is recent`);
          continue;
        }
      }

      try {
        const summary = await this.generateChunkSummary(chunk, compressionRatio);
        updatedChunks[i] = {
          ...chunk,
          summary,
          summaryGenerated: true,
          lastSummaryUpdate: Date.now()
        };
        summariesGenerated++;
        
        // Add small delay to avoid overwhelming the LLM service
        if (i < updatedChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error generating summary for chunk ${chunk.id}:`, error);
        // Mark as attempted but failed
        updatedChunks[i] = {
          ...chunk,
          summaryGenerated: false,
          lastSummaryUpdate: Date.now()
        };
      }
    }

    console.log(`✅ Generated ${summariesGenerated} new summaries for ${document.fileName}`);

    return {
      ...document,
      chunks: updatedChunks,
      updatedAt: new Date()
    };
  }

  /**
   * Use LLM to intelligently select relevant chunks based on user query
   */
  static async selectRelevantChunks(
    userQuery: string, 
    documents: KnowledgeBaseDocument[],
    maxChunks: number = this.DEFAULT_MAX_SELECTED_CHUNKS
  ): Promise<LLMSelectionResult> {
    // Collect all chunks with summaries
    const chunksWithSummaries: Array<{chunk: DocumentChunk, document: KnowledgeBaseDocument}> = [];
    
    documents.forEach(doc => {
      doc.chunks.forEach(chunk => {
        if (chunk.summaryGenerated && chunk.summary) {
          chunksWithSummaries.push({ chunk, document: doc });
        }
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

    console.log(`🤖 LLM Selection: Evaluating ${chunksWithSummaries.length} chunks for query: "${userQuery}"`);

    // Create selection prompt with all summaries
    const summariesList = chunksWithSummaries.map((item, index) => {
      return `${index + 1}. [${item.document.fileName}] Chunk ${item.chunk.chunkIndex + 1}:
${item.chunk.summary}
ID: ${item.chunk.id}`;
    }).join('\n\n');

    const selectionPrompt = `You are an expert knowledge curator for a construction estimation system. Your task is to select the most relevant document chunks that would help answer the user's query.

USER QUERY: "${userQuery}"

AVAILABLE KNOWLEDGE CHUNKS (summaries):
${summariesList}

SELECTION CRITERIA:
- Choose chunks that directly relate to the user's query
- Prioritize technical specifications, procedures, and actionable information
- Consider construction standards, codes, materials, and methods
- Select up to ${maxChunks} most relevant chunks
- Focus on practical applicability to the query

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
    selectedChunkIds: string[],
    documents: KnowledgeBaseDocument[]
  ): Promise<{content: string, sources: string[]}> {
    const selectedChunks: Array<{chunk: DocumentChunk, source: string}> = [];
    
    documents.forEach(doc => {
      doc.chunks.forEach(chunk => {
        if (selectedChunkIds.includes(chunk.id)) {
          selectedChunks.push({
            chunk,
            source: doc.fileName
          });
        }
      });
    });

    if (selectedChunks.length === 0) {
      return { content: '', sources: [] };
    }

    const contentParts = selectedChunks.map(item => {
      return `--- FROM: ${item.source} (Chunk ${item.chunk.chunkIndex + 1}) ---\n${item.chunk.content}`;
    });

    const content = contentParts.join('\n\n');
    const sources = [...new Set(selectedChunks.map(item => item.source))];

    console.log(`📄 Selected content: ${content.length} characters from ${sources.length} sources`);

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
