
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
export type OutputMode = 'discussion' | 'design' | 'drawing';

export interface UserGuideline {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'scoping' | 'design' | 'drawing' | 'estimation';
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
  svgContent: string;
  dimensions: { width: number; height: number };
  scale: string;
  componentName: string;
  createdAt: Date;
  includeInContext?: boolean;
  // Enhanced CAD properties
  cadData?: CADDrawingData;
  drawingType: 'svg' | 'cad';
}

// Professional CAD Drawing Types
export interface CADDrawingData {
  id: string;
  title: string;
  description: string;
  layers: CADLayer[];
  entities: CADEntity[];
  dimensions: CADDimension[];
  annotations: CADAnnotation[];
  viewport: CADViewport;
  units: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  scale: string;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'Letter' | 'Legal';
  createdAt: Date;
  modifiedAt: Date;
  version: number;
}

export interface CADLayer {
  id: string;
  name: string;
  color: string;
  lineType: 'solid' | 'dashed' | 'dotted' | 'dashdot';
  lineWeight: number;
  visible: boolean;
  locked: boolean;
  printable: boolean;
}

export interface CADEntity {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'arc' | 'polyline' | 'text' | 'hatch';
  layerId: string;
  geometry: CADGeometry;
  style: CADEntityStyle;
  properties: Record<string, any>;
}

export interface CADGeometry {
  type: string;
  coordinates: number[][];
  center?: { x: number; y: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  width?: number;
  height?: number;
}

export interface CADEntityStyle {
  color: string;
  lineType: string;
  lineWeight: number;
  fillColor?: string;
  fillPattern?: string;
  transparency?: number;
}

export interface CADDimension {
  id: string;
  type: 'linear' | 'angular' | 'radial' | 'diameter';
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  textPosition: { x: number; y: number };
  value: number;
  unit: string;
  precision: number;
  style: CADDimensionStyle;
}

export interface CADDimensionStyle {
  textHeight: number;
  arrowSize: number;
  extensionLineOffset: number;
  dimensionLineOffset: number;
  color: string;
  textStyle: string;
}

export interface CADAnnotation {
  id: string;
  type: 'text' | 'leader' | 'note' | 'symbol';
  position: { x: number; y: number };
  content: string;
  style: CADTextStyle;
  leaderPoints?: { x: number; y: number }[];
}

export interface CADTextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  alignment: 'left' | 'center' | 'right';
  rotation: number;
}

export interface CADViewport {
  center: { x: number; y: number };
  zoom: number;
  rotation: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

// CAD Tool Types
export interface CADTool {
  id: string;
  name: string;
  icon: string;
  category: 'draw' | 'modify' | 'annotate' | 'measure';
  cursor: string;
  shortcut?: string;
}

export interface CADDrawingSettings {
  snapToGrid: boolean;
  gridSize: number;
  snapTolerance: number;
  orthoMode: boolean;
  polarTracking: boolean;
  objectSnap: boolean;
  snapModes: CADSnapMode[];
}

export interface CADSnapMode {
  type: 'endpoint' | 'midpoint' | 'center' | 'intersection' | 'perpendicular' | 'tangent';
  enabled: boolean;
  icon: string;
}

// Export/Import Types
export interface CADExportOptions {
  format: 'dxf' | 'pdf' | 'svg' | 'png' | 'jpg';
  scale: number;
  paperSize?: string;
  orientation?: 'portrait' | 'landscape';
  layers?: string[];
  quality?: 'low' | 'medium' | 'high';
}

export interface CADImportResult {
  success: boolean;
  drawing?: CADDrawingData;
  errors?: string[];
  warnings?: string[];
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
  type: 'design' | 'drawing' | 'discussion' | 'estimate' | 'guideline';
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
