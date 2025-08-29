# HSR Construction Estimator - Discussion Section Documentation

## Overview
The Discussion Section is the primary interface for project scoping and conversation management in the HSR Construction Estimator app. It handles user interactions, context management, and LLM communication for construction project planning.

## Core Components

### 1. Message Flow Architecture

#### User Input Processing
- **Location**: `App.tsx` - `handleSendMessage()` function (lines 185-253)
- **Trigger**: Form submission from chat input field
- **Input Validation**: Checks for non-empty message and ensures AI is not currently processing

#### Message Structure
```typescript
interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}
```

### 2. Conversation History Management

#### State Management
- **Storage**: `conversationHistory` state array in App.tsx
- **Initialization**: Starts with welcome message from AI assistant
- **Updates**: New messages appended to history array
- **Persistence**: Stored in ThreadService for session management

#### Initial State
```javascript
const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your AI assistant for construction estimation. Please describe the project you want to build, and we can define its scope together.' }
]);
```

### 3. Prompt Construction Pipeline

#### Step 1: Base Message Processing
- User message converted to `ChatMessage` object
- Added to conversation history array
- Current message state cleared

#### Step 2: Context Enhancement
**Location**: `App.tsx` lines 206-208
```javascript
const contextPrompt = ContextService.generateContextPrompt();
let enhancedReferenceText = referenceText + contextPrompt;
```

**Context Sources**:
1. **Project Context** (`ContextService.generateContextPrompt()`)
2. **Reference Documents** (`referenceText` from uploaded files)
3. **Knowledge Base** (if enabled via RAG service)

#### Step 3: Knowledge Base Integration (Optional)
**Location**: `App.tsx` lines 210-218
```javascript
if (includeKnowledgeBase) {
    const { enhancedPrompt } = RAGService.enhancePromptWithKnowledgeBase(
        currentMessage,
        includeKnowledgeBase
    );
    newHistory[newHistory.length - 1].text = enhancedPrompt;
}
```

### 4. LLM Service Integration

#### Primary Function Call
**Location**: `App.tsx` line 220
```javascript
const modelResponse = await continueConversation(newHistory, enhancedReferenceText, outputMode);
```

#### Service Selection Logic
**Location**: `services/geminiService.ts` lines 46-55
- **Gemini Provider**: Uses advanced features with system instructions
- **Other Providers**: Falls back to simple text generation via LLMService

### 5. System Instructions (Hard-coded Prompts)

#### Discussion Mode System Instruction
**Location**: `services/geminiService.ts` lines 68-87
```javascript
baseSystemInstruction = `You are a world-class civil engineering estimator and project planner. Your primary goal is to engage in a step-by-step conversation with the user to collaboratively define the complete scope of a construction project.

**CORE RESPONSIBILITIES:**
1. **Project Scoping**: Help users articulate their construction project requirements through guided conversation
2. **Technical Expertise**: Provide professional civil engineering insights and recommendations
3. **Scope Refinement**: Ask clarifying questions to ensure comprehensive project definition
4. **Cost Awareness**: Consider cost implications while maintaining quality standards

**CONVERSATION APPROACH:**
- Ask specific, targeted questions about project details
- Suggest industry-standard approaches and materials
- Identify potential scope gaps or missing elements
- Provide professional recommendations based on best practices
- Maintain focus on defining a complete, buildable project scope

**TECHNICAL FOCUS AREAS:**
- Site conditions and preparation requirements
- Structural requirements and specifications
- Material selection and quantities
- Construction methodology and sequencing
- Regulatory compliance and permit requirements
- Quality standards and specifications

Focus on creating a comprehensive project scope that can be accurately estimated and successfully constructed.`;
```

### 6. Reference Text Integration

#### File Processing
**Location**: `App.tsx` lines 75-77
```javascript
const referenceText = useMemo(() => 
    referenceDocs.map(doc => `--- START OF ${doc.file.name} ---\n${doc.text}\n--- END OF ${doc.file.name} ---`).join('\n\n'), 
[referenceDocs]);
```

