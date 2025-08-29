import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HsrItem, ChatMessage, KeywordsByItem, OutputMode, UserGuideline, ComponentDesign, ConversationThread, TechnicalDrawing } from './types';
import { continueConversation, generatePlainTextEstimate, generateKeywordsForItems } from './services/geminiService';
import { searchHSR } from './services/hsrService';
import { speak } from './services/speechService';
import { GuidelinesService } from './services/guidelinesService';
import { ThreadService } from './services/threadService';
import { DesignService } from './services/designService';
import { ContextService } from './services/contextService';
import { DXFService, DXFStorageService } from './services/dxfService';
import { Spinner } from './components/Spinner';
import { ResultDisplay } from './components/ResultDisplay';
import { KeywordsDisplay } from './components/KeywordsDisplay';
import { HsrItemsDisplay } from './components/HsrItemsDisplay';
import { VoiceInput } from './components/VoiceInput';
import { FileUpload } from './components/FileUpload';
import { GuidelinesManager } from './components/GuidelinesManager';
import { OutputModeSelector } from './components/OutputModeSelector';
import { DesignDisplay } from './components/DesignDisplay';
import { DrawingDisplay } from './components/DrawingDisplay';
import { ContextManager } from './components/ContextManager';
import { LLMProviderSelector } from './components/LLMProviderSelector';
import { KnowledgeBaseManager } from './components/KnowledgeBaseManager';
import { KnowledgeBaseDisplay } from './components/KnowledgeBaseDisplay';
import { LLMService } from './services/llmService';
import { RAGService } from './services/ragService';

