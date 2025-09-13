import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export type Step = 'scoping' | 'design' | 'drawing' | 'estimation' | 'review';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  fullPrompt?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  createdAt: Date;
  lastModified: Date;
  step: Step;
  conversationHistory: ChatMessage[];
  finalizedScope: string;
  designs: any[];
  drawings: any[];
  estimate: string;
  ragDocuments: any[];
}

export interface AppState {
  currentProject: ProjectData | null;
  projects: ProjectData[];
  isProcessing: boolean;
  currentStep: Step;
  ragServerStatus: {
    isRunning: boolean;
    documentsCount: number;
  };
  llmProvider: {
    provider: string;
    model: string;
    apiKey: string;
  };
}

// Actions
type AppAction =
  | { type: 'SET_CURRENT_PROJECT'; payload: ProjectData }
  | { type: 'UPDATE_PROJECT'; payload: Partial<ProjectData> }
  | { type: 'SET_PROJECTS'; payload: ProjectData[] }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_CURRENT_STEP'; payload: Step }
  | { type: 'UPDATE_RAG_STATUS'; payload: { isRunning: boolean; documentsCount: number } }
  | { type: 'UPDATE_LLM_PROVIDER'; payload: { provider: string; model: string; apiKey: string } }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: AppState = {
  currentProject: null,
  projects: [],
  isProcessing: false,
  currentStep: 'scoping',
  ragServerStatus: {
    isRunning: false,
    documentsCount: 0,
  },
  llmProvider: {
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    apiKey: '',
  },
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_PROJECT':
      return {
        ...state,
        currentProject: action.payload,
        currentStep: action.payload.step,
      };

    case 'UPDATE_PROJECT':
      if (!state.currentProject) return state;
      
      const updatedProject = {
        ...state.currentProject,
        ...action.payload,
        lastModified: new Date(),
      };

      return {
        ...state,
        currentProject: updatedProject,
        projects: state.projects.map(p => 
          p.id === updatedProject.id ? updatedProject : p
        ),
      };

    case 'SET_PROJECTS':
      return {
        ...state,
        projects: action.payload,
      };

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload,
      };

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
        currentProject: state.currentProject ? {
          ...state.currentProject,
          step: action.payload,
        } : null,
      };

    case 'UPDATE_RAG_STATUS':
      return {
        ...state,
        ragServerStatus: action.payload,
      };

    case 'UPDATE_LLM_PROVIDER':
      return {
        ...state,
        llmProvider: action.payload,
      };

    case 'ADD_MESSAGE':
      if (!state.currentProject) return state;
      
      const updatedConversation = [
        ...state.currentProject.conversationHistory,
        action.payload,
      ];

      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          conversationHistory: updatedConversation,
          lastModified: new Date(),
        },
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context
interface AppStateContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Helper functions
  createProject: (name: string) => void;
  switchProject: (projectId: string) => void;
  updateCurrentProject: (updates: Partial<ProjectData>) => void;
  addMessage: (message: ChatMessage) => void;
  setProcessing: (processing: boolean) => void;
  setCurrentStep: (step: Step) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Provider
interface AppStateProviderProps {
  children: ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Helper functions
  const createProject = (name: string) => {
    const newProject: ProjectData = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      name,
      createdAt: new Date(),
      lastModified: new Date(),
      step: 'scoping',
      conversationHistory: [
        {
          role: 'assistant',
          content: 'Hello! I\'m your AI assistant for construction estimation. Please describe the project you want to build, and we can define its scope together.',
          timestamp: Date.now(),
        },
      ],
      finalizedScope: '',
      designs: [],
      drawings: [],
      estimate: '',
      ragDocuments: [],
    };

    dispatch({ type: 'SET_PROJECTS', payload: [...state.projects, newProject] });
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: newProject });
  };

  const switchProject = (projectId: string) => {
    const project = state.projects.find(p => p.id === projectId);
    if (project) {
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
    }
  };

  const updateCurrentProject = (updates: Partial<ProjectData>) => {
    dispatch({ type: 'UPDATE_PROJECT', payload: updates });
  };

  const addMessage = (message: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  };

  const setProcessing = (processing: boolean) => {
    dispatch({ type: 'SET_PROCESSING', payload: processing });
  };

  const setCurrentStep = (step: Step) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  };

  const value: AppStateContextType = {
    state,
    dispatch,
    createProject,
    switchProject,
    updateCurrentProject,
    addMessage,
    setProcessing,
    setCurrentStep,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
