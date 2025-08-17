import React, { useState, useCallback, useRef, useEffect } from 'react';
import { HsrItem, ChatMessage, KeywordsByItem } from './types';
import { continueConversation, generateKeywordsForItems, generateHtmlEstimate } from './services/geminiService';
import { searchHSR } from './services/hsrService';
import { Spinner } from './components/Spinner';
import { ResultDisplay } from './components/ResultDisplay';
import { KeywordsDisplay } from './components/KeywordsDisplay';
import { HsrItemsDisplay } from './components/HsrItemsDisplay';
import { VoiceInput } from './components/VoiceInput';
import { FileUpload } from './components/FileUpload';

type Step = 'scoping' | 'keywordInstruction' | 'generatingKeywords' | 'approvingKeywords' | 'approvingHsrItems' | 'generatingEstimate' | 'reviewingEstimate' | 'done';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('scoping');
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your AI assistant for construction estimation. Please describe the project you want to build, and we can define its scope together.' }
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [finalizedScope, setFinalizedScope] = useState<string>('');
  const [keywordInstruction, setKeywordInstruction] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsByItem, setKeywordsByItem] = useState<KeywordsByItem>({});
  const [searchPrecision, setSearchPrecision] = useState<number>(20);
  const [hsrItems, setHsrItems] = useState<HsrItem[]>([]);
  const [finalEstimateHtml, setFinalEstimateHtml] = useState<string>('');
  const [editInstruction, setEditInstruction] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  
  const [referenceText, setReferenceText] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  const resetState = () => {
    setStep('scoping');
    setConversationHistory([{ role: 'model', text: 'Hello! Please describe the project you want to build.' }]);
    setCurrentMessage('');
    setFinalizedScope('');
    setKeywordInstruction('');
    setKeywords([]);
    setKeywordsByItem({});
    setSearchPrecision(20);
    setHsrItems([]);
    setFinalEstimateHtml('');
    setEditInstruction('');
    setError(null);
    setIsAiThinking(false);
    setReferenceText('');
    setUploadedFile(null);
    setIsFileProcessing(false);
  };
  
  const handleFileUpload = (text: string, file: File) => {
    setReferenceText(text);
    setUploadedFile(file);
  };

  const handleFileClear = () => {
    setReferenceText('');
    setUploadedFile(null);
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentMessage.trim() || isAiThinking) return;

    if (!process.env.API_KEY) {
      setError('API key is not configured. Please set the API_KEY environment variable.');
      return;
    }

    const newMessage: ChatMessage = { role: 'user', text: currentMessage };
    const newHistory = [...conversationHistory, newMessage];
    setConversationHistory(newHistory);
    setCurrentMessage('');
    setIsAiThinking(true);
    setError(null);

    try {
      const modelResponse = await continueConversation(newHistory, referenceText);
      setConversationHistory(prev => [...prev, { role: 'model', text: modelResponse }]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while communicating with the AI.');
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleFinalizeScope = () => {
    const lastModelMessage = conversationHistory.filter(m => m.role === 'model').pop();
    if (lastModelMessage) {
      setFinalizedScope(lastModelMessage.text);
      setStep('keywordInstruction');
    } else {
      setError("Could not find a final scope to approve. Please continue the conversation.");
    }
  };

  const handleGenerateKeywords = async (event: React.FormEvent) => {
    event.preventDefault();
    setStep('generatingKeywords');
    setIsAiThinking(true);
    setError(null);
    try {
      const keywordsData: KeywordsByItem = await generateKeywordsForItems(finalizedScope, keywordInstruction, referenceText);
      setKeywordsByItem(keywordsData);
      const allKeywords = [...new Set(Object.values(keywordsData).flat())];
      setKeywords(allKeywords);
      setStep('approvingKeywords');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating keywords.');
      setStep('keywordInstruction'); // Go back on error
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleApproveKeywords = () => {
    setError(null);
    try {
      const foundItems = searchHSR(keywordsByItem, searchPrecision);
      if (foundItems.length === 0) {
        throw new Error('No relevant HSR items found for the generated keywords. Try adjusting the precision.');
      }
      setHsrItems(foundItems);
      setStep('approvingHsrItems');
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setStep('approvingKeywords');
    }
  };

  const handleGenerateEstimate = async () => {
    setStep('generatingEstimate');
    setIsAiThinking(true);
    setError(null);
    try {
      const estimateHtml = await generateHtmlEstimate(finalizedScope, hsrItems, undefined, undefined, referenceText);
      setFinalEstimateHtml(estimateHtml);
      setStep('reviewingEstimate');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the final estimate.');
      setStep('approvingHsrItems');
    } finally {
      setIsAiThinking(false);
    }
  };
  
  const handleEditEstimate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editInstruction.trim()) return;

    setIsAiThinking(true);
    setError(null);
    try {
        const estimateHtml = await generateHtmlEstimate(finalizedScope, hsrItems, finalEstimateHtml, editInstruction, referenceText);
        setFinalEstimateHtml(estimateHtml);
        setEditInstruction('');
    } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred while editing the estimate.");
    } finally {
        setIsAiThinking(false);
    }
  };

  const handleFinalizeEstimate = () => {
    setStep('done');
  };
  
  const handlePrintReport = () => {
      window.print();
  };

  const getStatusMessage = () => {
    if (step === 'generatingKeywords') return 'Generating keywords from the project scope...';
    if (step === 'generatingEstimate') return 'Generating detailed project report...';
    if (isAiThinking && step === 'reviewingEstimate') return 'Re-generating report with your edits...'
    return 'Processing...';
  };
  
  const renderMainContent = () => {
    if (isAiThinking && (step === 'generatingKeywords' || step === 'generatingEstimate' || step === 'reviewingEstimate')) {
        return (
             <div className="mt-6 text-center text-gray-600 flex flex-col items-center">
               <div className="flex items-center space-x-2">
                 <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin"></div>
                 <span>{getStatusMessage()}</span>
               </div>
            </div>
        )
    }

    switch (step) {
      case 'scoping':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 1: Define Project Scope</h2>
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
                           <span>Thinking...</span>
                        </div>
                    </div>
                </div>
               )}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Your message..."
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
            <div className="text-center mt-6">
                 <button onClick={handleFinalizeScope} className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400" disabled={isAiThinking || conversationHistory.length <= 1}>
                    Finalize Scope
                 </button>
            </div>
          </div>
        );
      case 'keywordInstruction':
        return (
            <div className="mt-8 pt-6 border-t border-gray-200">
                 <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 2: Generate Keywords</h2>
                 <p className="text-gray-600 mb-4">The project scope has been finalized. You can now provide optional instructions for generating keywords before searching the HSR database.</p>
                 <div className="mb-4">
                     <h3 className="font-semibold text-lg text-gray-700 mb-2">Finalized Scope:</h3>
                     <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-60 overflow-y-auto" style={{whiteSpace: 'pre-wrap'}}>{finalizedScope}</div>
                 </div>
                <form onSubmit={handleGenerateKeywords}>
                    <label htmlFor="keyword-instruction" className="block font-semibold text-gray-700 mb-2">Optional Instructions:</label>
                    <div className="flex gap-2 items-start">
                      <textarea
                          id="keyword-instruction"
                          value={keywordInstruction}
                          onChange={(e) => setKeywordInstruction(e.target.value)}
                          placeholder="e.g., Focus on primary materials, exclude finishing items..."
                          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                          rows={3}
                      />
                      <VoiceInput 
                        appendToTranscript={(text) => setKeywordInstruction(prev => prev + text)}
                      />
                    </div>
                    <div className="flex items-center justify-center mt-6 space-x-4">
                        <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                           Generate Keywords
                        </button>
                        <button type="button" onClick={resetState} className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300">
                           Start Over
                        </button>
                    </div>
                 </form>
            </div>
        );
      case 'approvingKeywords':
        return (
            <div className="mt-8 pt-6 border-t border-gray-200 space-y-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 3: Approve Keywords</h2>
                <p className="text-gray-600 mb-4">Keywords have been generated for the project items. Please approve them to search the HSR database.</p>
                <div>
                    <label htmlFor="precision-slider" className="block font-semibold text-gray-700 mb-2">Search Precision: {searchPrecision}%</label>
                    <input
                        id="precision-slider"
                        type="range"
                        min="1"
                        max="100"
                        value={searchPrecision}
                        onChange={(e) => setSearchPrecision(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        aria-label="Search precision"
                    />
                    <p className="text-sm text-gray-500 mt-1">Controls how strictly the search matches keywords. A higher value is more strict, requiring more keywords to match an item.</p>
                </div>
                <KeywordsDisplay keywords={keywords} />
                <div className="flex items-center justify-center mt-6 space-x-4">
                    <button onClick={handleApproveKeywords} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                        Approve & Find HSR Items
                    </button>
                    <button type="button" onClick={resetState} className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300">
                        Start Over
                    </button>
                </div>
            </div>
        );
        
      case 'approvingHsrItems':
        return (
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 4: Approve HSR Items</h2>
                <p className="text-gray-600 mb-4">The following HSR items were found. Please approve them to generate the final estimate.</p>
                <HsrItemsDisplay items={hsrItems} />
                <div className="flex items-center justify-center mt-6 space-x-4">
                    <button onClick={handleGenerateEstimate} className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                        Approve & Generate Estimate
                    </button>
                    <button type="button" onClick={resetState} className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300">
                        Start Over
                    </button>
                </div>
            </div>
        );

    case 'reviewingEstimate':
        return (
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 5: Review & Edit Report</h2>
                <ResultDisplay htmlContent={finalEstimateHtml} />
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
                         <button type="button" onClick={handleFinalizeEstimate} className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700" disabled={isAiThinking}>
                            Finalize Report
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
            <ResultDisplay htmlContent={finalEstimateHtml} />
            <div className="flex items-center justify-center mt-6 space-x-4 no-print">
              <button onClick={handlePrintReport} className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
                Print Report
              </button>
              <button onClick={resetState} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
                Start a New Estimate
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 tracking-tight">
            HSR Construction Estimator
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            A conversational agent to help you build detailed estimates with HSR data.
          </p>
        </header>

        <main className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <FileUpload 
            onFileUpload={handleFileUpload}
            onFileClear={handleFileClear}
            uploadedFile={uploadedFile}
            isFileProcessing={isFileProcessing}
            setIsFileProcessing={setIsFileProcessing}
          />
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg no-print">
              <p className="font-bold">Error:</p>
              <p>{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-4 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700"
              >
                Close
              </button>
            </div>
          )}
          
          {renderMainContent()}

        </main>
        
        <footer className="text-center mt-12 text-sm text-gray-500">
            <p>Powered by Google Gemini API</p>
        </footer>
      </div>
    </div>
  );
};

export default App;