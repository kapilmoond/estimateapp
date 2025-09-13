import { RAGService } from './ragService';

export interface LLMProvider {
  id: string;
  name: string;
  apiKeyLabel: string;
  description: string;
  models: LLMModel[];
}

export interface LLMModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  costPer1kTokens: number;
}

export class LLMService {
  private static readonly PROVIDERS: LLMProvider[] = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      apiKeyLabel: 'Gemini API Key',
      description: 'Google\'s advanced AI models with excellent reasoning capabilities',
      models: [
        {
          id: 'gemini-2.5-pro',
          name: 'Gemini 2.5 Pro',
          description: 'Most capable model with advanced reasoning and multimodal capabilities',
          maxTokens: 2000000,
          costPer1kTokens: 0.00125
        },
        {
          id: 'gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          description: 'Fast and efficient model optimized for speed and cost',
          maxTokens: 1000000,
          costPer1kTokens: 0.000075
        }
      ]
    },
    {
      id: 'openai',
      name: 'OpenAI',
      apiKeyLabel: 'OpenAI API Key',
      description: 'Industry-leading AI models from OpenAI',
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          description: 'Most capable GPT model with superior reasoning',
          maxTokens: 128000,
          costPer1kTokens: 0.03
        },
        {
          id: 'gpt-5',
          name: 'GPT-5',
          description: 'Next-generation model with enhanced capabilities',
          maxTokens: 200000,
          costPer1kTokens: 0.05
        }
      ]
    },
    {
      id: 'moonshot',
      name: 'Moonshot AI',
      apiKeyLabel: 'Moonshot API Key',
      description: 'Kimi K2 model with excellent Chinese and English capabilities',
      models: [
        {
          id: 'kimi-k2-chat',
          name: 'Kimi K2 Chat',
          description: 'Advanced conversational AI with long context support',
          maxTokens: 200000,
          costPer1kTokens: 0.002
        }
      ]
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      apiKeyLabel: 'OpenRouter API Key',
      description: 'Access to multiple AI models through OpenRouter',
      models: [
        {
          id: 'custom-model',
          name: 'Custom Model',
          description: 'Enter any OpenRouter model name',
          maxTokens: 200000,
          costPer1kTokens: 0.001
        }
      ]
    }
  ];

  static getProviders(): LLMProvider[] {
    return this.PROVIDERS;
  }

  static getProvider(providerId: string): LLMProvider | undefined {
    return this.PROVIDERS.find(p => p.id === providerId);
  }

  static getModel(providerId: string, modelId: string): LLMModel | undefined {
    const provider = this.getProvider(providerId);
    return provider?.models.find(m => m.id === modelId);
  }

  /**
   * Generate content using the configured LLM provider
   */
  static async generateContent(
    prompt: string,
    options: {
      provider?: string;
      model?: string;
      includeRAG?: boolean;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const {
      provider = 'gemini',
      model = 'gemini-2.5-pro',
      includeRAG = false,
      maxTokens = 4000,
      temperature = 0.7
    } = options;

    try {
      // Enhance prompt with RAG if requested
      let finalPrompt = prompt;
      let ragContext = null;

      if (includeRAG) {
        const ragResult = await RAGService.enhancePromptWithRAG(prompt, true);
        finalPrompt = ragResult.enhancedPrompt;
        ragContext = ragResult.ragContext;
      }

      // Get API key from storage
      const apiKey = await this.getApiKey(provider);
      if (!apiKey) {
        throw new Error(`No API key configured for ${provider}`);
      }

      // Generate content based on provider
      let result: string;
      switch (provider) {
        case 'gemini':
          result = await this.generateGeminiContent(finalPrompt, model, apiKey, maxTokens, temperature);
          break;
        case 'openai':
          result = await this.generateOpenAIContent(finalPrompt, model, apiKey, maxTokens, temperature);
          break;
        case 'moonshot':
          result = await this.generateMoonshotContent(finalPrompt, model, apiKey, maxTokens, temperature);
          break;
        case 'openrouter':
          result = await this.generateOpenRouterContent(finalPrompt, model, apiKey, maxTokens, temperature);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      return result;

    } catch (error) {
      console.error('LLM generation error:', error);
      throw error;
    }
  }

  /**
   * Generate content using Gemini
   */
  private static async generateGeminiContent(
    prompt: string,
    model: string,
    apiKey: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || 'No response generated';

    } catch (error) {
      throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content using OpenAI
   */
  private static async generateOpenAIContent(
    prompt: string,
    model: string,
    apiKey: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';

    } catch (error) {
      throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content using Moonshot
   */
  private static async generateMoonshotContent(
    prompt: string,
    model: string,
    apiKey: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    try {
      const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`Moonshot API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';

    } catch (error) {
      throw new Error(`Moonshot generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate content using OpenRouter
   */
  private static async generateOpenRouterContent(
    prompt: string,
    model: string,
    apiKey: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://hsrestimator.com',
          'X-Title': 'HSR Construction Estimator',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';

    } catch (error) {
      throw new Error(`OpenRouter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get API key from secure storage
   */
  private static async getApiKey(provider: string): Promise<string | null> {
    try {
      if (window.electronAPI?.store?.get) {
        return await window.electronAPI.store.get(`apiKey_${provider}`);
      }
      return localStorage.getItem(`apiKey_${provider}`);
    } catch (error) {
      console.error('Failed to get API key:', error);
      return null;
    }
  }

  /**
   * Save API key to secure storage
   */
  static async saveApiKey(provider: string, apiKey: string): Promise<void> {
    try {
      if (window.electronAPI?.store?.set) {
        await window.electronAPI.store.set(`apiKey_${provider}`, apiKey);
      } else {
        localStorage.setItem(`apiKey_${provider}`, apiKey);
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      throw error;
    }
  }
}
