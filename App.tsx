import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { HsrItem, ChatMessage, KeywordsByItem, OutputMode, UserGuideline, ComponentDesign, TechnicalDrawing, ConversationThread } from './types';
import { continueConversation, generatePlainTextEstimate, generateKeywordsForItems } from './services/geminiService';
import { searchHSR } from './services/hsrService';
import { extractHsrNumbersFromText } from './services/keywordService';
import { speak } from './services/speechService';
import { GuidelinesService } from './services/guidelinesService';
import { ThreadService } from './services/threadService';
import { DesignService } from './services/designService';
import { DrawingService } from './services/drawingService';
import { ContextService } from './services/contextService';
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
  const [newlyFoundHsrItems, setNewlyFoundHsrItems] = useState<HsrItem[]>([]);
  const [finalEstimateText, setFinalEstimateText] = useState<string>('');
  const [editInstruction, setEditInstruction] = useState<string>('');
  const [keywordFeedback, setKeywordFeedback] = useState<string>('');
  const [hsrItemFeedback, setHsrItemFeedback] = useState<string>('');
  const [refinedHsrItemFeedback, setRefinedHsrItemFeedback] = useState<string>('');
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
  const [currentProvider, setCurrentProvider] = useState<string>(LLMService.getCurrentProvider());
  const [currentModel, setCurrentModel] = useState<string>(LLMService.getCurrentModel());
  const [showProjectData, setShowProjectData] = useState<boolean>(false);
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
    const loadedDrawings = DrawingService.loadDrawings();
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

      const design = await DesignService.generateComponentDesign(
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
    setLoadingMessage('Generating technical drawing...');
    setIsAiThinking(true);
    setError(null);

    try {
      // Extract drawing details from user input
      const titleMatch = userInput.match(/drawing\s+(?:for\s+)?(.+?)(?:\s|$)/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Technical Drawing';
      const componentName = title;

      const activeGuidelines = GuidelinesService.getActiveGuidelines();
      const drawingGuidelines = GuidelinesService.getActiveGuidelines('drawing');
      const allGuidelines = [...activeGuidelines, ...drawingGuidelines];
      const guidelinesText = GuidelinesService.formatGuidelinesForPrompt(allGuidelines);

      const scopeContext = finalizedScope || ThreadService.getAllContextForMode('discussion');
      const designContext = ThreadService.getAllContextForMode('design');

      // Enhance user input with knowledge base if enabled
      let enhancedUserInput = userInput;
      if (includeKnowledgeBase) {
        const { enhancedPrompt } = RAGService.enhancePromptWithKnowledgeBase(
          userInput,
          includeKnowledgeBase
        );
        enhancedUserInput = enhancedPrompt;
      }

      const drawing = await DrawingService.generateTechnicalDrawing(
        title,
        enhancedUserInput,
        componentName,
        enhancedUserInput,
        guidelinesText,
        designContext,
        referenceText
      );

      loadDrawings();
      setLoadingMessage('');

      // Add to conversation history for reference
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', text: userInput },
        { role: 'model', text: `Technical drawing generated for ${title}. You can view and edit the drawing in the Drawing Display section below.` }
      ]);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the drawing.');
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
      const latestThread = existingThreads.sort((a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime()
      )[0];
      setCurrentThread(latestThread);

      // Update conversation history with thread messages
      if (mode === 'discussion') {
        setConversationHistory(latestThread.messages);
      }
    } else if (mode === 'discussion') {
      // Reset to initial state for discussion mode
      setConversationHistory([
        { role: 'model', text: 'Hello! I am your AI assistant for construction estimation. Please describe the project you want to build, and we can define its scope together.' }
      ]);
    }
  };

  const handleFinalizeScope = async () => {
    const lastModelMessage = conversationHistory.filter(m => m.role === 'model').pop();
    if (lastModelMessage) {
        const scope = lastModelMessage.text;
        setFinalizedScope(scope);
        setStep('generatingKeywords');
        setLoadingMessage('Generating keywords with AI...');
        setIsAiThinking(true);
        setError(null);

        try {
            const generatedKeywords = await generateKeywordsForItems(scope, referenceText);
            const hsrNumbers = extractHsrNumbersFromText(scope);

            // Merge HSR numbers into each item's keywords
            const mergedKeywordsByItem: KeywordsByItem = {};
            for (const item in generatedKeywords) {
                const combined = [...new Set([...generatedKeywords[item], ...hsrNumbers])];
                mergedKeywordsByItem[item] = combined;
            }

            const allKeywords = [...new Set(Object.values(mergedKeywordsByItem).flat())];
            if (allKeywords.length === 0) {
                throw new Error("Could not extract any meaningful keywords from the scope. Please try to be more descriptive.");
            }
            
            setKeywordsByItem(mergedKeywordsByItem);
            setKeywords(allKeywords);
            setStep('approvingKeywords');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred while generating keywords with the AI.');
            setStep('scoping'); // Go back to scoping on error
        } finally {
            setIsAiThinking(false);
            setLoadingMessage('');
        }
    } else {
        setError("Could not find a final scope to approve. Please continue the conversation.");
    }
  };

  const handleRegenerateKeywords = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!keywordFeedback.trim()) return;

    setLoadingMessage('Re-generating keywords with your feedback...');
    setIsAiThinking(true);
    setError(null);

    try {
        const regeneratedKeywords = await generateKeywordsForItems(finalizedScope, keywordFeedback, referenceText);

        const hsrNumbers = extractHsrNumbersFromText(finalizedScope);

        const mergedKeywordsByItem: KeywordsByItem = {};
        for (const item in regeneratedKeywords) {
            const combined = [...new Set([...regeneratedKeywords[item], ...hsrNumbers])];
            mergedKeywordsByItem[item] = combined;
        }

        const allKeywords = [...new Set(Object.values(mergedKeywordsByItem).flat())];
        if (allKeywords.length === 0) {
            throw new Error("Could not extract any meaningful keywords from the scope. Please try to be more descriptive.");
        }

        setKeywordsByItem(mergedKeywordsByItem);
        setKeywords(allKeywords);
        setKeywordFeedback('');
    } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred while regenerating keywords.');
    } finally {
        setIsAiThinking(false);
        setLoadingMessage('');
    }
  };


  const handleApproveKeywords = () => {
    setError(null);
    try {
      const foundItems = searchHSR(keywordsByItem);
      if (foundItems.length === 0) {
        throw new Error('No relevant HSR items found for the generated keywords. Try adjusting the precision or refining the scope.');
      }
      setHsrItems(foundItems);
      setStep('approvingHsrItems');
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setStep('approvingKeywords');
    }
  };

  const handleRefineHsrSearch = async (feedback?: string) => {
    if (!feedback?.trim()) {
        setError("Please provide feedback to refine the search.");
        return;
    }
    setLoadingMessage('AI is re-analyzing the scope with your feedback...');
    setIsAiThinking(true);
    setError(null);
    const initialStep = step;

    try {
        // Step 1: Regenerate ALL keywords for the scope using the new feedback
        const newKeywordsByItem = await generateKeywordsForItems(finalizedScope, feedback, referenceText);

        // Update the main keywords state as well, since we have a new baseline
        const allNewKeywords = [...new Set(Object.values(newKeywordsByItem).flat())];
        setKeywordsByItem(newKeywordsByItem);
        setKeywords(allNewKeywords);

        // Step 2: Perform a new, full search with the regenerated keywords
        const newHsrItemsList = searchHSR(newKeywordsByItem);

        // Step 3: Diff the new list against the old list to find what's new
        const currentHsrNos = new Set(hsrItems.map(item => item['HSR No.']));
        const trulyNewItems = newHsrItemsList.filter(item => !currentHsrNos.has(item['HSR No.']));

        if (trulyNewItems.length > 0) {
            setNewlyFoundHsrItems(trulyNewItems);
            setStep('approvingRefinedHsrItems');
        } else {
            setError("Your feedback did not result in any new HSR items. Please try different feedback or approve the current list.");
            setStep('approvingHsrItems'); // Stay on the same step
        }
    } catch (err: any) {
        console.error("Error refining HSR search:", err);
        setError(err.message || "An error occurred during the refinement process.");
        setStep(initialStep); // Revert to original step on failure
    } finally {
        setIsAiThinking(false);
        setLoadingMessage('');
    }
  };

  const handleApproveRefinedHsrItems = async (feedback?: string) => {
    const combinedItems = [...hsrItems, ...newlyFoundHsrItems];
    const uniqueItemsMap = new Map<string, HsrItem>();
    combinedItems.forEach(item => {
        uniqueItemsMap.set(item['HSR No.'], item);
    });

    const finalItems = Array.from(uniqueItemsMap.values());

    const naturalSortComparator = (a: HsrItem, b: HsrItem): number => {
        const aParts = a['HSR No.'].split('.').map(Number);
        const bParts = b['HSR No.'].split('.').map(Number);
        const len = Math.max(aParts.length, bParts.length);
        for (let i = 0; i < len; i++) {
            const aVal = aParts[i] || 0;
            const bVal = bParts[i] || 0;
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
        }
        return 0;
    };
    finalItems.sort(naturalSortComparator);

    setHsrItems(finalItems);
    setNewlyFoundHsrItems([]);

    await handleGenerateEstimate(finalItems, feedback);
  };


  const handleGenerateEstimate = async (itemsToEstimate?: HsrItem[], feedback?: string) => {
    const items = itemsToEstimate || hsrItems;
    if (!items || items.length === 0) {
        setError("No HSR items to generate an estimate for.");
        setStep('approvingHsrItems'); // or wherever is appropriate
        return;
    }

    setStep('generatingEstimate');
    setLoadingMessage('Generating detailed project report...');
    setIsAiThinking(true);
    setError(null);
    try {
      const recentHistory = conversationHistory.slice(-4); // Last 4 messages for context

      // Add context from previous steps
      const contextPrompt = ContextService.generateContextPrompt();
      let enhancedReferenceText = referenceText + contextPrompt;

      // Add knowledge base context if enabled
      if (includeKnowledgeBase) {
        const estimateQuery = `Generate construction estimate for: ${finalizedScope}`;
        const { enhancedPrompt } = RAGService.enhancePromptWithKnowledgeBase(
          estimateQuery,
          includeKnowledgeBase
        );
        enhancedReferenceText += '\n\n' + enhancedPrompt;
      }

      const estimateText = await generatePlainTextEstimate(finalizedScope, items, recentHistory, undefined, feedback, enhancedReferenceText);
      setFinalEstimateText(estimateText);

      // Extract and save LLM summary
      const llmSummary = ContextService.extractLLMSummary(estimateText);
      ContextService.addStepSummary('estimate_generation', 'Generated final estimate', llmSummary);

      setStep('reviewingEstimate');
    } catch (err: any) {
      console.error("Error in handleGenerateEstimate:", err);
      setError(err.message || 'An error occurred while generating the final estimate.');
      setStep('approvingHsrItems');
    } finally {
      setIsAiThinking(false);
      setLoadingMessage('');
    }
  };
  
  const handleEditEstimate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editInstruction.trim()) return;

    setLoadingMessage('Re-generating report with your edits...');
    setIsAiThinking(true);
    setError(null);
    try {
        const recentHistory = conversationHistory.slice(-4); // Last 4 messages for context

        // Add context from previous steps
        const contextPrompt = ContextService.generateContextPrompt();
        const enhancedReferenceText = referenceText + contextPrompt;

        const estimateText = await generatePlainTextEstimate(finalizedScope, hsrItems, recentHistory, finalEstimateText, editInstruction, enhancedReferenceText);
        setFinalEstimateText(estimateText);

        // Extract and save LLM summary
        const llmSummary = ContextService.extractLLMSummary(estimateText);
        ContextService.addStepSummary('estimate_edit', `Edited estimate: ${editInstruction}`, llmSummary);

        setEditInstruction('');
    } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred while editing the estimate.");
    } finally {
        setIsAiThinking(false);
        setLoadingMessage('');
    }
  };

  const handleFinalizeEstimate = () => {
    setStep('done');
  };
  
  const handlePrintReport = () => {
      window.print();
  };
  
  const renderMainContent = () => {
    if (isAiThinking && (step === 'generatingKeywords' || step === 'generatingEstimate' || step === 'reviewingEstimate' || step === 'approvingHsrItems')) {
        return (
             <div className="mt-6 text-center text-gray-600 flex flex-col items-center">
               <div className="flex items-center space-x-2">
                 <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
                 <span>{loadingMessage || 'Processing...'}</span>
               </div>
            </div>
        )
    }

    switch (step) {
      case 'scoping':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 1: Integrated Project Definition</h2>

            {/* Output Mode Selector */}
            <OutputModeSelector
              currentMode={outputMode}
              onModeChange={handleOutputModeChange}
              disabled={isAiThinking}
            />

            {/* Context Display */}
            <ContextManager
              key={contextKey}
              onContextUpdate={handleContextUpdate}
              showCompactView={true}
            />

            {/* Chat Interface */}
            <div ref={chatContainerRef} className="h-96 overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4 space-y-4">
              {conversationHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-prose p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white shadow-sm'}`}>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                  </div>
                </div>
              ))}
               {isAiThinking && (
                <div className="flex justify-start">
                    <div className="max-w-prose p-3 rounded-lg bg-white shadow-sm">
                        <div className="flex items-center space-x-2 text-gray-500">
                           <div className="w-4 h-4 border-2 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
                           <span>{loadingMessage || 'Thinking...'}</span>
                        </div>
                    </div>
                </div>
               )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 mb-6">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder={
                  outputMode === 'discussion' ? "Describe your project..." :
                  outputMode === 'design' ? "Request component design (e.g., 'Design foundation for 2-story building')" :
                  "Request technical drawing (e.g., 'Drawing for foundation plan')"
                }
                className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                disabled={isAiThinking}
              />
               <VoiceInput
                appendToTranscript={(text) => setCurrentMessage(prev => prev + text)}
                disabled={isAiThinking}
              />
              <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400" disabled={isAiThinking || !currentMessage.trim()}>
                Send
              </button>
            </form>

            {/* Project Data Display */}
            <div className="mb-6">
              <button
                onClick={() => setShowProjectData(!showProjectData)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <svg className={`w-4 h-4 transform transition-transform ${showProjectData ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                View Project Data ({designs.length} designs, {drawings.length} drawings)
              </button>

              {showProjectData && (
                <div className="mt-4 space-y-6">
                  {/* Design Display */}
                  <DesignDisplay
                    designs={designs}
                    onDesignUpdate={loadDesigns}
                    onContextUpdate={handleContextUpdate}
                  />

                  {/* Drawing Display */}
                  <DrawingDisplay
                    drawings={drawings}
                    onDrawingUpdate={loadDrawings}
                    onContextUpdate={handleContextUpdate}
                  />

                  {/* Context Manager */}
                  <ContextManager
                    key={contextKey}
                    onContextUpdate={handleContextUpdate}
                    showCompactView={false}
                  />
                </div>
              )}
            </div>

            {/* Finalize Scope Button */}
            <div className="text-center">
                 <button onClick={handleFinalizeScope} className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400" disabled={isAiThinking || conversationHistory.length <= 1}>
                    Finalize Scope & Generate Keywords
                 </button>
            </div>
          </div>
        );
      case 'approvingKeywords':
        return (
            <div className="mt-8 pt-6 border-t border-gray-200 space-y-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 2: Approve Keywords & Find Items</h2>
                <p className="text-gray-600 mb-4">Keywords have been extracted from the project scope. Review them and then find the relevant HSR items. The search will prioritize items that match more keywords.</p>
                <div className="mb-4">
                     <h3 className="font-semibold text-lg text-gray-700 mb-2">Finalized Scope:</h3>
                     <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-60 overflow-y-auto" style={{whiteSpace: 'pre-wrap'}}>{finalizedScope}</div>
                </div>
                <KeywordsDisplay keywords={keywords} />
                <form onSubmit={handleRegenerateKeywords} className="mt-6 space-y-4">
                    <label htmlFor="keyword-feedback" className="block font-semibold text-gray-700">Not right? Provide feedback to regenerate keywords:</label>
                    <textarea
                        id="keyword-feedback"
                        value={keywordFeedback}
                        onChange={(e) => setKeywordFeedback(e.target.value)}
                        placeholder="e.g., 'Focus more on materials for the boundary wall keywords', 'The keywords for excavation are too generic'"
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        disabled={isAiThinking}
                    />
                    <button type="submit" className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-gray-400" disabled={isAiThinking || !keywordFeedback.trim()}>
                        Regenerate Keywords
                    </button>
                </form>
                <div className="flex items-center justify-center mt-6 space-x-4">
                    <button onClick={handleApproveKeywords} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                        Find HSR Items
                    </button>
                    <button type="button" onClick={() => setStep('scoping')} className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300">
                        Back to Scope
                    </button>
                </div>
            </div>
        );

      case 'approvingHsrItems':
        return (
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 3: Approve HSR Items</h2>
                <p className="text-gray-600 mb-4">The following HSR items were found. Please approve them to generate the final estimate. If items from your scope seem to be missing, you can try to refine the search.</p>
                <HsrItemsDisplay items={hsrItems} />
                <div className="flex items-center justify-center mt-6 space-x-4">
                    <button onClick={() => handleGenerateEstimate()} className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700" disabled={isAiThinking}>
                        Approve & Generate Estimate
                    </button>
                     <button type="button" onClick={() => setStep('approvingKeywords')} className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300" disabled={isAiThinking}>
                        Back to Keywords
                    </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleRefineHsrSearch(hsrItemFeedback); }} className="mt-6 space-y-4 p-4 border-t">
                    <label htmlFor="hsr-item-feedback" className="block font-semibold text-gray-700">Or, provide feedback to find more/different items:</label>
                    <textarea
                        id="hsr-item-feedback"
                        value={hsrItemFeedback}
                        onChange={(e) => setHsrItemFeedback(e.target.value)}
                        placeholder="e.g., 'The items for the foundation seem to be missing reinforcement steel', 'Find more finishing items like painting'"
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        disabled={isAiThinking}
                    />
                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400" disabled={isAiThinking}>
                        Refine Search & Generate Estimate
                    </button>
                </form>
            </div>
        );

      case 'approvingRefinedHsrItems':
        return (
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 3b: Approve Refined HSR Items</h2>
                <p className="text-gray-600 mb-4">The refined search found the following additional HSR items. Please review and approve to generate the final estimate with all items.</p>

                <h3 className="text-xl font-bold my-4 text-gray-800">Original Items</h3>
                <HsrItemsDisplay items={hsrItems} />

                <h3 className="text-xl font-bold my-4 text-gray-800">Newly Found Items</h3>
                <HsrItemsDisplay items={newlyFoundHsrItems} />

                <form onSubmit={(e) => { e.preventDefault(); handleApproveRefinedHsrItems(refinedHsrItemFeedback); }} className="mt-6 space-y-4 p-4 border-t">
                    <label htmlFor="refined-hsr-item-feedback" className="block font-semibold text-gray-700">Optionally, provide final instructions for the report generation:</label>
                    <textarea
                        id="refined-hsr-item-feedback"
                        value={refinedHsrItemFeedback}
                        onChange={(e) => setRefinedHsrItemFeedback(e.target.value)}
                        placeholder="e.g., 'Please put the concrete items first in the report', 'Emphasize the cost of steel'"
                        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        disabled={isAiThinking}
                    />
                    <button type="submit" className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400" disabled={isAiThinking}>
                        Approve & Generate Estimate with All Items
                    </button>
                </form>

                <div className="text-center mt-4">
                     <button type="button" onClick={() => setStep('approvingHsrItems')} className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300" disabled={isAiThinking}>
                        Back to Original Items
                    </button>
                </div>
            </div>
        );

    case 'reviewingEstimate':
        return (
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 4: Review & Edit Report</h2>
                <ResultDisplay textContent={finalEstimateText} />
                <form onSubmit={handleEditEstimate} className="mt-6 no-print">
                    <label htmlFor="edit-instruction" className="block font-semibold text-gray-700 mb-2">Edit Instructions:</label>
                    <div className="flex gap-2 items-start">
                      <textarea
                          id="edit-instruction"
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          placeholder="e.g., Make the headings bold, combine the first two tables..."
                          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          disabled={isAiThinking}
                      />
                      <VoiceInput 
                        appendToTranscript={(text) => setEditInstruction(prev => prev + text)}
                        disabled={isAiThinking}
                      />
                    </div>
                    <div className="flex items-center justify-center mt-6 space-x-4">
                         <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400" disabled={isAiThinking || !editInstruction.trim()}>
                            Regenerate Report
                         </button>
                         <button type="button" onClick={handleRefineHsrSearch} className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400" disabled={isAiThinking}>
                            Refine Search & Regenerate
                         </button>
                         <button type="button" onClick={handleFinalizeEstimate} className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700" disabled={isAiThinking}>
                            Finalize Report
                         </button>
                         <button type="button" onClick={() => setStep('approvingHsrItems')} className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300" disabled={isAiThinking}>
                            Back to HSR Items
                         </button>
                         <button type="button" onClick={resetState} className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300" disabled={isAiThinking}>
                            Start Over
                         </button>
                    </div>
                </form>
            </div>
        );
        
       case 'done':
        return (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Finalized Project Estimate Report</h2>
            <ResultDisplay textContent={finalEstimateText} />
            <div className="flex items-center justify-center mt-6 space-x-4 no-print">
              <button onClick={handlePrintReport} className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                Print Report
              </button>
              <button onClick={resetState} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                Start New Estimate
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <main className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-lg">
            <header className="text-center mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div></div>
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900">HSR Construction Estimator</h1>
                        <p className="mt-2 text-md text-gray-600">AI-Powered Costing with Haryana Schedule of Rates</p>
                        <div className="mt-2 text-sm text-gray-500">
                            Current AI: <span className="font-medium text-purple-600">{LLMService.getProvider(currentProvider)?.name}</span> -
                            <span className="font-medium text-purple-600">{LLMService.getModel(currentProvider, currentModel)?.name}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsLLMSettingsOpen(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                            title="LLM Provider Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>

                        <button
                            onClick={() => setIsKnowledgeBaseOpen(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                            title="Knowledge Base"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </button>

                        <button
                            onClick={() => setIsGuidelinesOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            title="Manage Guidelines"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-center mt-4">
                    <input
                        type="checkbox"
                        id="tts-toggle"
                        checked={isTtsEnabled}
                        onChange={(e) => setIsTtsEnabled(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="tts-toggle" className="ml-2 block text-sm text-gray-900">
                        Read AI Responses Aloud
                    </label>
                </div>
                {isTtsEnabled && (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-4 border-t border-gray-200">
                        <div>
                            <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700">
                                Voice
                            </label>
                            <select
                                id="voice-select"
                                value={selectedVoiceURI || ''}
                                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                <option value="">Default</option>
                                {availableVoices.map((voice) => (
                                    <option key={voice.voiceURI} value={voice.voiceURI}>
                                        {`${voice.name} (${voice.lang})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="rate-slider" className="block text-sm font-medium text-gray-700">
                                Speed: {speechRate}x
                            </label>
                            <input
                                id="rate-slider"
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={speechRate}
                                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}
                {error && (
                    <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">
                        <strong>Error:</strong> {error}
                    </div>
                )}
            </header>

            {!apiKey && (
                <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 mb-6 rounded-r-lg">
                    <h3 className="font-bold">Gemini API Key Required</h3>
                    <p>Please enter your API key to use the application. Your key will be saved in your browser's local storage.</p>
                    <div className="flex items-center mt-2">
                        <input
                            type="password"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            className="p-2 border border-gray-300 rounded-l-md w-full"
                            placeholder="Enter your Gemini API Key"
                        />
                        <button
                            onClick={handleApiKeySave}
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-r-md hover:bg-blue-700"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}
            
            <FileUpload
              onFileUpload={handleFileUpload}
              onFileRemove={handleFileRemove}
              uploadedFiles={referenceDocs}
              isFileProcessing={isFileProcessing}
              setIsFileProcessing={setIsFileProcessing}
            />

            <KnowledgeBaseDisplay
              includeInPrompts={includeKnowledgeBase}
              onToggleInclude={setIncludeKnowledgeBase}
              onOpenManager={() => setIsKnowledgeBaseOpen(true)}
            />
            
            {renderMainContent()}

        </main>

        {/* LLM Provider Settings Modal */}
        <LLMProviderSelector
          isOpen={isLLMSettingsOpen}
          onClose={() => {
            setIsLLMSettingsOpen(false);
            setCurrentProvider(LLMService.getCurrentProvider());
            setCurrentModel(LLMService.getCurrentModel());
          }}
        />

        {/* Knowledge Base Manager Modal */}
        <KnowledgeBaseManager
          isOpen={isKnowledgeBaseOpen}
          onClose={() => setIsKnowledgeBaseOpen(false)}
          onKnowledgeBaseUpdate={handleKnowledgeBaseUpdate}
        />

        {/* Guidelines Manager Modal */}
        <GuidelinesManager
          isOpen={isGuidelinesOpen}
          onClose={() => setIsGuidelinesOpen(false)}
          onGuidelinesUpdate={loadGuidelines}
        />

         <footer className="text-center mt-8 text-sm text-gray-500 no-print">
            <p>&copy; {new Date().getFullYear()} HSR Construction Estimator. All rights reserved.</p>
        </footer>
    </div>
  );
};

export default App;
