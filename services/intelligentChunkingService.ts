import { LLMService } from './llmService';
import { 
  KnowledgeBaseDocument, 
  DocumentChunk, 
  LLMChunkingResult, 
  LLMChunkData,
  DocumentSummaryFile,
  KnowledgeBaseConfig 
} from '../types';
import { IndexedDBService } from './indexedDBService';

/**
 * Intelligent LLM-based Document Chunking and Summarization Service
 * Replaces random chunking with intelligent LLM-determined boundaries
 */
export class IntelligentChunkingService {
  private static readonly SUMMARY_STORE = 'document-summaries';
  private static readonly DEFAULT_MAX_INPUT_LENGTH = 50000; // 50k characters per LLM call
  private static readonly DEFAULT_COMPRESSION_RATIO = 0.1; // 10%

  /**
   * Process entire document with intelligent LLM chunking and summarization
   */
  static async processDocument(
    document: KnowledgeBaseDocument,
    config: KnowledgeBaseConfig
  ): Promise<DocumentSummaryFile> {
    console.log(`🤖 Intelligent Processing: Starting document "${document.fileName}" (${document.content.length} chars)`);
    
    const maxInputLength = config.maxInputTextLength || this.DEFAULT_MAX_INPUT_LENGTH;
    const compressionRatio = config.summaryCompressionRatio || this.DEFAULT_COMPRESSION_RATIO;
    
    // Check if document needs to be processed in multiple parts
    if (document.content.length <= maxInputLength) {
      // Single pass processing
      console.log(`📄 Single Pass: Document fits in one LLM call`);
      return await this.processSinglePass(document, compressionRatio);
    } else {
      // Multi-pass processing
      console.log(`📄 Multi Pass: Document requires ${Math.ceil(document.content.length / maxInputLength)} LLM calls`);
      return await this.processMultiPass(document, maxInputLength, compressionRatio);
    }
  }

