import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HsrItem, ChatMessage, KeywordsByItem, OutputMode, UserGuideline, ComponentDesign, ConversationThread, TechnicalDrawing } from './types';
import { continueConversation, generatePlainTextEstimate, generateKeywordsForItems } from './services/geminiService';
import { searchHSR, searchHSREnhanced } from './services/hsrService';
import { KeywordGenerationResult, KeywordGenerationService } from './services/keywordGenerationService';
import { KeywordManager } from './components/KeywordManager';
import { StepNavigation } from './components/StepNavigation';
import { BackgroundHSRService, BackgroundHSRProgress } from './services/backgroundHSRService';
import { BackgroundHSRProgressComponent } from './components/BackgroundHSRProgress';
import { NSRateAnalysis } from './components/NSRateAnalysis';
import { speak } from './services/speechService';
import { GuidelinesService } from './services/guidelinesService';
import { ThreadService } from './services/threadService';
import { DesignService } from './services/designService';
import { ContextService } from './services/contextService';
import { DXFService, DXFStorageService } from './services/dxfService';
import { HTMLService } from './services/htmlService';
import { TemplateService, MasterTemplate } from './services/templateService';
import { Spinner } from './components/Spinner';
import { ResultDisplay } from './components/ResultDisplay';
import { KeywordsDisplay } from './components/KeywordsDisplay';
import { HsrItemsDisplay } from './components/HsrItemsDisplay';
import { VoiceInput } from './components/VoiceInput';
import { GuidelinesManager } from './components/GuidelinesManager';
import { OutputModeSelector } from './components/OutputModeSelector';
import { DesignDisplay } from './components/DesignDisplay';
import { DrawingDisplay } from './components/DrawingDisplay';
import { ContextManager } from './components/ContextManager';
import { LLMProviderSelector } from './components/LLMProviderSelector';
import { KnowledgeBaseManager } from './components/KnowledgeBaseManager';
import { KnowledgeBaseDisplay } from './components/KnowledgeBaseDisplay';
import { DiscussionContextManager } from './components/DiscussionContextManager';
import { TemplateSelector } from './components/TemplateSelector';
import { TemplateManager } from './components/TemplateManager';
import { CollapsibleControlPanel } from './components/CollapsibleControlPanel';
import { ProjectManager } from './components/ProjectManager';
import { ProjectService, ProjectData } from './services/projectService';

import { DrawingResultsDisplay } from './components/DrawingResultsDisplay';
import { EzdxfDrawingService, DrawingResult } from './services/ezdxfDrawingService';
import { DrawingService, ProjectDrawing } from './services/drawingService';
import { CompactFileUpload } from './components/CompactFileUpload';
import { LLMService } from './services/llmService';
import { RAGService } from './services/ragService';
import { DrawingContextSelector } from './components/DrawingContextSelector';

