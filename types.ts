
export interface HsrItem {
  "HSR No.": string;
  Description: string;
  Unit: string;
  "Current Rate": string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    fullPrompt?: string; // The complete prompt sent to LLM (including context, knowledge base, etc.)
    timestamp?: number; // When the message was created
}

export interface KeywordsByItem {
    [itemDescription: string]: string[];
}

// Enhanced types for integrated workflow
export type OutputMode = 'discussion' | 'design' | 'drawing';

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

export interface TechnicalDrawing {
  id: string;
  title: string;
  description: string;
  dxfContent: string; // Base64 encoded DXF content
  dxfFilename: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    drawingType: 'plan' | 'elevation' | 'section' | 'detail' | 'general';
    scale: string;
    dimensions: {
      width: number;
      height: number;
      units: 'mm' | 'cm' | 'm' | 'ft' | 'in';
    };
    layers: string[];
    hasAnnotations: boolean;
    hasDimensions: boolean;
  };
  userRequirements: string;
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
  drawings: TechnicalDrawing[];
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
  summary?: string; // LLM-generated 10% summary
  summaryGenerated?: boolean; // Whether summary has been generated
  lastSummaryUpdate?: number; // Timestamp of last summary generation
}

export interface DocumentMetadata {
  fileSize: number;
  pageCount?: number;
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
  language?: string;
  fileType?: string;
  parsedAt?: number;
  parsingMetadata?: {
    sheets?: string[];
    pages?: number;
    encoding?: string;
    structure?: any;
  };
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
  // LLM-based selection settings
  enableLLMSelection: boolean; // Enable LLM-based chunk selection instead of RAG
  autoGenerateSummaries: boolean; // Automatically generate summaries for new chunks
  summaryCompressionRatio: number; // Target compression ratio (0.1 = 10%)
  maxSelectedChunks: number; // Maximum chunks to include in final prompt
}

export interface LLMSelectionResult {
  selectedChunkIds: string[];
  reasoning: string;
  confidence: number;
  totalChunksEvaluated: number;
}

export interface RAGContext {
  query: string;
  relevantChunks?: DocumentChunk[]; // Optional for backward compatibility
  totalDocuments?: number; // Optional for backward compatibility
  searchScore?: number; // Optional for backward compatibility
  contextLength?: number; // Optional for backward compatibility
  // New unified fields
  context: string; // The actual context text to include in prompt
  sources: string[]; // List of source document names
  chunkCount: number; // Number of chunks included
  totalTokens: number; // Estimated token count
}

export interface KnowledgeBaseStats {
  totalDocuments: number;
  totalChunks: number;
  totalSize: number;
  lastUpdated: Date;
  activeDocuments: number;
}