#### Prompt Enhancement Function
**Location**: `services/geminiService.ts` lines 21-44
```javascript
const createPromptWithReference = (basePrompt: string, referenceText?: string, guidelines?: string): string => {
    let enhancedPrompt = basePrompt;

    // Add guidelines if provided
    if (guidelines && guidelines.trim()) {
        enhancedPrompt = guidelines + '\n\n' + enhancedPrompt;
    }

    // Add reference documents if provided
    if (referenceText && referenceText.trim()) {
        enhancedPrompt = `You have been provided with a reference document by the user. Use the content of this document to inform your response, making it similar or using parts of it as instructed.

REFERENCE DOCUMENT CONTENT:
---
${referenceText}
---

TASK:
${enhancedPrompt}
        `;
    }

    return enhancedPrompt;
};
```

### 7. Context Service Integration

#### Context Generation
**Location**: `services/contextService.ts` lines 123-158
```javascript
static generateContextPrompt(): string {
    const context = this.getCurrentContext();
    if (!context) return '';

    const activeItems = context.activeContextItems.filter(item => item.includeInContext);
    if (activeItems.length === 0) return '';

    let prompt = '\n\n--- PROJECT CONTEXT ---\n';
    prompt += `Project: ${context.compactSummary}\n\n`;

    // Add recent step summaries
    const recentSteps = context.summary.stepSummaries.slice(-3);
    if (recentSteps.length > 0) {
        prompt += 'Recent Progress:\n';
        recentSteps.forEach(step => {
            prompt += `- ${step.step}: ${step.summary}\n`;
            if (step.llmSummary) {
                prompt += `  AI Summary: ${step.llmSummary}\n`;
            }
        });
        prompt += '\n';
    }

    // Add active context items
    if (activeItems.length > 0) {
        prompt += 'Relevant Context:\n';
        activeItems.slice(0, 5).forEach(item => {
            prompt += `- ${item.type.toUpperCase()}: ${item.title}\n`;
            prompt += `  ${item.content.substring(0, 300)}\n\n`;
        });
    }

    prompt += '--- END CONTEXT ---\n\n';
    return prompt;
}
```

### 8. Response Processing and Storage

#### Response Handling
**Location**: `App.tsx` lines 221-238
```javascript
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
```

#### Storage Locations
1. **Conversation History**: React state for immediate UI updates
2. **Context Service**: Browser localStorage for cross-session persistence
3. **Thread Service**: Session-based conversation threading
4. **Step Summaries**: Extracted summaries for context building

### 9. UI Components

#### Chat Interface
**Location**: `App.tsx` lines 711-773
- **Message Display**: Scrollable container with user/AI message differentiation
- **Input Form**: Text input with voice input support and send button
- **Loading State**: Spinner with dynamic loading messages

#### Message Styling
- **User Messages**: Blue background, right-aligned
- **AI Messages**: Gray background, left-aligned
- **Loading Indicator**: Spinner with contextual loading text

### 10. Error Handling

#### Error Processing
**Location**: `App.tsx` lines 243-249
```javascript
} catch (err: any) {
    console.error(err);
    setError(err.message || 'An error occurred while communicating with the AI.');
} finally {
    setIsAiThinking(false);
    setLoadingMessage('');
}
```

#### Error Display
- Errors shown in red alert box above chat interface
- Loading states cleared on error
- User can retry after error resolution

## Data Flow Summary

1. **User Input** → Form submission triggers `handleSendMessage()`
2. **Message Processing** → User message added to conversation history
3. **Context Building** → Project context, reference docs, and knowledge base combined
4. **Prompt Construction** → System instructions + conversation history + enhanced context
5. **LLM Communication** → `continueConversation()` sends prompt to selected LLM provider
6. **Response Processing** → AI response added to conversation history
7. **Context Updates** → Discussion added to context service for future reference
8. **Thread Management** → Conversation saved to thread service
9. **UI Updates** → Chat interface updated with new messages

## Configuration Points

### Customizable Elements
1. **System Instructions**: Modify base prompts in `geminiService.ts`
2. **Context Limits**: Adjust max context items and summary lengths in `contextService.ts`
3. **Reference Text Format**: Modify file processing in App.tsx
4. **Knowledge Base Integration**: Configure RAG settings in `ragService.ts`
5. **UI Styling**: Update chat interface styling in App.tsx

### Integration Points
1. **LLM Providers**: Extensible through `llmService.ts`
2. **File Upload**: Supports multiple document types via `FileUpload` component
3. **Guidelines System**: User-defined guidelines integrated via `GuidelinesService`
4. **Voice Input**: Speech-to-text integration via `VoiceInput` component
