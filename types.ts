
export interface HsrItem {
  "HSR No.": string;
  Description: string;
  Unit: string;
  "Current Rate": string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface KeywordsByItem {
    [itemDescription: string]: string[];
}

// Enhanced types for integrated workflow
export type OutputMode = 'discussion' | 'design';

export interface UserGuideline {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'scoping' | 'design' | 'estimation';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationThread {
  id: string;
  mode: OutputMode;
  messages: ChatMessage[];
  summary: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComponentDesign {
  id: string;
  componentName: string;
  designContent: string;
  htmlContent?: string;
  specifications: {
    materials: string[];
    dimensions: Record<string, number>;
    calculations: string;
  };
  createdAt: Date;
  includeInContext?: boolean;
}


export interface ProcessSummary {
  id: string;
  projectDescription: string;
  stepSummaries: StepSummary[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StepSummary {
  step: string;
  timestamp: Date;
  summary: string;
  llmSummary?: string;
  contextItems: ContextItem[];
}

export interface ContextItem {
  id: string;
  type: 'design' | 'discussion' | 'estimate' | 'guideline';
  title: string;
  content: string;
  includeInContext: boolean;
  createdAt: Date;
}

export interface ContextState {
  summary: ProcessSummary;
  activeContextItems: ContextItem[];
  compactSummary: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  models: LLMModel[];
  apiKeyLabel: string;
  description: string;
}

export interface LLMModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  costPer1kTokens: number;
}

export interface ProjectData {
  discussions: ConversationThread[];
  designs: ComponentDesign[];
  finalizedScope: string;
  keywords: string[];
  keywordsByItem: KeywordsByItem;
  hsrItems: HsrItem[];
  guidelines: UserGuideline[];
}

// Knowledge Base Types
export interface KnowledgeBaseDocument {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'xlsx' | 'xls';
  content: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface DocumentMetadata {
  fileSize: number;
  pageCount?: number;
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
  language?: string;
}

export interface ChunkMetadata {
  pageNumber?: number;
  sectionTitle?: string;
  wordCount: number;
  characterCount: number;
}

export interface KnowledgeBaseConfig {
  chunkSize: number;
  chunkOverlap: number;
  maxChunks: number;
  enableEmbeddings: boolean;
  embeddingModel: string;
  similarityThreshold: number;
}

export interface RAGContext {
  query: string;
  relevantChunks: DocumentChunk[];
  totalDocuments: number;
  searchScore: number;
  contextLength: number;
}

export interface KnowledgeBaseStats {
  totalDocuments: number;
  totalChunks: number;
  totalSize: number;
  lastUpdated: Date;
  activeDocuments: number;
}