type Step = 'scoping' | 'generatingKeywords' | 'approvingKeywords' | 'approvingHsrItems' | 'approvingRefinedHsrItems' | 'generatingEstimate' | 'reviewingEstimate' | 'done';
type ReferenceDoc = { file: File; text: string };

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('scoping');
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your AI assistant for construction estimation. Please describe the project you want to build, and we can define its scope together.' }
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [finalizedScope, setFinalizedScope] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsByItem, setKeywordsByItem] = useState<KeywordsByItem>({});
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

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const referenceText = useMemo(() => 
    referenceDocs.map(doc => `--- START OF ${doc.file.name} ---\n${doc.text}\n--- END OF ${doc.file.name} ---`).join('\n\n'), 
  [referenceDocs]);

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

    // Load guidelines and project data
    loadGuidelines();
    loadDesigns();
    loadDrawings();

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
    setDesigns(loadedDesigns);
  };

  const loadDrawings = () => {
    const loadedDrawings = DXFStorageService.loadDrawings();
    setDrawings(loadedDrawings);
  };

  const handleContextUpdate = () => {
    setContextKey(prev => prev + 1); // Force re-render of context components
  };

  const handleKnowledgeBaseUpdate = () => {
    // Force re-render when knowledge base is updated
    setContextKey(prev => prev + 1);
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
    setStep('scoping');
    setConversationHistory([{ role: 'model', text: 'Hello! Please describe the project you want to build.' }]);
    setCurrentMessage('');
    setFinalizedScope('');
    setKeywords([]);
    setKeywordsByItem({});
    setHsrItems([]);
    setFinalEstimateText('');
    setEditInstruction('');
    setError(null);
    setIsAiThinking(false);
    setLoadingMessage('');
    setReferenceDocs([]);
    setIsFileProcessing(false);
    setOutputMode('discussion');
    setCurrentThread(null);
    setShowProjectData(false);
    // Clear all threads for new project
    ThreadService.clearAllThreads();
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
        let enhancedReferenceText = referenceText + contextPrompt;

        // Add knowledge base context if enabled
        if (includeKnowledgeBase) {
          const { enhancedPrompt } = RAGService.enhancePromptWithKnowledgeBase(
            currentMessage,
            includeKnowledgeBase
          );
          // Use the enhanced prompt for the conversation
          newHistory[newHistory.length - 1].text = enhancedPrompt;
        }

        const modelResponse = await continueConversation(newHistory, enhancedReferenceText, outputMode);
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
    setLoadingMessage('Generating component design...');
    setIsAiThinking(true);
    setError(null);

    try {
      // Extract component name from user input or use a default
      const componentMatch = userInput.match(/design\s+(?:for\s+)?(.+?)(?:\s|$)/i);
      const componentName = componentMatch ? componentMatch[1].trim() : 'Component';

      const activeGuidelines = GuidelinesService.getActiveGuidelines();
      const designGuidelines = GuidelinesService.getActiveGuidelines('design');
      const allGuidelines = [...activeGuidelines, ...designGuidelines];
      const guidelinesText = GuidelinesService.formatGuidelinesForPrompt(allGuidelines);

      const scopeContext = finalizedScope || ThreadService.getAllContextForMode('discussion');

      // Enhance user input with knowledge base if enabled
      let enhancedUserInput = userInput;
      if (includeKnowledgeBase) {
        const { enhancedPrompt } = RAGService.enhancePromptWithKnowledgeBase(
          userInput,
          includeKnowledgeBase
        );
        enhancedUserInput = enhancedPrompt;
      }

      await DesignService.generateComponentDesign(
        componentName,
        scopeContext,
        enhancedUserInput,
        guidelinesText,
        referenceText
      );

      loadDesigns();
      setLoadingMessage('');

      // Add to conversation history for reference
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: userInput },
        { role: 'model', text: `Design generated for ${componentName}. You can view the detailed design in the Design Display section below.` }
      ]);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the design.');
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
    }
  };

  const handleDrawingRequest = async (userInput: string) => {
    setLoadingMessage('🔍 Analyzing your drawing requirements...');
    setIsAiThinking(true);
    setError(null);

    try {
      // Enhanced input validation
      if (!userInput.trim()) {
        throw new Error('Please provide specific drawing requirements.');
      }

      if (userInput.trim().length < 10) {
        throw new Error('Please provide more detailed drawing requirements (at least 10 characters).');
      }

      // Smart title extraction with flexible patterns
      let title = 'Technical Drawing';
      const titlePatterns = [
        /(?:drawing|draw|create|generate|design)\s+(?:for\s+|of\s+|a\s+)?(.+?)(?:\s+(?:drawing|plan|view|section|detail)|$)/i,
        /(?:plan|elevation|section|detail)\s+(?:for\s+|of\s+)?(.+?)(?:\s|$)/i,
        /(.+?)\s+(?:drawing|plan|elevation|section|detail)/i
      ];

      for (const pattern of titlePatterns) {
        const match = userInput.match(pattern);
        if (match && match[1].trim().length > 2) {
          title = match[1].trim();
          break;
        }
      }

      // Gather all available context
      const activeGuidelines = GuidelinesService.getActiveGuidelines();
      const drawingGuidelines = GuidelinesService.getActiveGuidelines('drawing');
      const allGuidelines = [...activeGuidelines, ...drawingGuidelines];
      const guidelinesText = GuidelinesService.formatGuidelinesForPrompt(allGuidelines);

      const scopeContext = finalizedScope || ThreadService.getAllContextForMode('discussion');

      // Get existing designs that might be relevant
      const existingDesigns = designs.filter(d => d.includeInContext !== false);
      const designsContext = existingDesigns.length > 0
        ? existingDesigns.map(d => `**Design: ${d.componentName}**\n${d.designContent.substring(0, 500)}...`).join('\n\n')
        : '';

      // Enhance user input with knowledge base if enabled
      let enhancedUserInput = userInput;
      if (includeKnowledgeBase) {
        const { enhancedPrompt } = RAGService.enhancePromptWithKnowledgeBase(
          userInput,
          includeKnowledgeBase
        );
        enhancedUserInput = enhancedPrompt;
      }

      // Create comprehensive drawing description using LLM
      setLoadingMessage('🤖 Generating professional technical drawing description...');

      const drawingPrompt = `You are a professional construction engineer and technical draftsman working within the HSR Construction Estimator application. Create a detailed technical drawing specification based on the user's requirements and all available project context.

**APPLICATION CONTEXT:**
This drawing is part of a comprehensive construction project that has gone through:
1. Discussion Section: Complete project scoping and requirements gathering
2. Design Section: Detailed component designs with specifications and calculations
3. Drawing Section (CURRENT): Professional technical drawing generation

**PRIMARY DRAWING REQUEST:**
${enhancedUserInput}

**COMPLETE PROJECT SCOPE:**
${scopeContext}

**EXISTING COMPONENT DESIGNS FOR INTEGRATION:**
${designsContext}

**PROJECT GUIDELINES:**
${guidelinesText}

**REFERENCE DOCUMENTS:**
${referenceText}

**COMPREHENSIVE DRAWING REQUIREMENTS:**
1. **Context Integration**: Use all available project context and existing designs
2. **Technical Accuracy**: Include specific dimensions from component designs
3. **Drawing Standards**: Follow IS 696, IS 962 standards for technical drawings
4. **Drawing Type**: Specify appropriate drawing type (plan, elevation, section, detail, assembly)
5. **Dimensional Accuracy**: Use exact dimensions from component designs where applicable
6. **Material Representation**: Include proper material symbols and construction details
7. **Professional Annotations**: Add comprehensive annotations, dimensions, and symbols
8. **Construction Guidance**: Provide clear construction and assembly guidance
9. **Integration Notes**: Show relationships with other project components
10. **Quality Standards**: Ensure drawing is suitable for construction and cost estimation

**OUTPUT REQUIREMENTS:**
Generate a comprehensive technical drawing specification that will be processed by a Python backend using ezdxf library to create professional DXF files. Include:
- Detailed geometric specifications
- Complete dimensioning requirements
- Material symbols and hatching patterns
- Layer organization and line types
- Title block information
- Drawing scale and units
- Construction notes and details

**INTEGRATION FOCUS:**
- Reference existing component designs for accurate dimensions
- Maintain consistency with project scope and requirements
- Consider construction sequencing and methodology
- Ensure compatibility with other project drawings
- Prepare drawing suitable for quantity takeoff and estimation

Focus on creating exactly what the user requested while leveraging all available project context to enhance accuracy, completeness, and professional quality.`;

      const drawingDescription = await LLMService.generateContent(drawingPrompt);

      if (!drawingDescription || drawingDescription.trim().length < 50) {
        throw new Error('Generated drawing description is too short. Please try with more specific requirements.');
      }

      setLoadingMessage('🔧 Creating professional DXF file with Python backend...');

      // Generate the actual DXF drawing using the backend
      const drawing = await DXFService.generateDXFFromDescription(
        title,
        drawingDescription,
        enhancedUserInput
      );

      // Save the drawing
      DXFStorageService.saveDrawing(drawing);
      loadDrawings();

      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: userInput },
        { role: 'model', text: `✅ **PROFESSIONAL TECHNICAL DRAWING GENERATED!**\n\n🏗️ **${title}**\n\n📋 **Drawing Description:**\n${drawingDescription.substring(0, 400)}...\n\n📁 **File:** ${drawing.dxfFilename}\n\n🎯 **Features:**\n• Professional DXF format compatible with AutoCAD, Revit, and other CAD software\n• Construction industry standards and symbols\n• Precise dimensions and annotations\n• Standard layers and line weights\n• Ready for construction use\n\n💾 **Download:** Click the download button in the Drawing Display section below.` }
      ]);

    } catch (err: any) {
      console.error('Drawing generation error:', err);
      let errorMessage = 'An error occurred while generating the drawing.';

      // Enhanced error handling with specific messages
      if (err.message?.includes('backend is not available')) {
        errorMessage = '🔧 Backend Configuration Required: Please configure your Google Cloud Functions URL in the Backend Configuration section below.';
      } else if (err.message?.includes('Failed to fetch')) {
        errorMessage = '🌐 Connection Error: Unable to connect to the drawing generation service. Please check your backend configuration.';
      } else if (err.message?.includes('timeout') || err.message?.includes('AbortError')) {
        errorMessage = '⏱️ Request Timeout: The drawing generation is taking longer than expected. Please try again or check your backend configuration.';
      } else if (err.message?.includes('too short')) {
        errorMessage = '📝 Insufficient Detail: Please provide more specific drawing requirements. Include details like dimensions, materials, or drawing type.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      // Add error to conversation for user visibility
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: userInput },
        { role: 'model', text: `❌ **Drawing Generation Failed**\n\n${errorMessage}\n\nPlease ensure:\n1. Your backend is properly configured\n2. Your requirements are specific and clear\n3. You're connected to the internet\n\nTry again with more detailed requirements.` }
      ]);
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
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

      const generatedKeywords = await generateKeywordsForItems(scope, '', referenceText);
      // Extract keywords from the returned object
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

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            {/* Primary Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={resetState}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                🔄 New Project
              </button>

              <button
                onClick={() => setShowProjectData(!showProjectData)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                📊 Project Data
              </button>

              {/* File Upload - More Accessible */}
              <div className="relative">
                <FileUpload
                  onFileUpload={handleFileUpload}
                  onFileRemove={handleFileRemove}
                  uploadedFiles={referenceDocs}
                  isFileProcessing={isFileProcessing}
                  setIsFileProcessing={setIsFileProcessing}
                />
              </div>
            </div>

            {/* Settings Dropdown */}
            <div className="flex items-center gap-3">
              {/* Knowledge Base Display - More Prominent */}
              <KnowledgeBaseDisplay
                includeInPrompts={includeKnowledgeBase}
                onToggleInclude={setIncludeKnowledgeBase}
                onOpenManager={() => setIsKnowledgeBaseOpen(true)}
              />

              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
                >
                  ⚙️ Settings
                  <span className="text-xs">
                    {showSettings ? '▲' : '▼'}
                  </span>
                </button>

                {showSettings && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          setIsGuidelinesOpen(true);
                          setShowSettings(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      >
                        📋 Guidelines ({guidelines.filter(g => g.isActive).length})
                      </button>

                      <button
                        onClick={() => {
                          setIsLLMSettingsOpen(true);
                          setShowSettings(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      >
                        🤖 LLM Provider ({currentProvider})
                      </button>

                      <button
                        onClick={() => {
                          setIsKnowledgeBaseOpen(true);
                          setShowSettings(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                      >
                        📚 Knowledge Base
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Output Mode Selector */}
          <OutputModeSelector
            currentMode={outputMode}
            onModeChange={handleOutputModeChange}
          />
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
              <button
                type="submit"
                disabled={isAiThinking || !currentMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Results and Displays Area */}
        <div className="space-y-6">

          {/* Design Display */}
          {outputMode === 'design' && (
            <DesignDisplay
              designs={designs}
              onDesignUpdate={loadDesigns}
              onContextUpdate={handleContextUpdate}
            />
          )}

          {/* Drawing Display */}
          {outputMode === 'drawing' && (
            <DrawingDisplay
              drawings={drawings}
              onDrawingUpdate={loadDrawings}
              onContextUpdate={handleContextUpdate}
            />
          )}

          {/* Discussion Mode Results */}
          {outputMode === 'discussion' && (
            <>
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
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      🔍 Generated Keywords
                    </h3>
                    <KeywordsDisplay keywords={keywords} />
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleKeywordApproval}
                        disabled={isAiThinking}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                      >
                        ✅ Approve & Search HSR Items
                      </button>
                    </div>
                  </div>
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
                      <div className="mt-4 space-y-2">
                        <textarea
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          placeholder="Enter edit instructions..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleEstimateEdit}
                            disabled={isAiThinking || !editInstruction.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                          >
                            ✏️ Edit Estimate
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
                <p className="text-2xl font-bold text-purple-600">{drawings.length}</p>
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
      </div>
    </div>
  );
};

export default App;