import { SystemStatus } from './components/SystemStatus';
type Step = 'scoping' | 'generatingKeywords' | 'approvingKeywords' | 'approvingHsrItems' | 'approvingRefinedHsrItems' | 'generatingEstimate' | 'reviewingEstimate' | 'done';
type ReferenceDoc = {
  file: File;
  content: string; // Changed from 'text' to 'content' for consistency
  type: 'pdf' | 'word' | 'excel' | 'text' | 'markdown' | 'unknown';
  metadata?: {
    parsedAt?: number;
    parsingMetadata?: {
      sheets?: string[];
      pages?: number;
      encoding?: string;
      structure?: any;
    };
    fileSize?: number;
  };
};

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('scoping');
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your AI assistant for construction estimation. Please describe the project you want to build, and we can define its scope together.' }
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [finalizedScope, setFinalizedScope] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsByItem, setKeywordsByItem] = useState<KeywordsByItem>({});
  const [keywordGenerationResult, setKeywordGenerationResult] = useState<KeywordGenerationResult | null>(null);
  const [subcomponentItems, setSubcomponentItems] = useState<string[]>([]);
  const [useHsrForRemake, setUseHsrForRemake] = useState<boolean>(false);
  const [backgroundHSRProgress, setBackgroundHSRProgress] = useState<BackgroundHSRProgress | null>(null);
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState<boolean>(false);
  const [showNSRateAnalysis, setShowNSRateAnalysis] = useState<boolean>(false);
  const [hsrItems, setHsrItems] = useState<HsrItem[]>([]);
  const [finalEstimateText, setFinalEstimateText] = useState<string>('');
  const [editInstruction, setEditInstruction] = useState<string>('');
  const [keywordFeedback, setKeywordFeedback] = useState<string>('');
  const [hsrItemFeedback, setHsrItemFeedback] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');

  const [referenceDocs, setReferenceDocs] = useState<ReferenceDoc[]>([]);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);

  // Enhanced state for integrated workflow
  const [outputMode, setOutputMode] = useState<OutputMode>('discussion');
  const [currentThread, setCurrentThread] = useState<ConversationThread | null>(null);
  const [guidelines, setGuidelines] = useState<UserGuideline[]>([]);
  const [designs, setDesigns] = useState<ComponentDesign[]>([]);
  const [drawings, setDrawings] = useState<TechnicalDrawing[]>([]);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState<boolean>(false);
  const [isLLMSettingsOpen, setIsLLMSettingsOpen] = useState<boolean>(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState<boolean>(false);
  const [includeKnowledgeBase, setIncludeKnowledgeBase] = useState<boolean>(false);
  const [currentProvider] = useState<string>(LLMService.getCurrentProvider());
  const [currentModel] = useState<string>(LLMService.getCurrentModel());
  const [showProjectData, setShowProjectData] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [contextKey, setContextKey] = useState<number>(0); // Force re-render of context
  const [isContextManagerOpen, setIsContextManagerOpen] = useState<boolean>(false);
  const [purifiedContext, setPurifiedContext] = useState<string>('');
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState<boolean>(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState<boolean>(false);
  const [selectedTemplates, setSelectedTemplates] = useState<MasterTemplate[]>([]);
  const [templateInstructions, setTemplateInstructions] = useState<string>('');

  // Project management state
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);

  // Drawing state
  const [drawingResults, setDrawingResults] = useState<DrawingResult[]>([]);
  const [isDrawingGenerating, setIsDrawingGenerating] = useState<boolean>(false);
  const [savedDrawings, setSavedDrawings] = useState<ProjectDrawing[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const referenceText = useMemo(() =>
    referenceDocs.map(doc => {
      // Enhanced file information with parsing metadata
      let fileInfo = `--- START OF ${doc.file.name} ---`;
      if (doc.metadata?.parsingMetadata?.sheets) {
        fileInfo += `\n[Excel file with sheets: ${doc.metadata.parsingMetadata.sheets.join(', ')}]`;
      }
      if (doc.metadata?.parsingMetadata?.pages) {
        fileInfo += `\n[Document with ${doc.metadata.parsingMetadata.pages} pages]`;
      }
      fileInfo += `\n${doc.content}\n--- END OF ${doc.file.name} ---`;
      return fileInfo;
    }).join('\n\n'),
  [referenceDocs]);

  // Auto-save project when important state changes
  useEffect(() => {
    if (currentProject && conversationHistory.length > 1) {
      const timeoutId = setTimeout(() => {
        saveCurrentProject();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [conversationHistory, finalizedScope, designs, drawings, finalEstimateText, selectedTemplates]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('gemini-api-key');
    if (storedApiKey) {
        setApiKey(storedApiKey);
    }

    // Load guidelines
    loadGuidelines();

    // Try to load current project
    const savedProject = ProjectService.loadCurrentProject();
    if (savedProject) {
      loadProjectData(savedProject);
    } else {
      // No saved project, load individual data (legacy support)
      loadDesigns();
      loadDrawings();
    }

    // Initialize context if not exists
    const existingContext = ContextService.getCurrentContext();
    if (!existingContext && conversationHistory.length > 1) {
      const projectDescription = conversationHistory.slice(1).map(msg => msg.text).join(' ').substring(0, 200);
      ContextService.initializeContext(projectDescription);
    }
  }, []);

  const loadGuidelines = () => {
    const loadedGuidelines = GuidelinesService.loadGuidelines();
    setGuidelines(loadedGuidelines);
  };

  const loadDesigns = () => {
    const loadedDesigns = DesignService.loadDesigns();
    console.log('Loading designs:', loadedDesigns);
    setDesigns(loadedDesigns);
  };

  const loadDrawings = () => {
    // Load legacy drawings
    const loadedDrawings = DXFStorageService.loadDrawings();
    setDrawings(loadedDrawings);

    // Load new persistent drawings
    loadSavedDrawings();
  };

  // Load saved drawings for current project
  const loadSavedDrawings = () => {
    try {
      const projectId = ProjectService.getCurrentProjectId() || 'default';
      const drawings = DrawingService.loadProjectDrawings(projectId);
      setSavedDrawings(drawings);

      // Load all drawing results for display (do not overwrite previous)
      if (drawings.length > 0) {
        setDrawingResults(drawings
          .sort((a, b) => b.timestamp - a.timestamp)
          .map(d => d.result)
        );
      } else {
        setDrawingResults([]);
      }
    } catch (error) {
      console.error('Error loading saved drawings:', error);
    }
  };

  const loadProjectData = (project: ProjectData) => {
    setCurrentProject(project);
    setStep(project.step);
    setConversationHistory(project.conversationHistory);
    setCurrentMessage(project.currentMessage);
    setFinalizedScope(project.finalizedScope);
    setKeywords(project.keywords);
    setHsrItems(project.hsrItems);
    setFinalEstimateText(project.finalEstimateText);

    // Clear all designs and drawings first, then load project-specific ones
    setDesigns([]);
    setDrawings([]);
    setDrawingResults([]);

    // Load project-specific designs and drawings
    setDesigns(project.designs || []);
    setDrawings(project.drawings || []);

    setReferenceDocs(project.referenceDocs);
    setOutputMode(project.outputMode);
    setPurifiedContext(project.purifiedContext);
    setSelectedTemplates(project.selectedTemplates || []);
    setTemplateInstructions(project.templateInstructions || '');

    // Clear any global design/drawing storage to prevent cross-project contamination
    DesignService.clearAllDesigns();
    DXFStorageService.clearAllDrawings();

    console.log('Loaded project:', project.name, 'with', project.designs?.length || 0, 'designs');
  };

  const saveCurrentProject = () => {
    if (!currentProject) return;

    const updatedProject: ProjectData = {
      ...currentProject,
      step,
      conversationHistory,
      currentMessage,
      finalizedScope,
      keywords,
      hsrItems,
      finalEstimateText,
      designs,
      drawings,
      referenceDocs,
      outputMode,
      purifiedContext,
      selectedTemplates,
      templateInstructions
    };

    ProjectService.saveProject(updatedProject);
    setCurrentProject(updatedProject);
  };

  const handleNewProject = (projectName: string) => {
    // Save current project if exists
    if (currentProject) {
      saveCurrentProject();
    }

    // Create new project
    const newProject = ProjectService.createProject(projectName);
    loadProjectData(newProject);
  };

  const handleProjectSelected = (project: ProjectData) => {
    // Save current project if exists
    if (currentProject) {
      saveCurrentProject();
    }

    // Load selected project
    loadProjectData(project);
  };

  const handleDrawingGenerated = (result: DrawingResult) => {
    // Show the latest result immediately in the UI (even if persistence fails)
    setDrawingResults(prev => [result, ...prev]);
    setIsDrawingGenerating(false);

    // Add to conversation history
    setConversationHistory(prev => [
      ...prev,
      { role: 'model', text: `✅ **Professional CAD Drawing Generated!**\n\n📐 **Drawing:** ${result.title}\n\n📝 **Description:** ${result.description}\n\n💾 **File:** Ready for download as DXF\n\n🔧 **Features:** Complete with dimensions, annotations, and professional CAD standards\n\n📥 **Next Steps:** Download the DXF file to open in AutoCAD, FreeCAD, or any CAD software.` }
    ]);
  };

  const handleDrawingError = (error: string) => {
    setIsDrawingGenerating(false);
    setError(error);

    // Add error to conversation history
    setConversationHistory(prev => [
      ...prev,
      { role: 'model', text: `❌ **Drawing Generation Failed**\n\n**Error:** ${error}\n\n**Please try again with:**\n• More specific requirements\n• Simpler drawing request\n• Check your internet connection\n\n**Need help?** Describe what type of technical drawing you need and I'll guide you through the process.` }
    ]);
  };

  const handleDrawingRegenerate = (instructions: string, previousCode?: string) => {
    // Include previous Python code explicitly so the LLM edits only what is required
    const enhancedInput = `${currentMessage}\n\nMODIFICATIONS REQUESTED:\n${instructions}`;
    setCurrentMessage(enhancedInput);
    handleDrawingRequest(undefined, previousCode);
  };

  const handleContextUpdate = () => {
    setContextKey(prev => prev + 1); // Force re-render of context components
  };

  const handleKnowledgeBaseUpdate = () => {
    // Force re-render when knowledge base is updated
    setContextKey(prev => prev + 1);
  };

  const handleEditDesign = async (design: ComponentDesign, editInstruction: string) => {
    setLoadingMessage('🔄 Editing design based on your instructions...');
    setIsAiThinking(true);
    setError(null);

    try {
      const activeGuidelines = GuidelinesService.getActiveGuidelines();
      const designGuidelines = GuidelinesService.getActiveGuidelines('design');
      const allGuidelines = [...activeGuidelines, ...designGuidelines];
      const guidelinesText = GuidelinesService.formatGuidelinesForPrompt(allGuidelines);

      const scopeContext = purifiedContext || finalizedScope || ThreadService.getAllContextForMode('discussion');

      await DesignService.editComponentDesign(
        design,
        editInstruction,
        scopeContext,
        guidelinesText,
        referenceText
      );

      loadDesigns();

      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: `Edit design for ${design.componentName}: ${editInstruction}` },
        { role: 'model', text: `✅ **Design Updated Successfully!**\n\n🏗️ **Component:** ${design.componentName}\n\n📝 **Changes Applied:** ${editInstruction}\n\n📋 **Status:** The design has been improved based on your instructions.\n\n📁 **View:** Check the updated design in the Component Designs section below.` }
      ]);

    } catch (err: any) {
      console.error('Edit design error:', err);
      setError(err.message || 'An error occurred while editing the design.');
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
    }
  };

  const handleGenerateHTML = async (design: ComponentDesign, htmlInstruction: string) => {
    setLoadingMessage('🌐 Generating professional HTML document...');
    setIsAiThinking(true);
    setError(null);

    try {
      const activeGuidelines = GuidelinesService.getActiveGuidelines();
      const designGuidelines = GuidelinesService.getActiveGuidelines('design');
      const allGuidelines = [...activeGuidelines, ...designGuidelines];
      const guidelinesText = GuidelinesService.formatGuidelinesForPrompt(allGuidelines);

      const scopeContext = purifiedContext || finalizedScope || ThreadService.getAllContextForMode('discussion');

      const htmlContent = await HTMLService.generateHTMLFromDesign(
        design,
        htmlInstruction,
        scopeContext,
        guidelinesText,
        referenceText
      );

      // Download the HTML file
      HTMLService.downloadHTML(htmlContent, `${design.componentName.replace(/[^a-z0-9]/gi, '_')}_design`);

      // Also offer to preview
      if (confirm('HTML file downloaded! Would you like to preview it in a new window?')) {
        HTMLService.previewHTML(htmlContent);
      }

      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: `Generate HTML for ${design.componentName}: ${htmlInstruction}` },
        { role: 'model', text: `✅ **HTML Generated Successfully!**\n\n🌐 **Component:** ${design.componentName}\n\n📄 **File:** Downloaded as HTML document\n\n💡 **Features:**\n• Professional formatting and styling\n• Print-ready layout\n• Complete design specifications\n• Organized sections and tables\n\n📁 **Status:** HTML file has been downloaded to your computer.` }
      ]);

    } catch (err: any) {
      console.error('HTML generation error:', err);
      setError(err.message || 'An error occurred while generating HTML.');
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
    }
  };

  const handleContextPurified = (newPurifiedContext: string) => {
    setPurifiedContext(newPurifiedContext);

    // Add to conversation history
    setConversationHistory(prev => [
      ...prev,
      { role: 'model', text: `✅ **Discussion Context Purified!**\n\n🧹 **Status:** Your discussion context has been analyzed and purified.\n\n📋 **Summary:** A comprehensive context summary has been created that captures all final decisions, requirements, and project details.\n\n💡 **Benefits:**\n• Cleaner context for future AI interactions\n• Focus on final decisions only\n• Organized project information\n• Improved AI response quality\n\n🎯 **Next Steps:** This purified context will now be used for all future design and estimation work.` }
    ]);
  };

  const handleTemplateSelected = (templates: MasterTemplate[], customInstructions: string) => {
    setSelectedTemplates(templates);
    setTemplateInstructions(customInstructions);

    // Add to conversation history
    const templateNames = templates.map(t => t.name).join(', ');
    setConversationHistory(prev => [
      ...prev,
      { role: 'model', text: `✅ **Master Templates Applied!**\n\n📋 **Templates Selected:** ${templateNames}\n\n🎯 **Custom Instructions:** ${customInstructions || 'None specified'}\n\n💡 **Benefits:**\n• Proven estimation procedures\n• Faster decision making\n• Consistent quality standards\n• Best practices integration\n\n🚀 **Ready:** Your project now has access to proven templates and procedures. The AI will use these to guide the estimation process.` }
    ]);
  };

  useEffect(() => {
    const loadVoices = () => {
        setAvailableVoices(window.speechSynthesis.getVoices());
    };

    // Load voices initially
    loadVoices();

    // Update when the voice list changes
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Cleanup
    return () => {
        window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const resetState = () => {
    // Save current project before resetting
    if (currentProject) {
      saveCurrentProject();
    }

    // Open project manager to create new project or select existing
    setIsProjectManagerOpen(true);
  };

  const handleFileUpload = (newFiles: ReferenceDoc[]) => {
    setReferenceDocs(prevDocs => {
      const existingFileNames = new Set(prevDocs.map(doc => doc.file.name));
      const filteredNewFiles = newFiles.filter(newFile => !existingFileNames.has(newFile.file.name));
      return [...prevDocs, ...filteredNewFiles];
    });
  };

  const handleFileRemove = (fileNameToRemove: string) => {
    setReferenceDocs(prevDocs => prevDocs.filter(doc => doc.file.name !== fileNameToRemove));
  };

  const handleApiKeySave = () => {
    localStorage.setItem('gemini-api-key', apiKeyInput);
    setApiKey(apiKeyInput);
    setApiKeyInput('');
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentMessage.trim() || isAiThinking) return;

    const newMessage: ChatMessage = { role: 'user', text: currentMessage };

    // Handle different output modes
    if (outputMode === 'design') {
      await handleDesignRequest(currentMessage);
    } else if (outputMode === 'drawing') {
      await handleDrawingRequest(currentMessage);
    } else {
      // Regular discussion mode
      const newHistory = [...conversationHistory, newMessage];
      setConversationHistory(newHistory);
      setCurrentMessage('');
      setLoadingMessage('Thinking...');
      setIsAiThinking(true);
      setError(null);

      try {
        // Add context from previous steps
        const contextPrompt = ContextService.generateContextPrompt();

        // Add design context with quantities to discussions
        const designContext = designs.filter(d => d.includeInContext !== false)
          .map(d => {
            // Extract quantities from design content
            const quantityMatches = d.designContent.match(/(\d+(?:\.\d+)?)\s*(m³|m²|m|kg|nos?|units?|pieces?|sq\.?\s*m|cu\.?\s*m|linear\s*m)/gi) || [];
            const quantities = quantityMatches.length > 0 ? `\nQuantities: ${quantityMatches.join(', ')}` : '';

            return `**DESIGN REFERENCE - ${d.componentName}:**\n${d.designContent}${quantities}\n---`;
          })
          .join('\n\n');

        // Add drawings context summaries
        const drawingsContext = savedDrawings
          .filter(d => d.includeInContext !== false)
          .map(d => `• ${d.title}: ${d.description}`)
          .join('\n');

        let enhancedReferenceText = referenceText + contextPrompt;

        // Include design context in discussions
        if (designContext) {
          enhancedReferenceText += `\n\n**AVAILABLE COMPONENT DESIGNS:**\n${designContext}`;
        }

        // Include drawings context in discussions
        if (drawingsContext) {
          enhancedReferenceText += `\n\n**AVAILABLE TECHNICAL DRAWINGS:**\n${drawingsContext}`;
        }

        // Add knowledge base context if enabled
        if (includeKnowledgeBase) {
          const { enhancedPrompt } = RAGService.enhancePromptWithKnowledgeBase(
            currentMessage,
            includeKnowledgeBase
          );
          // Use the enhanced prompt for the conversation
          newHistory[newHistory.length - 1].text = enhancedPrompt;
        }

        // Add comprehensive template context if templates are selected
        if (selectedTemplates.length > 0) {
          let templateContext = `\n\n**MASTER TEMPLATES ACTIVE - COMPLETE GUIDANCE:**\n`;
          selectedTemplates.forEach((template, index) => {
            templateContext += `\n**Template ${index + 1}: ${template.name}**\n`;
            templateContext += `Project Type: ${template.projectType}\n`;
            templateContext += `Description: ${template.description}\n`;
            templateContext += `\n**COMPLETE STEP-BY-STEP PROCEDURE:**\n${template.stepByStepProcedure}\n`;
            templateContext += `\n**TEMPLATE TAGS:** ${template.tags.join(', ')}\n`;
            templateContext += `Created: ${new Date(template.createdAt).toLocaleDateString()}\n`;
            templateContext += `Usage Count: ${template.usageCount}\n`;
          });

          if (templateInstructions.trim()) {
            templateContext += `\n**CUSTOM TEMPLATE INSTRUCTIONS:**\n${templateInstructions}\n`;
          }

          templateContext += `\n**CRITICAL TEMPLATE USAGE INSTRUCTIONS:**\n`;
          templateContext += `- Follow the EXACT step-by-step procedures from the selected templates\n`;
          templateContext += `- Use the SPECIFIC design creation processes documented in templates\n`;
          templateContext += `- Apply the EXACT drawing generation workflows from templates\n`;
          templateContext += `- Use the PROVEN calculation methods and technical specifications\n`;
          templateContext += `- Follow the DETAILED decision points and quality checkpoints\n`;
          templateContext += `- Include ALL design and drawing context as shown in template examples\n`;
          templateContext += `- Maintain the SAME level of detail and technical accuracy\n`;
          templateContext += `- Apply the COMPLETE workflow from initial discussion to final deliverables\n`;
          templateContext += `- Use the template as a COMPREHENSIVE GUIDE for identical project execution\n`;

          enhancedReferenceText += templateContext;
        }

        // Add instruction to reference designs if available
        let conversationPrompt = newHistory;
        if (designs.length > 0) {
          const lastMessage = conversationPrompt[conversationPrompt.length - 1];
          lastMessage.text += `\n\n**IMPORTANT:** Reference the available component designs and their quantities when relevant to this discussion. Include specific quantities and specifications from the designs when discussing costs, materials, or construction details.`;
        }

        const modelResponse = await continueConversation(conversationPrompt, enhancedReferenceText, outputMode);
        setConversationHistory(prev => [...prev, { role: 'model', text: modelResponse }]);

        // Extract and save LLM summary
        const llmSummary = ContextService.extractLLMSummary(modelResponse);
        ContextService.addStepSummary('discussion', newMessage.text, llmSummary);

        // Add discussion to context
        ContextService.addDiscussionToContext(newMessage.text, true);

        // Save to thread
        if (currentThread) {
          ThreadService.addMessageToThread(currentThread.id, newMessage);
          ThreadService.addMessageToThread(currentThread.id, { role: 'model', text: modelResponse });
        } else {
          const thread = ThreadService.createThread(outputMode, newMessage);
          ThreadService.addMessageToThread(thread.id, { role: 'model', text: modelResponse });
          setCurrentThread(thread);
        }

        if (isTtsEnabled) {
          speak(modelResponse, speechRate, selectedVoiceURI);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred while communicating with the AI.');
      } finally {
        setIsAiThinking(false);
        setLoadingMessage('');
      }
    }

    setCurrentMessage('');
  };

  const handleDesignRequest = async (userInput: string) => {
    setLoadingMessage('🎨 Initializing design generation...');
    setIsAiThinking(true);
    setError(null);

    try {
      // Extract component name from user input with better regex
      let componentName = 'Component';

      // Try multiple patterns to extract component name
      const patterns = [
        /design\s+(?:a\s+|an\s+)?(.+?)(?:\s+for|\s+with|\s*$)/i,
        /(?:create|make|build)\s+(?:a\s+|an\s+)?(.+?)(?:\s+for|\s+with|\s*$)/i,
        /(.+?)(?:\s+design|\s+component|\s*$)/i
      ];

      for (const pattern of patterns) {
        const match = userInput.match(pattern);
        if (match && match[1] && match[1].trim().length > 2) {
          componentName = match[1].trim();
          // Clean up common words
          componentName = componentName.replace(/^(the|a|an)\s+/i, '');
          break;
        }
      }

      // If still generic, use a timestamp-based name
      if (componentName === 'Component' || componentName.length < 3) {
        componentName = `Component_${new Date().toLocaleDateString().replace(/\//g, '_')}`;
      }

      console.log(`Design Request: Component="${componentName}", Input="${userInput}"`);

      setLoadingMessage('📋 Gathering project context and guidelines...');

      const activeGuidelines = GuidelinesService.getActiveGuidelines();
      const designGuidelines = GuidelinesService.getActiveGuidelines('design');
      const allGuidelines = [...activeGuidelines, ...designGuidelines];
      const guidelinesText = GuidelinesService.formatGuidelinesForPrompt(allGuidelines);

      const scopeContext = finalizedScope || ThreadService.getAllContextForMode('discussion');

      setLoadingMessage('🔍 Enhancing request with knowledge base...');

      // Enhance user input with knowledge base if enabled
      let enhancedUserInput = userInput;
      if (includeKnowledgeBase) {
        const { enhancedPrompt } = RAGService.enhancePromptWithKnowledgeBase(
          userInput,
          includeKnowledgeBase
        );
        enhancedUserInput = enhancedPrompt;
      }

      // Add template context for design generation
      let designReferenceText = referenceText;
      if (selectedTemplates.length > 0) {
        let templateContext = `\n\n**MASTER TEMPLATES FOR DESIGN GUIDANCE:**\n`;
        selectedTemplates.forEach((template, index) => {
          templateContext += `\n**Template ${index + 1}: ${template.name}**\n`;
          templateContext += `Project Type: ${template.projectType}\n`;
          templateContext += `\n**COMPLETE DESIGN PROCEDURE:**\n${template.stepByStepProcedure}\n`;
        });

        if (templateInstructions.trim()) {
          templateContext += `\n**CUSTOM TEMPLATE INSTRUCTIONS:**\n${templateInstructions}\n`;
        }

        templateContext += `\n**DESIGN TEMPLATE USAGE INSTRUCTIONS:**\n`;
        templateContext += `- Follow the EXACT design creation procedures from the selected templates\n`;
        templateContext += `- Use the SPECIFIC material specifications and calculation methods shown in templates\n`;
        templateContext += `- Apply the DETAILED technical standards and quality requirements from templates\n`;
        templateContext += `- Include ALL design elements and specifications as demonstrated in template examples\n`;
        templateContext += `- Follow the PROVEN design workflow and decision points from templates\n`;
        templateContext += `- Maintain the SAME level of technical detail and professional standards\n`;
        templateContext += `- Create designs that match the template's approach and quality level\n`;

        designReferenceText += templateContext;

	      // Include summaries of selected drawings as context for DESIGN prompts
	      const drawingsContextForDesign = savedDrawings
	        .filter(d => d.includeInContext !== false)
	        .map(d => `• ${d.title}: ${d.description}`)
	        .join('\n');
	      if (drawingsContextForDesign) {
	        designReferenceText += `\n\n**AVAILABLE TECHNICAL DRAWINGS:**\n${drawingsContextForDesign}`;
	      }

      }

      setLoadingMessage('🤖 Generating professional component design...');

      await DesignService.generateComponentDesign(
        componentName,
        scopeContext,
        enhancedUserInput,
        guidelinesText,
        designReferenceText
      );

      setLoadingMessage('💾 Saving design and updating display...');
      loadDesigns();

      // Add to conversation history for reference
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: userInput },
        { role: 'model', text: `✅ **Design Generated Successfully!**\n\n🏗️ **Component:** ${componentName}\n\n📋 **Status:** Professional component design has been generated with specifications, materials, and calculations.\n\n📁 **View:** Check the Component Designs section below to view the complete design documentation.\n\n💡 **Next Steps:** You can now generate technical drawings for this component or proceed with cost estimation.` }
      ]);

      console.log('Design generation completed successfully');

    } catch (err: any) {
      console.error('Design generation error:', err);

      let errorMessage = 'An error occurred while generating the design.';

      // Provide specific error messages based on error type
      if (err.message?.includes('API key')) {
        errorMessage = '🔑 API Key Error: Please check your API key configuration in LLM Settings.';
      } else if (err.message?.includes('quota') || err.message?.includes('limit')) {
        errorMessage = '📊 API Quota Exceeded: Please check your usage limits or try switching to Kimi K2 in LLM Settings.';
      } else if (err.message?.includes('rate limit')) {
        errorMessage = '⏱️ Rate Limit: Please wait a moment and try again, or switch to Kimi K2 in LLM Settings.';
      } else if (err.message?.includes('blocked') || err.message?.includes('safety')) {
        errorMessage = '🛡️ Content Filtered: Your request was blocked by safety filters. Please try rephrasing your design request.';
      } else if (err.message?.includes('Empty response')) {
        errorMessage = '📭 Empty Response: The AI returned an empty response. Please try again with more specific design requirements.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      // Add error to conversation for user visibility
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: userInput },
        { role: 'model', text: `❌ **Design Generation Failed**\n\n${errorMessage}\n\n🔧 **Troubleshooting:**\n1. Check your API key in LLM Settings\n2. Try switching to Kimi K2 provider\n3. Ensure your design request is specific and clear\n4. Check your internet connection\n\n💡 **Tip:** Try a simpler request like "Design a concrete foundation" first.` }
      ]);
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
    }
  };

  const handleDrawingRequest = async (userInput?: string, previousPythonCode?: string) => {
    const inputText = userInput || currentMessage;
    if (!inputText.trim()) {
      setError('Please provide drawing requirements');
      return;
    }

    setIsDrawingGenerating(true);
    setIsAiThinking(true);
    setError(null);

    try {
      // Add user message to conversation
      const newMessage: ChatMessage = { role: 'user', text: inputText };
      setConversationHistory(prev => [...prev, newMessage]);
      setCurrentMessage('');

      // Extract title from input
      const title = inputText.match(/(?:draw|create|generate)\s+(?:a\s+)?(.+?)(?:\s+for|\s+with|\.|$)/i)?.[1]?.trim() ||
                   `Technical Drawing ${new Date().toLocaleDateString()}`;

      // Gather context
      const projectContext = finalizedScope || ThreadService.getAllContextForMode('discussion');
      const designContext = designs.filter(d => d.includeInContext !== false)
        .map(d => `**${d.componentName}:**\n${d.designContent}`)
        .join('\n\n');

      // Include summaries of selected drawings as context
      const drawingsContextSummary = savedDrawings
        .filter(d => d.includeInContext !== false)
        .map(d => `• ${d.title}: ${d.description}`)
        .join('\n');

      const drawingGuidelines = GuidelinesService.getActiveGuidelines();
      const drawingGuidelinesText = GuidelinesService.formatGuidelinesForPrompt(drawingGuidelines);

      // Add template context if templates are selected
      let templateContext = '';
      if (selectedTemplates.length > 0) {
        templateContext = `\n\n**MASTER TEMPLATES FOR DRAWING GUIDANCE:**\n`;
        selectedTemplates.forEach((template, index) => {
          templateContext += `\n**Template ${index + 1}: ${template.name}**\n`;
          templateContext += `Project Type: ${template.projectType}\n`;
          templateContext += `\n**COMPLETE DRAWING PROCEDURE:**\n${template.stepByStepProcedure}\n`;
        });

        if (templateInstructions.trim()) {
          templateContext += `\n**CUSTOM TEMPLATE INSTRUCTIONS:**\n${templateInstructions}\n`;
        }
      }

      // Use the new ezdxf drawing service
      const drawingRequest = {
        title,
        description: inputText.substring(0, 200) + (inputText.length > 200 ? '...' : ''),
        userRequirements: inputText,
        projectContext,
        designContext: [designContext, drawingsContextSummary].filter(Boolean).join('\n\n**DRAWINGS CONTEXT:**\n'),
        guidelines: drawingGuidelinesText,
        referenceText: referenceText + templateContext,
        previousPythonCode: previousPythonCode || undefined,
      };

      // Generate the drawing using the new service
      const pythonCode = await EzdxfDrawingService.generateDrawingCode(drawingRequest);
      const result = await EzdxfDrawingService.executeDrawingCode(pythonCode, title);

      // Save the drawing to persistence (similar to design system)
      try {
        const projectId = ProjectService.getCurrentProjectId() || 'default';

        const savedDrawing = DrawingService.saveDrawing({
          projectId,
          title,
          description: drawingRequest.description,
          specification: drawingRequest, // Store the drawing request as specification
          generatedCode: pythonCode,
          result,
          settings: {} // Could add drawing settings here if needed
        });

        console.log('Drawing saved to persistence:', savedDrawing.id);

        // Refresh the saved drawings list
        loadSavedDrawings();
      } catch (error) {
        console.error('Error saving drawing to persistence:', error);
        // Continue without crashing - drawing still works, just not saved
      }

      // Handle the result
      handleDrawingGenerated(result);

    } catch (err: any) {
      console.error('Drawing generation error:', err);
      handleDrawingError(err instanceof Error ? err.message : 'Failed to generate drawing');
    } finally {
      setIsDrawingGenerating(false);
      setIsAiThinking(false);
    }
  };

  const handleOutputModeChange = (mode: OutputMode) => {
    setOutputMode(mode);
    setCurrentThread(null);

    // Load existing thread for this mode if available
    const existingThreads = ThreadService.getThreadsByMode(mode);
    if (existingThreads.length > 0) {
      setCurrentThread(existingThreads[0]);
    }
  };

  // Extract subcomponent items from project scope
  const extractSubcomponentItems = async (scope: string): Promise<string[]> => {
    try {
      const prompt = `Analyze the following construction project scope and extract individual construction items/activities that need cost estimation.

**PROJECT SCOPE:**
${scope}

**TASK:**
Extract INDIVIDUAL construction items/activities from the scope. Each item should be a specific work activity that can be estimated separately.

**EXAMPLES:**
- "Excavation for foundation up to 1.5m depth"
- "Brickwork in cement mortar 1:6 for walls"
- "Plastering with cement mortar 1:4 on internal walls"
- "Providing and laying RCC pipe 600mm diameter"
- "Concrete work M25 grade for foundation"

**RULES:**
1. Each item should be ONE specific construction activity
2. Include material specifications where mentioned (mortar ratios, grades, sizes)
3. Include work type and location if specified
4. Separate different activities even if they're related
5. Focus on measurable construction work items

**OUTPUT FORMAT:**
Return ONLY a numbered list of items, one per line:
1. [Item description]
2. [Item description]
...

Extract the construction items:`;

      const response = await LLMService.generateContent(prompt);

      // Parse the response to extract items
      const lines = response.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => /^\d+\./.test(line)) // Lines starting with numbers
        .map(line => line.replace(/^\d+\.\s*/, '')) // Remove numbering
        .filter(line => line.length > 10); // Filter out very short items

      return lines.length > 0 ? lines : ['General construction work']; // Fallback
    } catch (error) {
      console.error('Error extracting subcomponent items:', error);
      return ['General construction work']; // Fallback
    }
  };

  const handleFinalizeScope = async () => {
    if (conversationHistory.length <= 1) {
      setError('Please have a conversation about your project first.');
      return;
    }

    setStep('generatingKeywords');
    setIsAiThinking(true);
    setLoadingMessage('Finalizing scope and generating keywords...');
    setError(null);

    try {
      const scope = conversationHistory.slice(1).map(msg => msg.text).join('\n\n');
      setFinalizedScope(scope);

      // Add finalized scope to context
      ContextService.addStepSummary('scope', 'Project scope finalized', scope.substring(0, 200));

      // Extract subcomponent items from the scope for the new keyword system
      const extractedItems = await extractSubcomponentItems(scope);
      setSubcomponentItems(extractedItems);

      // Legacy keyword generation for backward compatibility
      const generatedKeywords = await generateKeywordsForItems(scope, '', referenceText);
      const keywordsList = Object.keys(generatedKeywords);
      setKeywords(keywordsList);
      setKeywordsByItem(generatedKeywords);

      setStep('approvingKeywords');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating keywords.');
      setStep('scoping');
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
    }
  };

  const handleKeywordApproval = async () => {
    if (keywords.length === 0) {
      setError('No keywords to approve.');
      return;
    }

    setStep('approvingHsrItems');
    setIsAiThinking(true);
    setLoadingMessage('Searching HSR database...');
    setError(null);

    try {
      // Create keywordsByItem structure from keywords
      const keywordsByItemTemp: KeywordsByItem = {};
      keywords.forEach(keyword => {
        keywordsByItemTemp[keyword] = [keyword];
      });

      // Search HSR using the keywordsByItem structure
      const foundItems = searchHSR(keywordsByItemTemp);

      setHsrItems(foundItems);
      setKeywordsByItem(keywordsByItemTemp);

      // Add HSR items to context
      ContextService.addStepSummary('hsr_search', 'HSR items found', `Found ${foundItems.length} HSR items`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while searching HSR items.');
      setStep('approvingKeywords');
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
    }
  };

  const handleHsrItemApproval = async () => {
    if (hsrItems.length === 0) {
      setError('No HSR items to approve.');
      return;
    }

    setStep('generatingEstimate');
    setIsAiThinking(true);
    setLoadingMessage('Generating cost estimate...');
    setError(null);

    try {
      const estimate = await generatePlainTextEstimate(
        finalizedScope,
        hsrItems,
        conversationHistory,
        '',
        '',
        referenceText
      );
      setFinalEstimateText(estimate);
      setStep('reviewingEstimate');

      // Add estimate to context
      ContextService.addStepSummary('estimate', 'Cost estimate generated', estimate.substring(0, 200));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the estimate.');
      setStep('approvingHsrItems');
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
    }
  };

  // Handle abstract remake with or without HSR
  const handleAbstractRemake = async () => {
    if (!editInstruction.trim()) {
      setError('Please provide remake instructions.');
      return;
    }

    setIsAiThinking(true);
    setError(null);

    try {
      if (useHsrForRemake) {
        // Remake with HSR: Two-response approach (like original keyword generation)

        // STEP 1: Generate keywords for remake
        setLoadingMessage('Generating keywords for remake requirements...');

        const keywordPrompt = `Based on the remake instructions and previous cost abstract, generate keywords for HSR search.

**REMAKE INSTRUCTIONS:**
${editInstruction}

**PREVIOUS COST ABSTRACT:**
${finalEstimateText}

**PROJECT CONTEXT:**
${finalizedScope}

**REFERENCE MATERIALS:**
${referenceText}

**TASK:**
Generate 8-12 single-word keywords that will help find HSR items specifically for the remake requirements.
Focus on:
1. New work items mentioned in remake instructions
2. Materials or specifications that need different rates
3. Construction methods that require updated pricing
4. Technical requirements from the instructions

**RULES:**
- Single words only (no spaces)
- Construction industry terms
- Include technical specifications (grades, ratios, sizes)
- Focus on remake-specific requirements

**OUTPUT:**
Return only keywords separated by commas, nothing else.`;

        const keywordResponse = await LLMService.generateContent(keywordPrompt);
        const remakeKeywords = keywordResponse.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

        setLoadingMessage(`Generated ${remakeKeywords.length} keywords, searching HSR database...`);

        // STEP 2: Fetch HSR items using keywords (same as original process)
        const keywordsByItem: KeywordsByItem = {};
        remakeKeywords.forEach(keyword => {
          keywordsByItem[keyword] = [keyword];
        });

        const newHsrItems = searchHSR(keywordsByItem);

        setLoadingMessage(`Found ${newHsrItems.length} HSR items, remaking cost abstract...`);

        // STEP 3: Generate new estimate with HSR data
        const remakePrompt = `Remake the cost abstract based on user instructions with new HSR data.

**REMAKE INSTRUCTIONS:**
${editInstruction}

**ORIGINAL COST ABSTRACT:**
${finalEstimateText}

**NEW HSR ITEMS FOUND:**
${newHsrItems.map(item => `${item['HSR No.']}: ${item.Description} - ${item.Unit} - ₹${item['Current Rate']}`).join('\n')}

**PROJECT CONTEXT:**
${finalizedScope}

**REFERENCE MATERIALS:**
${referenceText}

**TASK:**
Create a new cost abstract that addresses the remake instructions while incorporating the relevant new HSR data.

**IMPORTANT GUIDELINES:**
- Keep correct HSR items and calculations from original abstract
- Only modify sections related to remake instructions
- Use new HSR items where they improve accuracy
- Maintain professional cost abstract format
- Include both original and new HSR items as appropriate`;

        const newEstimate = await generatePlainTextEstimate(remakePrompt, newHsrItems, conversationHistory, finalEstimateText, editInstruction, referenceText);
        setFinalEstimateText(newEstimate);
        setHsrItems([...hsrItems, ...newHsrItems]); // Combine original and new HSR items

      } else {
        // Remake without HSR: Use existing context only
        setLoadingMessage('Remaking cost abstract without HSR...');

        const remakePrompt = `Remake the cost abstract based on the user's instructions using existing context.

**REMAKE INSTRUCTIONS:**
${editInstruction}

**ORIGINAL ESTIMATE:**
${finalEstimateText}

**PROJECT CONTEXT:**
${referenceText}

**TASK:**
Create a new cost abstract that addresses the remake instructions using the existing project context and knowledge.`;

        const newEstimate = await generatePlainTextEstimate(remakePrompt, hsrItems, conversationHistory, finalEstimateText, editInstruction, referenceText);
        setFinalEstimateText(newEstimate);
      }

      // Clear instructions and reset checkbox
      setEditInstruction('');
      setUseHsrForRemake(false);

      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: `Remake request: ${editInstruction}` },
        { role: 'model', text: `✅ **Cost Abstract Remade!**\n\n🔄 **Method:** ${useHsrForRemake ? 'With new HSR data (Keywords → HSR Search → Remake)' : 'Without HSR data'}\n\n📝 **Instructions Applied:** ${editInstruction}\n\n${useHsrForRemake ? `🔑 **Keywords Generated:** ${editInstruction.split(' ').slice(0, 3).join(', ')}...\n📊 **HSR Items:** Found and integrated relevant items\n` : ''}💰 **Result:** Updated cost abstract generated successfully.` }
      ]);

    } catch (err: any) {
      console.error('Abstract remake error:', err);
      setError(err.message || 'An error occurred while remaking the abstract.');
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
    }
  };

  const handleEstimateEdit = async () => {
    if (!editInstruction.trim()) {
      setError('Please provide edit instructions.');
      return;
    }

    setIsAiThinking(true);
    setLoadingMessage('Editing estimate...');
    setError(null);

    try {
      const editedEstimate = await generatePlainTextEstimate(
        finalizedScope + '\n\nEdit Instructions: ' + editInstruction,
        hsrItems,
        conversationHistory,
        finalEstimateText,
        editInstruction,
        referenceText
      );
      setFinalEstimateText(editedEstimate);
      setEditInstruction('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while editing the estimate.');
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
    }
  };

  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);



          <div className="flex items-center justify-end gap-3 mb-4">
            <button
              onClick={() => setIsLLMSettingsOpen(true)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              LLM Settings
            </button>
            <button
              onClick={() => setIsDiagnosticsOpen(true)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Diagnostics
            </button>
          </div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏗️ HSR Construction Estimator
          </h1>
          <p className="text-lg text-gray-600">
            AI-Powered Construction Cost Estimation with Professional Design & Drawing Generation
          </p>
        </div>

        {/* API Key Input */}
        {!apiKey && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">
              🔑 API Key Required
            </h3>
            <p className="text-yellow-700 mb-4">
              Please enter your Gemini API key to use the AI features.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="flex-1 px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button
                onClick={handleApiKeySave}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Control Panel */}
        <CollapsibleControlPanel
          onOpenGuidelines={() => setIsGuidelinesOpen(true)}
          onOpenLLMSettings={() => setIsLLMSettingsOpen(true)}
          onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
          onOpenContextManager={() => setIsContextManagerOpen(true)}
          onOpenTemplateManager={() => setIsTemplateManagerOpen(true)}
          onOpenTemplateSelector={() => setIsTemplateSelectorOpen(true)}
          onOpenProjectManager={() => setIsProjectManagerOpen(true)}
          guidelinesCount={guidelines.filter(g => g.isActive).length}
          currentProvider={currentProvider}
          outputMode={outputMode}
          uploadedFiles={referenceDocs}
          onNewProject={resetState}
          onToggleProjectData={() => setShowProjectData(!showProjectData)}
          onTestLLM={async () => {
            try {
              setLoadingMessage('Testing LLM service...');
              setIsAiThinking(true);
              const result = await LLMService.generateContent('Test prompt: Say hello');
              console.log('Test result:', result);
              alert(`LLM Test Success: ${result.substring(0, 100)}...`);
            } catch (error) {
              console.error('Test error:', error);
              alert(`LLM Test Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
              setIsAiThinking(false);
              setLoadingMessage('');
            }
          }}
          conversationHistory={conversationHistory}
          finalizedScope={finalizedScope}
          keywords={keywords}
          hsrItems={hsrItems}
          finalEstimate={finalEstimateText}
          designs={designs}
          drawings={drawings}
          referenceText={referenceText}
        />

        {/* Output Mode Selector and Knowledge Base Toggle */}
        <div className="mb-6 flex items-center justify-between">
          <OutputModeSelector
            currentMode={outputMode}
            onModeChange={handleOutputModeChange}
          />

          {/* Knowledge Base Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeKnowledgeBase}
                onChange={(e) => setIncludeKnowledgeBase(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-700">Include Knowledge Base</span>
            </label>
            <button
              onClick={() => setIsKnowledgeBaseOpen(true)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              📚 Manage
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Main Chat Interface - Full Width */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {outputMode === 'discussion' && '💬 Project Discussion'}
              {outputMode === 'design' && '🎨 Component Design'}
              {outputMode === 'drawing' && '📐 Technical Drawing'}
            </h2>
          </div>

          <div
            ref={chatContainerRef}
            className="h-96 overflow-y-auto p-4 space-y-4"
          >
            {conversationHistory.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.text}</div>
                </div>
              </div>
            ))}

            {isAiThinking && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 p-3 rounded-lg flex items-center">
                  <div className="mr-2">
                    <Spinner />
                  </div>
                  {loadingMessage || 'Thinking...'}
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder={
                  outputMode === 'discussion' ? "Describe your project or ask questions..." :
                  outputMode === 'design' ? "Request component design (e.g., 'Design a foundation for 2-story building')" :
                  "Request technical drawing (e.g., 'Draw foundation plan with dimensions')"
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isAiThinking}
              />
              <VoiceInput
                appendToTranscript={setCurrentMessage}
                disabled={isAiThinking}
              />

              {/* Compact File Upload */}
              <CompactFileUpload
                onFileUpload={handleFileUpload}
                uploadedFiles={referenceDocs}
                isFileProcessing={isFileProcessing}
              />

              <button
                type="submit"
                disabled={isAiThinking || !currentMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                Send
              </button>
            </div>
          </form>

          {/* Drawing Context Selector - choose which drawings to include in prompts */}
          <div className="p-4 border-t border-gray-200">
            <DrawingContextSelector drawings={savedDrawings} onChange={loadSavedDrawings} />
          </div>
        </div>

        {/* Results and Displays Area */}
        <div className="space-y-6">

          {/* Design Display */}
          {outputMode === 'design' && (
            <DesignDisplay
              designs={designs}
              onDesignUpdate={loadDesigns}
              onContextUpdate={handleContextUpdate}
              onEditDesign={handleEditDesign}
              onGenerateHTML={handleGenerateHTML}
            />
          )}

          {/* Technical Drawing Results */}
          {outputMode === 'drawing' && (
            <div className="space-y-6">
              {/* Display Generated Drawings */}
              {drawingResults.map((result, index) => (
                <DrawingResultsDisplay
                  key={index}
                  result={result}
                  onRegenerateRequest={handleDrawingRegenerate}
                />
              ))}
            </div>
          )}

          {/* Discussion Mode Results */}
          {outputMode === 'discussion' && (
            <>
              {/* Step Navigation */}
              <StepNavigation
                currentStep={step}
                onStepChange={(newStep) => setStep(newStep)}
                hasScope={!!finalizedScope}
                hasKeywords={keywords.length > 0}
                hasHsrItems={hsrItems.length > 0}
                hasEstimate={!!finalEstimateText}
              />

              {step === 'scoping' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    📋 Project Scoping
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Discuss your project requirements with the AI. Once you're satisfied with the scope, click "Finalize Scope" to proceed to cost estimation.
                  </p>
                  <button
                    onClick={handleFinalizeScope}
                    disabled={isAiThinking || conversationHistory.length <= 1}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    ✅ Finalize Scope & Generate Keywords
                  </button>
                </div>
              )}

                {step === 'approvingKeywords' && (
                  <KeywordManager
                    subcomponentItems={subcomponentItems}
                    onKeywordsGenerated={(result) => {
                      setKeywordGenerationResult(result);
                      // Convert to legacy format for compatibility
                      const legacyKeywords = result.keywordSets.flatMap(set => set.keywords);
                      const legacyKeywordsByItem: KeywordsByItem = {};
                      result.keywordSets.forEach(set => {
                        legacyKeywordsByItem[set.itemDescription] = set.keywords;
                      });
                      setKeywords(legacyKeywords);
                      setKeywordsByItem(legacyKeywordsByItem);
                    }}
                    onHSRResults={(results) => {
                      setHsrItems(results);
                      setStep('approvingHsrItems');
                    }}
                    existingKeywords={keywordGenerationResult || undefined}
                  />
                )}

                {(step === 'approvingHsrItems' || step === 'approvingRefinedHsrItems') && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      📋 Found HSR Items
                    </h3>
                    <HsrItemsDisplay items={hsrItems} />
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleHsrItemApproval}
                        disabled={isAiThinking}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                      >
                        ✅ Generate Cost Estimate
                      </button>
                    </div>
                  </div>
                )}

                {(step === 'reviewingEstimate' || step === 'done') && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      💰 Cost Estimate
                    </h3>
                    <ResultDisplay textContent={finalEstimateText} />


                    {step === 'reviewingEstimate' && (
                      <div className="mt-4 space-y-4">
                        {/* Remake Instructions */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">🔄 Remake Cost Abstract</h4>
                          <textarea
                            value={editInstruction}
                            onChange={(e) => setEditInstruction(e.target.value)}
                            placeholder="Enter instructions for remaking the cost abstract (e.g., 'Focus more on labor costs', 'Add detailed material breakdown', 'Include equipment costs')"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                          />

                          {/* HSR Option Checkbox */}
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="useHsrForRemake"
                              checked={useHsrForRemake}
                              onChange={(e) => setUseHsrForRemake(e.target.checked)}
                              className="rounded"
                            />
                            <label htmlFor="useHsrForRemake" className="text-sm text-gray-700">
                              <strong>Include HSR Data:</strong> Generate new keywords and fetch fresh HSR items for remake
                            </label>
                          </div>

                          <div className="text-xs text-gray-600 mt-2">
                            {useHsrForRemake
                              ? "✅ Will generate new keywords → fetch HSR items → remake abstract with HSR data"
                              : "📝 Will remake abstract using existing context and user instructions only"
                            }
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={handleAbstractRemake}
                            disabled={isAiThinking || !editInstruction.trim()}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
                          >
                            {useHsrForRemake ? '🔄 Remake with HSR' : '🔄 Remake without HSR'}
                          </button>
                          <button
                            onClick={handleEstimateEdit}
                            disabled={isAiThinking || !editInstruction.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                          >
                            ✏️ Quick Edit
                          </button>
                          <button
                            onClick={() => setShowNSRateAnalysis(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            📊 NS Rate Analysis
                          </button>
                          <button
                            onClick={() => setStep('done')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            ✅ Complete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Context Manager */}
                <ContextManager
                  key={contextKey}
                  onContextUpdate={handleContextUpdate}
                />
              </>
            )}

        </div>

        {/* Project Data Display */}
        {showProjectData && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">📊 Project Data</h3>
              <button
                onClick={() => setShowProjectData(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Discussions</h4>
                <p className="text-2xl font-bold text-blue-600">{conversationHistory.length - 1}</p>
                <p className="text-sm text-gray-500">Messages exchanged</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Designs</h4>
                <p className="text-2xl font-bold text-green-600">{designs.length}</p>
                <p className="text-sm text-gray-500">Components designed</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Drawings</h4>
                <p className="text-2xl font-bold text-purple-600">{savedDrawings.length}</p>
                <p className="text-sm text-gray-500">Technical drawings</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Guidelines</h4>
                <p className="text-2xl font-bold text-orange-600">{guidelines.filter(g => g.isActive).length}</p>
                <p className="text-sm text-gray-500">Active guidelines</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">HSR Items</h4>
                <p className="text-2xl font-bold text-red-600">{hsrItems.length}</p>
                <p className="text-sm text-gray-500">Cost items found</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Current Provider</h4>
                <p className="text-lg font-semibold text-gray-800">{currentProvider}</p>
                <p className="text-sm text-gray-500">{currentModel}</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Components */}
        {isGuidelinesOpen && (
          <GuidelinesManager
            isOpen={isGuidelinesOpen}
            onClose={() => setIsGuidelinesOpen(false)}
            onGuidelinesUpdate={loadGuidelines}
          />
        )}

        {isLLMSettingsOpen && (
          <LLMProviderSelector
            isOpen={isLLMSettingsOpen}
            onClose={() => setIsLLMSettingsOpen(false)}
          />
        )}

        {isKnowledgeBaseOpen && (
          <KnowledgeBaseManager
            isOpen={isKnowledgeBaseOpen}
            onClose={() => setIsKnowledgeBaseOpen(false)}
            onKnowledgeBaseUpdate={handleKnowledgeBaseUpdate}
          />
        )}

        {isContextManagerOpen && (
          <DiscussionContextManager
            conversationHistory={conversationHistory}
            onContextPurified={handleContextPurified}
            isVisible={isContextManagerOpen}
            onClose={() => setIsContextManagerOpen(false)}
          />
        )}

        {isTemplateSelectorOpen && (
          <TemplateSelector
            isOpen={isTemplateSelectorOpen}
            onClose={() => setIsTemplateSelectorOpen(false)}
            onTemplateSelected={handleTemplateSelected}
          />
        )}

        {isTemplateManagerOpen && (
          <TemplateManager
            isOpen={isTemplateManagerOpen}
            onClose={() => setIsTemplateManagerOpen(false)}
            conversationHistory={conversationHistory}
            finalizedScope={finalizedScope}
            keywords={keywords}
            hsrItems={hsrItems}
            finalEstimate={finalEstimateText}
            designs={designs}
            drawings={drawings}
            referenceText={referenceText}
          />
        )}

        {isProjectManagerOpen && (
          <ProjectManager
            isOpen={isProjectManagerOpen}
            onClose={() => setIsProjectManagerOpen(false)}
            onProjectSelected={handleProjectSelected}
            onNewProject={handleNewProject}
            currentProjectId={currentProject?.id}
          />
        )}

        {isDiagnosticsOpen && (
          <SystemStatus isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />
        )}
      </div>

      {/* NS Rate Analysis Modal */}
      {showNSRateAnalysis && (
        <NSRateAnalysis
          projectContext={finalizedScope || ''}
          hsrItems={hsrItems}
          onClose={() => setShowNSRateAnalysis(false)}
        />
      )}
    </div>
  );
};

export default App;
