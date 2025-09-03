import { LLMProvider, LLMModel } from '../types';

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
      id: 'moonshot',
      name: 'Moonshot AI (Kimi)',
      apiKeyLabel: 'Moonshot API Key',
      description: 'Kimi K2 - Advanced Mixture-of-Experts model with 1 trillion parameters',
      models: [
        {
          id: 'kimi-k2-0711-preview',
          name: 'Kimi K2',
          description: 'State-of-the-art MoE model with 32B activated parameters, excellent for coding and technical tasks',
          maxTokens: 200000,
          costPer1kTokens: 0.0002
        }
      ]
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      apiKeyLabel: 'OpenRouter API Key',
      description: 'Access to multiple AI models through OpenRouter - paste any model name',
      models: [
        {
          id: 'custom-model',
          name: 'Custom Model',
          description: 'Enter any OpenRouter model name (e.g., anthropic/claude-3.5-sonnet, openai/gpt-4, etc.)',
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

  static getCurrentProvider(): string {
    return localStorage.getItem('llm-provider') || 'gemini';
  }

  static getCurrentModel(): string {
    const provider = this.getCurrentProvider();
    const defaultModel = provider === 'gemini' ? 'gemini-2.5-pro' :
                        provider === 'moonshot' ? 'kimi-k2-0711-preview' :
                        'anthropic/claude-3.5-sonnet';
    return localStorage.getItem('llm-model') || defaultModel;
  }

  static getCustomModelName(): string {
    return localStorage.getItem('openrouter-custom-model') || 'anthropic/claude-3.5-sonnet';
  }

  static setCustomModelName(modelName: string): void {
    localStorage.setItem('openrouter-custom-model', modelName);
  }

  static setProvider(providerId: string, modelId: string): void {
    localStorage.setItem('llm-provider', providerId);
    localStorage.setItem('llm-model', modelId);
  }

  static getApiKey(providerId: string): string | null {
    const keyName = providerId === 'gemini' ? 'gemini-api-key' :
                   providerId === 'moonshot' ? 'moonshot-api-key' :
                   'openrouter-api-key';
    return localStorage.getItem(keyName);
  }

  static setApiKey(providerId: string, apiKey: string): void {
    const keyName = providerId === 'gemini' ? 'gemini-api-key' :
                   providerId === 'moonshot' ? 'moonshot-api-key' :
                   'openrouter-api-key';
    localStorage.setItem(keyName, apiKey);
  }

  static async generateContent(prompt: string): Promise<string> {
    const providerId = this.getCurrentProvider();
    const modelId = this.getCurrentModel();
    const apiKey = this.getApiKey(providerId);

    if (!apiKey) {
      throw new Error(`API key not configured for ${providerId}. Please set it in the LLM settings.`);
    }

    try {
      console.log(`LLMService: Generating content with ${providerId}/${modelId}`);
      console.log(`LLMService: Prompt length: ${prompt.length}`);

      let result: string;
      switch (providerId) {
        case 'gemini':
          result = await this.generateGeminiContent(prompt, modelId, apiKey);
          break;
        case 'moonshot':
          result = await this.generateMoonshotContent(prompt, modelId, apiKey);
          break;
        case 'openrouter':
          const customModel = this.getCustomModelName();
          result = await this.generateOpenRouterContent(prompt, customModel, apiKey);
          break;
        default:
          throw new Error(`Unsupported provider: ${providerId}`);
      }

      console.log(`LLMService: Generated content length: ${result?.length || 0}`);

      if (!result || result.trim().length === 0) {
        throw new Error('Empty response from AI service. Please try again.');
      }

      return result;
    } catch (error) {
      console.error('LLMService Error:', error);

      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('quota') || error.message.includes('limit')) {
          throw new Error('API quota exceeded. Please check your usage limits or try a different provider.');
        } else if (error.message.includes('invalid') || error.message.includes('unauthorized')) {
          throw new Error('Invalid API key. Please check your API key configuration.');
        } else if (error.message.includes('overloaded') || error.message.includes('busy')) {
          throw new Error('AI service is currently overloaded. Please wait a moment and try again.');
        } else if (error.message.includes('timeout')) {
          throw new Error('Request timeout. Please try again with a shorter prompt.');
        }
      }

      throw error;
    }
  }

  private static async generateGeminiContent(prompt: string, modelId: string, apiKey: string): Promise<string> {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({ apiKey });

      console.log(`Gemini: Calling ${modelId} with prompt length ${prompt.length}`);

      const response = await genAI.models.generateContent({
        model: modelId,
        contents: prompt,
      });

      console.log('Gemini: Response received');

      if (!response || !response.text) {
        throw new Error('Empty response from Gemini API');
      }

      return response.text;
    } catch (error) {
      console.error('Gemini API Error:', error);

      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error('Invalid Gemini API key. Please check your API key.');
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Gemini API quota exceeded. Please check your usage limits.');
        } else if (error.message.includes('MODEL_NOT_FOUND')) {
          throw new Error(`Gemini model ${modelId} not found. Please try a different model.`);
        } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
          throw new Error('Gemini API rate limit exceeded. Please wait and try again.');
        }
      }

      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async generateMoonshotContent(prompt: string, modelId: string, apiKey: string): Promise<string> {
    try {
      console.log(`Moonshot: Calling ${modelId} with prompt length ${prompt.length}`);

      const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      console.log(`Moonshot: Response status ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Moonshot API Error Data:', errorData);

        if (response.status === 401) {
          throw new Error('Invalid Moonshot API key. Please check your API key.');
        } else if (response.status === 429) {
          throw new Error('Moonshot API rate limit exceeded. Please wait and try again.');
        } else if (response.status === 402) {
          throw new Error('Moonshot API quota exceeded. Please check your usage limits.');
        }

        throw new Error(`Moonshot API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Moonshot: Response received');

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Moonshot API');
      }

      return content;
    } catch (error) {
      console.error('Moonshot API Error:', error);
      throw error;
    }
  }

  static validateApiKey(providerId: string, apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    switch (providerId) {
      case 'gemini':
        return apiKey.startsWith('AIza') && apiKey.length > 30;
      case 'moonshot':
        return apiKey.startsWith('sk-') && apiKey.length > 40;
      case 'openrouter':
        return apiKey.startsWith('sk-or-') && apiKey.length > 50;
      default:
        return false;
    }
  }

  static getProviderStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};

    for (const provider of this.PROVIDERS) {
      const apiKey = this.getApiKey(provider.id);
      status[provider.id] = apiKey !== null && this.validateApiKey(provider.id, apiKey);
    }

    return status;
  }

  private static async generateOpenRouterContent(prompt: string, modelName: string, apiKey: string): Promise<string> {
    try {
      console.log(`LLMService: Calling OpenRouter API with model: ${modelName}`);
      console.log(`LLMService: API Key format: ${apiKey.substring(0, 10)}...`);
      console.log(`LLMService: API Key length: ${apiKey.length}`);
      console.log(`LLMService: Model name length: ${modelName.length}`);

      const requestBody = {
        model: modelName,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0
      };

      console.log('LLMService: Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'HSR Construction Estimator'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`OpenRouter Response Status: ${response.status}`);
      console.log(`OpenRouter Response Headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenRouter API Error:', response.status, errorData);

        if (response.status === 401) {
          throw new Error('Invalid OpenRouter API key. Please check your API key in LLM settings.');
        } else if (response.status === 402) {
          throw new Error('OpenRouter API quota exceeded. Please check your account balance.');
        } else if (response.status === 404) {
          throw new Error(`OpenRouter model "${modelName}" not found. Please check the model name or try a different model. Available models: anthropic/claude-3-5-sonnet-20241022, openai/gpt-4o, google/gemini-2.0-flash-exp:free`);
        } else if (response.status === 429) {
          throw new Error('OpenRouter API rate limit exceeded. Please try again in a moment.');
        } else {
          throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }
      }

      const data = await response.json();
      console.log('OpenRouter API Response:', data);

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid OpenRouter response structure:', data);
        throw new Error('Invalid response from OpenRouter API');
      }

      const content = data.choices[0].message.content;
      if (!content || content.trim().length === 0) {
        throw new Error('Empty response from OpenRouter API');
      }

      return content.trim();
    } catch (error) {
      console.error('OpenRouter API Error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to communicate with OpenRouter API');
    }
  }
}
