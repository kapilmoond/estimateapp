
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

// Professional RAG System Types
export interface RAGDocument {
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

export interface RAGChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding?: number[];
  metadata: {
    startChar: number;
    endChar: number;
    tokenCount: number;
  };
}

export interface RAGSearchResult {
  chunks: RAGChunk[];
  scores: number[];
  query: string;
  totalResults: number;
  processingTime: number;
}

export interface RAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  maxResults: number;
  similarityThreshold: number;
  embeddingModel: string;
}

export interface RAGServerStatus {
  isRunning: boolean;
  port: number;
  documentsCount: number;
  chunksCount: number;
  embeddingModel: string;
}

export interface RAGContext {
  query: string;
  context: string;
  sources: string[];
  chunkCount: number;
  totalTokens: number;
  processingTime: number;
}
