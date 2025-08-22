
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
}

export interface TechnicalDrawing {
  id: string;
  title: string;
  description: string;
  svgContent: string;
  dxfContent?: string;
  dimensions: { width: number; height: number };
  scale: string;
  componentName: string;
  createdAt: Date;
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
