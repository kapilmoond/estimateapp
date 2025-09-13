/**
 * Professional RAG Service
 * Interfaces with the Python RAG server for semantic search and document management
 */

import { RAGDocument, RAGChunk, RAGSearchResult, RAGConfig, RAGServerStatus, RAGContext } from '../types';

export class RAGService {
  private static readonly BASE_URL = 'http://127.0.0.1:8001';
  private static readonly TIMEOUT = 30000; // 30 seconds

  /**
   * Check if RAG server is running
   */
  static async checkServerStatus(): Promise<RAGServerStatus | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout for status check
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('RAG server is not running:', error);
      return null;
    }
  }

  /**
   * Upload a document to the RAG server
   */
  static async uploadDocument(file: File): Promise<{ documentId: string; fileName: string; status: string; message: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(this.TIMEOUT),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Upload failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search documents using semantic similarity
   */
  static async searchDocuments(
    query: string, 
    maxResults: number = 10, 
    similarityThreshold: number = 0.7
  ): Promise<RAGSearchResult> {
    try {
      const response = await fetch(`${this.BASE_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          maxResults,
          similarityThreshold,
          includeMetadata: true
        }),
        signal: AbortSignal.timeout(this.TIMEOUT),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Search failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all documents from the RAG server
   */
  static async getDocuments(): Promise<RAGDocument[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/documents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`Failed to get documents: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting documents:', error);
      throw new Error(`Failed to get documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a document from the RAG server
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.TIMEOUT),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Delete failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all documents from the RAG server
   */
  static async clearAllDocuments(): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/clear`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.TIMEOUT),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Clear failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error clearing documents:', error);
      throw new Error(`Failed to clear documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const contextParts: string[] = [];
      const sources: string[] = [];
      let totalTokens = 0;

      searchResult.chunks.forEach((chunk, index) => {
        const score = searchResult.scores[index];
        contextParts.push(`[Relevance: ${(score * 100).toFixed(1)}%]\n${chunk.content}`);
        
        // Extract document name from chunk ID (format: docId_chunkId)
        const docId = chunk.documentId;
        if (!sources.includes(docId)) {
          sources.push(docId);
        }
        
        totalTokens += chunk.metadata.tokenCount || 0;
      });

      const context = contextParts.join('\n\n---\n\n');

      // Create enhanced prompt
      const enhancedPrompt = `PROFESSIONAL RAG KNOWLEDGE BASE CONTEXT:
The following information was retrieved from your knowledge base using semantic search. This content is most relevant to your query based on vector similarity analysis.

Sources: ${sources.join(', ')}
Retrieved Chunks: ${searchResult.chunks.length}
Total Tokens: ${totalTokens}
Processing Time: ${searchResult.processingTime.toFixed(3)}s

RELEVANT CONTEXT:
${context}

--- END OF KNOWLEDGE BASE CONTEXT ---

USER REQUEST:
${originalPrompt}

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
   * Get health status of the RAG server
   */
  static async getHealthStatus(): Promise<{ status: string; timestamp: string } | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn('RAG server health check failed:', error);
      return null;
    }
  }
}