  /**
   * Process document in single LLM call with retry logic
   */
  private static async processSinglePass(
    document: KnowledgeBaseDocument,
    compressionRatio: number
  ): Promise<DocumentSummaryFile> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 LLM Processing: Attempt ${attempt}/${maxRetries} - Sending ${document.content.length} characters for intelligent chunking...`);

        const prompt = this.createChunkingPrompt(document.content, compressionRatio, true, undefined, undefined, lastError);
        const response = await LLMService.generateContent(prompt);
        console.log(`✅ LLM Response: Received ${response.length} characters`);

        const chunkingResult = this.parseChunkingResponse(response, attempt);
        const chunks = await this.createDocumentChunks(
          chunkingResult.chunks,
          document,
          document.content
        );

        const summaryFile: DocumentSummaryFile = {
          documentId: document.id,
          fileName: document.fileName,
          documentSummary: chunkingResult.documentSummary,
          chunks,
          totalChunks: chunks.length,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: '2.0'
        };

        // Save to IndexedDB
        await this.saveSummaryFile(summaryFile);
        console.log(`✅ Single Pass Complete: Created ${chunks.length} intelligent chunks`);

        return summaryFile;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`❌ Single Pass Attempt ${attempt} Failed:`, lastError.message);

        if (attempt === maxRetries) {
          console.error('❌ All retry attempts failed for single pass processing');
          throw new Error(`Failed to process document after ${maxRetries} attempts: ${lastError.message}`);
        }

        // Wait before retry
        console.log(`⏸️ Waiting 2 seconds before retry attempt ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Unexpected end of retry loop');
  }

  /**
   * Process document in multiple LLM calls
   */
  private static async processMultiPass(
    document: KnowledgeBaseDocument,
    maxInputLength: number,
    compressionRatio: number
  ): Promise<DocumentSummaryFile> {
    const textParts = this.splitTextIntelligently(document.content, maxInputLength);
    console.log(`📄 Multi Pass: Split document into ${textParts.length} parts`);
    
    let allChunks: DocumentChunk[] = [];
    let documentSummaries: string[] = [];
    
    for (let i = 0; i < textParts.length; i++) {
      const part = textParts[i];
      const isLastPart = i === textParts.length - 1;
      
      console.log(`🤖 Processing Part ${i + 1}/${textParts.length} (${part.content.length} chars)...`);
      
      const prompt = this.createChunkingPrompt(
        part.content, 
        compressionRatio, 
        isLastPart,
        i + 1,
        textParts.length
      );
      
      // Retry logic for each part
      const maxRetries = 3;
      let partProcessed = false;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries && !partProcessed; attempt++) {
        try {
          console.log(`🤖 Part ${i + 1} Processing: Attempt ${attempt}/${maxRetries}`);

          const promptWithRetry = this.createChunkingPrompt(
            part.content,
            compressionRatio,
            isLastPart,
            i + 1,
            textParts.length,
            lastError
          );

          const response = await LLMService.generateContent(promptWithRetry);
          const chunkingResult = this.parseChunkingResponse(response, attempt);

          const partChunks = await this.createDocumentChunks(
            chunkingResult.chunks,
            document,
            part.content,
            part.startPosition,
            allChunks.length
          );

          allChunks.push(...partChunks);
          documentSummaries.push(chunkingResult.documentSummary);

          console.log(`✅ Part ${i + 1} Complete: Created ${partChunks.length} chunks`);
          partProcessed = true;

          // Add delay between calls to avoid overwhelming LLM
          if (i < textParts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`❌ Part ${i + 1} Attempt ${attempt} Failed:`, lastError.message);

          if (attempt === maxRetries) {
            console.error(`❌ All retry attempts failed for part ${i + 1}`);
            throw new Error(`Failed to process document part ${i + 1}: ${lastError.message}`);
          }

          // Wait before retry
          console.log(`⏸️ Waiting 2 seconds before retry attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // Create final document summary from all parts
    const finalDocumentSummary = await this.createFinalDocumentSummary(
      documentSummaries,
      document.fileName
    );
    
    const summaryFile: DocumentSummaryFile = {
      documentId: document.id,
      fileName: document.fileName,
      documentSummary: finalDocumentSummary,
      chunks: allChunks,
      totalChunks: allChunks.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: '2.0'
    };

    // Log chunk IDs for debugging
    console.log(`📋 Multi-pass summary file created with ${allChunks.length} chunks:`);
    allChunks.forEach((chunk, index) => {
      console.log(`  ${index + 1}. ID: ${chunk.id} | Summary: ${chunk.summary.substring(0, 50)}...`);
    });

    // Save to IndexedDB
    await this.saveSummaryFile(summaryFile);
    console.log(`✅ Multi Pass Complete: Created ${allChunks.length} intelligent chunks from ${textParts.length} parts`);
    
    return summaryFile;
  }

  /**
   * Create LLM prompt for intelligent chunking and summarization with error feedback
   */
  private static createChunkingPrompt(
    content: string,
    compressionRatio: number,
    isComplete: boolean,
    partNumber?: number,
    totalParts?: number,
    previousError?: Error | null
  ): string {
    const compressionPercent = Math.round(compressionRatio * 100);
    const partInfo = partNumber ? ` (Part ${partNumber}/${totalParts})` : '';

    // Add error feedback if this is a retry
    const errorFeedback = previousError ? `

⚠️ PREVIOUS ATTEMPT FAILED: ${previousError.message}
Please ensure your response contains ONLY valid JSON with no additional text before or after the JSON object.
Common issues to avoid:
- Extra explanations or comments outside the JSON
- Malformed JSON syntax (missing quotes, trailing commas)
- Text after the closing brace }
- Invalid character positions or missing required fields

` : '';

    return `You are an expert document analyzer specializing in construction and technical documents. Your task is to intelligently divide the following text into logical chunks and create concise summaries.${errorFeedback}

DOCUMENT CONTENT${partInfo}:
${content}

INSTRUCTIONS:
1. **Intelligent Chunking**: Divide the text into logical sections based on:
   - Topic boundaries and subject changes
   - Natural paragraph breaks and section headers
   - Technical procedure steps
   - Specification groups
   - Logical information units

2. **Boundary Identification**: For each chunk, identify:
   - Start position: Character position where chunk begins (0-based)
   - End position: Character position where chunk ends (0-based)
   - Start text: First 10-15 words of the chunk (for reference)
   - End text: Last 10-15 words of the chunk (for reference)
   - Ensure boundaries are at natural breaking points

3. **Summary Creation**: Create ${compressionPercent}% summaries that:
   - Capture key technical information
   - Maintain construction/engineering terminology
   - Include specific measurements, codes, standards
   - Focus on actionable and reference-worthy content

4. **Output Format**: Respond with ONLY this exact JSON structure (no additional text before or after):

{
  "documentSummary": "Overall summary of the ${isComplete ? 'entire document' : 'document section'}",
  "chunks": [
    {
      "chunkIndex": 0,
      "startPosition": 0,
      "endPosition": 1250,
      "startText": "First 10-15 words of chunk...",
      "endText": "...last 10-15 words of chunk",
      "summary": "Concise ${compressionPercent}% summary focusing on technical details",
      "estimatedTokens": 150
    }
  ],
  "totalChunks": 3,
  "processingComplete": ${isComplete}
}

CRITICAL REQUIREMENTS:
- Respond with ONLY the JSON object - no explanations, comments, or additional text
- Create 3-8 chunks depending on content complexity
- Each summary should be approximately ${compressionPercent}% of original chunk length
- Calculate accurate character positions (0-based indexing)
- Ensure chunk boundaries are at natural breaking points (paragraph breaks, section headers)
- Include all critical technical information in summaries
- Estimate token count for each summary (roughly 4 characters = 1 token)
- Position calculation: Count characters from the beginning of the text
- All string values must be properly quoted
- No trailing commas in JSON
- Ensure valid JSON syntax

RESPOND WITH ONLY THE JSON OBJECT:`;
  }

  /**
   * Parse LLM response and extract chunking data with retry capability
   */
  private static parseChunkingResponse(response: string, attempt: number = 1): LLMChunkingResult {
    try {
      // Try multiple JSON extraction methods
      let jsonStr = '';

      // Method 1: Find JSON between first { and last }
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = response.substring(firstBrace, lastBrace + 1);
      } else {
        // Method 2: Use regex to find JSON block
        const jsonMatch = response.match(/\{[\s\S]*?\}(?=\s*$|\s*[^}])/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        } else {
          throw new Error('No valid JSON structure found in LLM response');
        }
      }

      // Clean up common JSON issues
      jsonStr = jsonStr
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .trim();

      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.chunks || !Array.isArray(parsed.chunks)) {
        throw new Error('Invalid chunks array in LLM response');
      }

      if (!parsed.documentSummary) {
        throw new Error('Missing document summary in LLM response');
      }

      // Validate chunk structure
      for (let i = 0; i < parsed.chunks.length; i++) {
        const chunk = parsed.chunks[i];
        if (typeof chunk.chunkIndex !== 'number') chunk.chunkIndex = i;
        if (typeof chunk.startPosition !== 'number') chunk.startPosition = 0;
        if (typeof chunk.endPosition !== 'number') chunk.endPosition = 1000;
        if (!chunk.summary) chunk.summary = 'Summary not provided';
        if (!chunk.startText) chunk.startText = 'Start text not provided';
        if (!chunk.endText) chunk.endText = 'End text not provided';
        if (typeof chunk.estimatedTokens !== 'number') chunk.estimatedTokens = Math.ceil(chunk.summary.length / 4);
      }

      return {
        chunks: parsed.chunks,
        totalChunks: parsed.totalChunks || parsed.chunks.length,
        processingComplete: parsed.processingComplete !== false,
        documentSummary: parsed.documentSummary
      };
    } catch (error) {
      console.error(`Error parsing LLM chunking response (attempt ${attempt}):`, error);
      console.log('Raw response length:', response.length);
      console.log('Raw response preview:', response.substring(0, 500) + '...');
      console.log('Raw response ending:', '...' + response.substring(Math.max(0, response.length - 200)));

      throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create DocumentChunk objects from LLM chunk data
   */
  private static async createDocumentChunks(
    llmChunks: LLMChunkData[],
    document: KnowledgeBaseDocument,
    sourceText: string,
    basePosition: number = 0,
    baseIndex: number = 0
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    for (let i = 0; i < llmChunks.length; i++) {
      const llmChunk = llmChunks[i];

      // Use LLM-provided positions directly, with validation
      let startPos = llmChunk.startPosition || 0;
      let endPos = llmChunk.endPosition || sourceText.length;

      // Validate and adjust positions
      startPos = Math.max(0, Math.min(startPos, sourceText.length));
      endPos = Math.max(startPos + 100, Math.min(endPos, sourceText.length)); // Minimum 100 chars

      // If positions seem invalid, fall back to proportional positioning
      if (endPos <= startPos || startPos < 0) {
        console.warn(`⚠️ Invalid positions for chunk ${i}, using proportional positioning`);
        const chunkSize = Math.floor(sourceText.length / llmChunks.length);
        startPos = i * chunkSize;
        endPos = Math.min((i + 1) * chunkSize, sourceText.length);
      }

      const actualContent = sourceText.substring(startPos, endPos).trim();

      // Generate simple, reliable chunk ID
      const chunkId = `${document.id}-chunk-${baseIndex + i}`;

      const chunk: DocumentChunk = {
        id: chunkId,
        documentId: document.id,
        content: actualContent,
        chunkIndex: baseIndex + i,
        startText: llmChunk.startText,
        endText: llmChunk.endText,
        startPosition: basePosition + startPos,
        endPosition: basePosition + endPos,
        summary: llmChunk.summary,
        summaryGenerated: true,
        lastSummaryUpdate: Date.now(),
        metadata: {
          estimatedTokens: llmChunk.estimatedTokens || Math.ceil(actualContent.length / 4),
          processingVersion: '2.0'
        }
      };

      chunks.push(chunk);
      console.log(`📄 Chunk ${i + 1}: ID="${chunkId}", positions ${startPos}-${endPos} (${actualContent.length} chars)`);
      console.log(`📝 Summary: ${llmChunk.summary.substring(0, 100)}...`);
      console.log(`📖 Content preview: ${actualContent.substring(0, 100)}...`);
    }

    console.log(`📄 Created ${chunks.length} document chunks with position-based boundaries`);
    return chunks;
  }



  /**
   * Split text intelligently for multi-pass processing
   */
  private static splitTextIntelligently(
    text: string,
    maxLength: number
  ): Array<{ content: string; startPosition: number }> {
    const parts: Array<{ content: string; startPosition: number }> = [];
    let currentPosition = 0;
    
    while (currentPosition < text.length) {
      let endPosition = Math.min(currentPosition + maxLength, text.length);
      
      // If not at the end, try to find a good breaking point
      if (endPosition < text.length) {
        // Look for paragraph breaks, sentence endings, or section headers
        const searchStart = Math.max(currentPosition, endPosition - 1000);
        const searchText = text.substring(searchStart, endPosition + 500);
        
        // Find best breaking point (paragraph > sentence > word boundary)
        const paragraphBreak = searchText.lastIndexOf('\n\n');
        const sentenceBreak = searchText.lastIndexOf('. ');
        const wordBreak = searchText.lastIndexOf(' ');
        
        let breakPoint = -1;
        if (paragraphBreak > searchText.length / 2) {
          breakPoint = searchStart + paragraphBreak + 2;
        } else if (sentenceBreak > searchText.length / 3) {
          breakPoint = searchStart + sentenceBreak + 2;
        } else if (wordBreak > searchText.length / 4) {
          breakPoint = searchStart + wordBreak + 1;
        }
        
        if (breakPoint > currentPosition) {
          endPosition = breakPoint;
        }
      }
      
      const content = text.substring(currentPosition, endPosition).trim();
      if (content.length > 0) {
        parts.push({
          content,
          startPosition: currentPosition
        });
      }
      
      currentPosition = endPosition;
    }
    
    console.log(`📄 Split text into ${parts.length} intelligent parts`);
    return parts;
  }

  /**
   * Create final document summary from multiple part summaries
   */
  private static async createFinalDocumentSummary(
    partSummaries: string[],
    fileName: string
  ): Promise<string> {
    if (partSummaries.length === 1) {
      return partSummaries[0];
    }
    
    const combinedSummaries = partSummaries.join('\n\n');
    const prompt = `Create a comprehensive summary of the document "${fileName}" based on the following part summaries:

${combinedSummaries}

Create a unified summary that:
- Captures the overall purpose and scope of the document
- Highlights key technical information and specifications
- Maintains construction/engineering terminology
- Provides a clear overview of the document's content
- Is concise but comprehensive (approximately 200-300 words)

DOCUMENT SUMMARY:`;
    
    try {
      const finalSummary = await LLMService.generateContent(prompt);
      return finalSummary.trim();
    } catch (error) {
      console.error('Error creating final document summary:', error);
      // Fallback: combine part summaries
      return `Document Summary: ${partSummaries.join(' | ')}`;
    }
  }

  /**
   * Save summary file to IndexedDB
   */
  private static async saveSummaryFile(summaryFile: DocumentSummaryFile): Promise<void> {
    try {
      // Add id field for IndexedDB compatibility
      const summaryWithId = { ...summaryFile, id: summaryFile.documentId };
      await IndexedDBService.save('knowledgeBase', summaryWithId);
      console.log(`💾 Saved summary file for document: ${summaryFile.fileName}`);
    } catch (error) {
      console.error('Error saving summary file:', error);
      throw new Error(`Failed to save summary file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete summary file by document ID
   */
  static async deleteSummaryFile(documentId: string): Promise<void> {
    try {
      await IndexedDBService.delete('knowledgeBase', documentId);
      console.log(`🗑️ Deleted summary file for document: ${documentId}`);
    } catch (error) {
      console.error('Error deleting summary file:', error);
      throw new Error(`Failed to delete summary file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all summary files and chunks
   */
  static async clearAllSummaryFiles(): Promise<void> {
    try {
      await IndexedDBService.clear('knowledgeBase');
      console.log(`🧹 Cleared all summary files and chunks from IndexedDB`);
    } catch (error) {
      console.error('Error clearing all summary files:', error);
      throw new Error(`Failed to clear summary files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load summary file from IndexedDB
   */
  static async loadSummaryFile(documentId: string): Promise<DocumentSummaryFile | null> {
    try {
      const summaryFile = await IndexedDBService.load('knowledgeBase', documentId);
      return summaryFile as DocumentSummaryFile || null;
    } catch (error) {
      console.error('Error loading summary file:', error);
      return null;
    }
  }



  /**
   * List all summary files
   */
  static async listSummaryFiles(): Promise<DocumentSummaryFile[]> {
    try {
      const allData = await IndexedDBService.loadAll('knowledgeBase');
      // Filter for summary files (they have version field)
      return allData.filter(item => item.version && item.chunks) as DocumentSummaryFile[];
    } catch (error) {
      console.error('Error listing summary files:', error);
      return [];
    }
  }
}
