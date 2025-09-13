interface RAGDocument {
  id: string;
  fileName: string;
  content: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'xlsx' | 'xls';
  uploadDate: Date;
  metadata: {
    fileSize: number;
    wordCount: number;
    chunkCount: number;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  };
  isActive: boolean;
}

interface RAGSearchResult {
  chunks: any[];
  scores: number[];
  query: string;
  totalResults: number;
  processingTime: number;
}

interface RAGServerStatus {
  isRunning: boolean;
  port: number;
  documentsCount: number;
  chunksCount: number;
  embeddingModel: string;
}

interface RAGContext {
  query: string;
  context: string;
  sources: string[];
  chunkCount: number;
  totalTokens: number;
  processingTime: number;
}

export class RAGService {
  private static readonly RAG_SERVER_URL = 'http://127.0.0.1:8000';

  /**
   * Check if RAG server is running
   */
  static async checkServerStatus(): Promise<RAGServerStatus | null> {
    try {
      const response = await fetch(`${this.RAG_SERVER_URL}/status`);
      if (response.ok) {
        const data = await response.json();
        return {
          isRunning: true,
          port: 8000,
          documentsCount: data.documentsCount || 0,
          chunksCount: data.chunkCount || 0,
          embeddingModel: data.embeddingModel || 'sentence-transformers'
        };
      }
      return null;
    } catch (error) {
      console.warn('RAG server not available:', error);
      return null;
    }
  }

  /**
   * Upload document to RAG server
   */
  static async uploadDocument(file: File): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.RAG_SERVER_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          documentId: data.documentId
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.detail || 'Upload failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Search documents using semantic search
   */
  static async searchDocuments(
    query: string,
    maxResults: number = 5,
    similarityThreshold: number = 0.7
  ): Promise<RAGSearchResult> {
    try {
      const response = await fetch(`${this.RAG_SERVER_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          max_results: maxResults,
          similarity_threshold: similarityThreshold
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          chunks: data.chunks || [],
          scores: data.scores || [],
          query,
          totalResults: data.total_results || 0,
          processingTime: data.processing_time || 0
        };
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('RAG search error:', error);
      return {
        chunks: [],
        scores: [],
        query,
        totalResults: 0,
        processingTime: 0
      };
    }
  }

  /**
   * Get list of uploaded documents
   */
  static async getDocuments(): Promise<RAGDocument[]> {
    try {
      const response = await fetch(`${this.RAG_SERVER_URL}/documents`);
      if (response.ok) {
        const data = await response.json();
        return data.documents || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get documents:', error);
      return [];
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.RAG_SERVER_URL}/documents/${documentId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to delete document:', error);
      return false;
    }
  }

  /**
   * Enhance a prompt with RAG context
   */
  static async enhancePromptWithRAG(
    originalPrompt: string,
    includeKnowledgeBase: boolean = false,
    maxResults: number = 5,
    similarityThreshold: number = 0.7
  ): Promise<{ enhancedPrompt: string; ragContext: RAGContext | null }> {
    try {
      if (!includeKnowledgeBase) {
        return {
          enhancedPrompt: originalPrompt,
          ragContext: null
        };
      }

      // Check if server is running
      const serverStatus = await this.checkServerStatus();
      if (!serverStatus || !serverStatus.isRunning) {
        console.warn('RAG server is not running, proceeding without knowledge base');
        return {
          enhancedPrompt: originalPrompt,
          ragContext: null
        };
      }

      if (serverStatus.documentsCount === 0) {
        console.warn('No documents in knowledge base');
        return {
          enhancedPrompt: originalPrompt,
          ragContext: null
        };
      }

      // Search for relevant content
      const searchResult = await this.searchDocuments(originalPrompt, maxResults, similarityThreshold);

      if (searchResult.chunks.length === 0) {
        console.warn('No relevant content found in knowledge base');
        return {
          enhancedPrompt: originalPrompt,
          ragContext: null
        };
      }

      // Build context from search results
      const contextChunks = searchResult.chunks.map((chunk, index) => {
        const score = searchResult.scores[index];
        return `[Source ${index + 1} - Relevance: ${(score * 100).toFixed(1)}%]\n${chunk.content}`;
      });

      const context = contextChunks.join('\n\n---\n\n');
      const sources = searchResult.chunks.map((chunk, index) => `Source ${index + 1}`);
      
      // Estimate token count (rough approximation)
      const totalTokens = Math.ceil((context.length + originalPrompt.length) / 4);

      const enhancedPrompt = `Context from Knowledge Base:
${context}

---

User Request: ${originalPrompt}

Please use the knowledge base context above to provide a comprehensive and accurate response. Reference the source information when applicable and build upon the technical details provided.`;

      const ragContext: RAGContext = {
        query: originalPrompt,
        context,
        sources,
        chunkCount: searchResult.chunks.length,
        totalTokens,
        processingTime: searchResult.processingTime
      };

      return {
        enhancedPrompt,
        ragContext
      };

    } catch (error) {
      console.error('Error enhancing prompt with RAG:', error);
      // Fallback to original prompt if RAG fails
      return {
        enhancedPrompt: originalPrompt,
        ragContext: null
      };
    }
  }

  /**
   * Process multiple files for upload
   */
  static async uploadMultipleFiles(files: File[]): Promise<{
    successful: string[];
    failed: { file: string; error: string }[];
  }> {
    const successful: string[] = [];
    const failed: { file: string; error: string }[] = [];

    for (const file of files) {
      const result = await this.uploadDocument(file);
      if (result.success) {
        successful.push(file.name);
      } else {
        failed.push({
          file: file.name,
          error: result.error || 'Unknown error'
        });
      }
    }

    return { successful, failed };
  }
}
