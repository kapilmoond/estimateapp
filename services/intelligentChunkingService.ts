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
   * Process document in single LLM call
   */
  private static async processSinglePass(
    document: KnowledgeBaseDocument,
    compressionRatio: number
  ): Promise<DocumentSummaryFile> {
    const prompt = this.createChunkingPrompt(document.content, compressionRatio, true);
    
    try {
      console.log(`🤖 LLM Processing: Sending ${document.content.length} characters for intelligent chunking...`);
      const response = await LLMService.generateContent(prompt);
      console.log(`✅ LLM Response: Received ${response.length} characters`);
      
      const chunkingResult = this.parseChunkingResponse(response);
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
      console.error('Error in single pass processing:', error);
      throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      
      try {
        const response = await LLMService.generateContent(prompt);
        const chunkingResult = this.parseChunkingResponse(response);
        
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
        
        // Add delay between calls to avoid overwhelming LLM
        if (i < textParts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error processing part ${i + 1}:`, error);
        throw new Error(`Failed to process document part ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    // Save to IndexedDB
    await this.saveSummaryFile(summaryFile);
    console.log(`✅ Multi Pass Complete: Created ${allChunks.length} intelligent chunks from ${textParts.length} parts`);
    
    return summaryFile;
  }

  /**
   * Create LLM prompt for intelligent chunking and summarization
   */
  private static createChunkingPrompt(
    content: string,
    compressionRatio: number,
    isComplete: boolean,
    partNumber?: number,
    totalParts?: number
  ): string {
    const compressionPercent = Math.round(compressionRatio * 100);
    const partInfo = partNumber ? ` (Part ${partNumber}/${totalParts})` : '';
    
    return `You are an expert document analyzer specializing in construction and technical documents. Your task is to intelligently divide the following text into logical chunks and create concise summaries.

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
   - Start text: First 10-15 words of the chunk
   - End text: Last 10-15 words of the chunk
   - These boundaries should be at natural breaking points

3. **Summary Creation**: Create ${compressionPercent}% summaries that:
   - Capture key technical information
   - Maintain construction/engineering terminology
   - Include specific measurements, codes, standards
   - Focus on actionable and reference-worthy content

4. **Output Format**: Respond with this exact JSON structure:
{
  "documentSummary": "Overall summary of the ${isComplete ? 'entire document' : 'document section'}",
  "chunks": [
    {
      "chunkIndex": 0,
      "startText": "First 10-15 words of chunk...",
      "endText": "...last 10-15 words of chunk",
      "summary": "Concise ${compressionPercent}% summary focusing on technical details",
      "estimatedTokens": 150
    }
  ],
  "totalChunks": 3,
  "processingComplete": ${isComplete}
}

IMPORTANT:
- Create 3-8 chunks depending on content complexity
- Each summary should be approximately ${compressionPercent}% of original chunk length
- Ensure chunk boundaries are at natural breaking points
- Include all critical technical information in summaries
- Estimate token count for each summary (roughly 4 characters = 1 token)

Begin analysis and chunking:`;
  }

  /**
   * Parse LLM response and extract chunking data
   */
  private static parseChunkingResponse(response: string): LLMChunkingResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.chunks || !Array.isArray(parsed.chunks)) {
        throw new Error('Invalid chunks array in LLM response');
      }
      
      if (!parsed.documentSummary) {
        throw new Error('Missing document summary in LLM response');
      }
      
      return {
        chunks: parsed.chunks,
        totalChunks: parsed.totalChunks || parsed.chunks.length,
        processingComplete: parsed.processingComplete !== false,
        documentSummary: parsed.documentSummary
      };
    } catch (error) {
      console.error('Error parsing LLM chunking response:', error);
      console.log('Raw response:', response.substring(0, 500) + '...');
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
      
      // Find actual positions in source text based on start/end text
      const { startPos, endPos, actualContent } = this.findChunkBoundaries(
        sourceText,
        llmChunk.startText,
        llmChunk.endText,
        i,
        llmChunks.length
      );
      
      const chunk: DocumentChunk = {
        id: `${document.id}-chunk-${baseIndex + i}`,
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
    }
    
    console.log(`📄 Created ${chunks.length} document chunks with intelligent boundaries`);
    return chunks;
  }

  /**
   * Find actual chunk boundaries in source text
   */
  private static findChunkBoundaries(
    sourceText: string,
    startText: string,
    endText: string,
    chunkIndex: number,
    totalChunks: number
  ): { startPos: number; endPos: number; actualContent: string } {
    // Clean up the boundary texts
    const cleanStartText = startText.trim().toLowerCase();
    const cleanEndText = endText.trim().toLowerCase();
    const cleanSourceText = sourceText.toLowerCase();
    
    // Find start position
    let startPos = cleanSourceText.indexOf(cleanStartText);
    if (startPos === -1) {
      // Fallback: use proportional positioning
      startPos = Math.floor((chunkIndex / totalChunks) * sourceText.length);
      console.warn(`⚠️ Could not find start text "${startText}", using proportional position: ${startPos}`);
    }
    
    // Find end position
    let endPos = cleanSourceText.indexOf(cleanEndText, startPos);
    if (endPos === -1) {
      // Fallback: use proportional positioning
      endPos = Math.floor(((chunkIndex + 1) / totalChunks) * sourceText.length);
      console.warn(`⚠️ Could not find end text "${endText}", using proportional position: ${endPos}`);
    } else {
      // Include the end text in the chunk
      endPos += cleanEndText.length;
    }
    
    // Ensure valid boundaries
    startPos = Math.max(0, startPos);
    endPos = Math.min(sourceText.length, Math.max(startPos + 100, endPos)); // Minimum 100 chars
    
    const actualContent = sourceText.substring(startPos, endPos).trim();
    
    return { startPos, endPos, actualContent };
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
      await IndexedDBService.saveData(this.SUMMARY_STORE, summaryFile.documentId, summaryFile);
      console.log(`💾 Saved summary file for document: ${summaryFile.fileName}`);
    } catch (error) {
      console.error('Error saving summary file:', error);
      throw new Error(`Failed to save summary file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load summary file from IndexedDB
   */
  static async loadSummaryFile(documentId: string): Promise<DocumentSummaryFile | null> {
    try {
      const summaryFile = await IndexedDBService.getData(this.SUMMARY_STORE, documentId);
      return summaryFile as DocumentSummaryFile || null;
    } catch (error) {
      console.error('Error loading summary file:', error);
      return null;
    }
  }

  /**
   * Delete summary file from IndexedDB
   */
  static async deleteSummaryFile(documentId: string): Promise<void> {
    try {
      await IndexedDBService.deleteData(this.SUMMARY_STORE, documentId);
      console.log(`🗑️ Deleted summary file for document: ${documentId}`);
    } catch (error) {
      console.error('Error deleting summary file:', error);
    }
  }

  /**
   * List all summary files
   */
  static async listSummaryFiles(): Promise<DocumentSummaryFile[]> {
    try {
      const allData = await IndexedDBService.getAllData(this.SUMMARY_STORE);
      return allData as DocumentSummaryFile[];
    } catch (error) {
      console.error('Error listing summary files:', error);
      return [];
    }
  }
}
