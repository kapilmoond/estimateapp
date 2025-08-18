import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { HsrItem, ChatMessage, KeywordsByItem } from './types';
import { continueConversation, generateHtmlEstimate, generateKeywordsForItems, generateKeywordsForNSItems } from './services/geminiService';
import { searchHSR } from './services/hsrService';
import { extractHsrNumbersFromText } from './services/keywordService';
import { Spinner } from './components/Spinner';
import { ResultDisplay } from './components/ResultDisplay';
import { KeywordsDisplay } from './components/KeywordsDisplay';
import { HsrItemsDisplay } from './components/HsrItemsDisplay';
import { VoiceInput } from './components/VoiceInput';
import { FileUpload } from './components/FileUpload';

type Step = 'scoping' | 'generatingKeywords' | 'approvingKeywords' | 'approvingHsrItems' | 'generatingEstimate' | 'reviewingEstimate' | 'done';
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
  const [finalEstimateHtml, setFinalEstimateHtml] = useState<string>('');
  const [editInstruction, setEditInstruction] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  const [referenceDocs, setReferenceDocs] = useState<ReferenceDoc[]>([]);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const referenceText = useMemo(() => 
    referenceDocs.map(doc => `--- START OF ${doc.file.name} ---\n${doc.text}\n--- END OF ${doc.file.name} ---`).join('\n\n'), 
  [referenceDocs]);

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
    setKeywords([]);
    setKeywordsByItem({});
    setHsrItems([]);
    setFinalEstimateHtml('');
    setEditInstruction('');
    setError(null);
    setIsAiThinking(false);
    setLoadingMessage('');
    setReferenceDocs([]);
    setIsFileProcessing(false);
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
    setLoadingMessage('Thinking...');
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
      setLoadingMessage('');
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

  const handleRefineHsrSearch = async () => {
    setLoadingMessage('Refining search and generating report...');
    setIsAiThinking(true);
    setError(null);
    const initialStep = step;
    let itemsToUse = hsrItems; 

    try {
        const foundHsrItemDescriptions = hsrItems.map(item => `${item["HSR No."]} - ${item.Description}`);
        const newKeywordsByItem = await generateKeywordsForNSItems(finalizedScope, foundHsrItemDescriptions, referenceText);
        const newlyFoundItems = (Object.keys(newKeywordsByItem).length > 0) ? searchHSR(newKeywordsByItem) : [];

        if (newlyFoundItems.length > 0) {
            const combinedItems = [...hsrItems, ...newlyFoundItems];
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
            itemsToUse = finalItems;
        } else {
            console.log("Refined search did not find any additional HSR items.");
        }
        
        setLoadingMessage('Generating detailed project report...');
        const recentHistory = conversationHistory.slice(-4);
        const estimateHtml = await generateHtmlEstimate(finalizedScope, itemsToUse, recentHistory, undefined, undefined, referenceText);
        setFinalEstimateHtml(estimateHtml);
        setStep('reviewingEstimate');

    } catch (err: any) {
        console.error("Error refining HSR search and generating estimate:", err);
        setError(err.message || "An error occurred during the refinement process.");
        // Revert to original step on failure
        setStep(initialStep);
    } finally {
        setIsAiThinking(false);
        setLoadingMessage('');
    }
};


  const handleGenerateEstimate = async () => {
    setStep('generatingEstimate');
    setLoadingMessage('Generating detailed project report...');
    setIsAiThinking(true);
    setError(null);
    try {
      const recentHistory = conversationHistory.slice(-4); // Last 4 messages for context
      const estimateHtml = await generateHtmlEstimate(finalizedScope, hsrItems, recentHistory, undefined, undefined, referenceText);
      setFinalEstimateHtml(estimateHtml);
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
        const estimateHtml = await generateHtmlEstimate(finalizedScope, hsrItems, recentHistory, finalEstimateHtml, editInstruction, referenceText);
        setFinalEstimateHtml(estimateHtml);
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
                           <span>{loadingMessage || 'Thinking...'}</span>
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
                    <button onClick={handleGenerateEstimate} className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700" disabled={isAiThinking}>
                        Approve & Generate Estimate
                    </button>
                    <button onClick={handleRefineHsrSearch} className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400" disabled={isAiThinking}>
                        Find More Items & Generate Estimate
                    </button>
                     <button type="button" onClick={() => setStep('approvingKeywords')} className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300" disabled={isAiThinking}>
                        Back to Keywords
                    </button>
                </div>
            </div>
        );

    case 'reviewingEstimate':
        return (
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Step 4: Review & Edit Report</h2>
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
                         <button type="button" onClick={handleRefineHsrSearch} className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400" disabled={isAiThinking}>
                            Find More HSR Items & Regenerate
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
                <h1 className="text-4xl font-extrabold text-gray-900">HSR Construction Estimator</h1>
                <p className="mt-2 text-md text-gray-600">AI-Powered Costing with Haryana Schedule of Rates</p>
                {error && (
                    <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">
                        <strong>Error:</strong> {error}
                    </div>
                )}
            </header>
            
            <FileUpload 
              onFileUpload={handleFileUpload}
              onFileRemove={handleFileRemove}
              uploadedFiles={referenceDocs}
              isFileProcessing={isFileProcessing}
              setIsFileProcessing={setIsFileProcessing}
            />
            
            {renderMainContent()}
            
        </main>
         <footer className="text-center mt-8 text-sm text-gray-500 no-print">
            <p>&copy; {new Date().getFullYear()} HSR Construction Estimator. All rights reserved.</p>
        </footer>
    </div>
  );
};

export default App;
