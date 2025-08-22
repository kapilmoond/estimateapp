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
    return localStorage.getItem('llm-model') || (provider === 'gemini' ? 'gemini-2.5-pro' : 'kimi-k2-0711-preview');
  }

  static setProvider(providerId: string, modelId: string): void {
    localStorage.setItem('llm-provider', providerId);
    localStorage.setItem('llm-model', modelId);
  }

  static getApiKey(providerId: string): string | null {
    const keyName = providerId === 'gemini' ? 'gemini-api-key' : 'moonshot-api-key';
    return localStorage.getItem(keyName);
  }

  static setApiKey(providerId: string, apiKey: string): void {
    const keyName = providerId === 'gemini' ? 'gemini-api-key' : 'moonshot-api-key';
    localStorage.setItem(keyName, apiKey);
  }

  static async generateContent(prompt: string): Promise<string> {
    const providerId = this.getCurrentProvider();
    const modelId = this.getCurrentModel();
    const apiKey = this.getApiKey(providerId);

    if (!apiKey) {
      throw new Error(`API key not configured for ${providerId}. Please set it in the LLM settings.`);
    }

    switch (providerId) {
      case 'gemini':
        return this.generateGeminiContent(prompt, modelId, apiKey);
      case 'moonshot':
        return this.generateMoonshotContent(prompt, modelId, apiKey);
      default:
        throw new Error(`Unsupported provider: ${providerId}`);
    }
  }

  private static async generateGeminiContent(prompt: string, modelId: string, apiKey: string): Promise<string> {
    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey });
    
    const response = await genAI.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text;
  }

  private static async generateMoonshotContent(prompt: string, modelId: string, apiKey: string): Promise<string> {
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Moonshot API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
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
}
