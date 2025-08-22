import React, { useState, useEffect } from 'react';
import { LLMService } from '../services/llmService';
import { LLMProvider, LLMModel } from '../types';

interface LLMProviderSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LLMProviderSelector: React.FC<LLMProviderSelectorProps> = ({ isOpen, onClose }) => {
  const [providers] = useState<LLMProvider[]>(LLMService.getProviders());
  const [currentProvider, setCurrentProvider] = useState<string>(LLMService.getCurrentProvider());
  const [currentModel, setCurrentModel] = useState<string>(LLMService.getCurrentModel());
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({});
  const [providerStatus, setProviderStatus] = useState<{ [key: string]: boolean }>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  useEffect(() => {
    // Load existing API keys
    const keys: { [key: string]: string } = {};
    providers.forEach(provider => {
      const key = LLMService.getApiKey(provider.id);
      if (key) keys[provider.id] = key;
    });
    setApiKeys(keys);
    setProviderStatus(LLMService.getProviderStatus());
  }, [providers]);

  const handleProviderChange = (providerId: string) => {
    setCurrentProvider(providerId);
    const provider = LLMService.getProvider(providerId);
    if (provider && provider.models.length > 0) {
      setCurrentModel(provider.models[0].id);
    }
  };

  const handleModelChange = (modelId: string) => {
    setCurrentModel(modelId);
  };

  const handleApiKeyChange = (providerId: string, apiKey: string) => {
    setApiKeys(prev => ({ ...prev, [providerId]: apiKey }));
  };

  const handleSave = () => {
    // Save provider and model selection
    LLMService.setProvider(currentProvider, currentModel);
    
    // Save API keys
    Object.entries(apiKeys).forEach(([providerId, apiKey]) => {
      if (apiKey.trim()) {
        LLMService.setApiKey(providerId, apiKey.trim());
      }
    });

    // Update status
    setProviderStatus(LLMService.getProviderStatus());
    
    onClose();
  };

  const handleTestConnection = async (providerId: string) => {
    const apiKey = apiKeys[providerId];
    if (!apiKey) {
      alert('Please enter an API key first');
      return;
    }

    setTestingProvider(providerId);
    
    try {
      // Temporarily save the API key for testing
      LLMService.setApiKey(providerId, apiKey);
      const originalProvider = LLMService.getCurrentProvider();
      const originalModel = LLMService.getCurrentModel();
      
      // Set test provider
      const provider = LLMService.getProvider(providerId);
      if (provider) {
        LLMService.setProvider(providerId, provider.models[0].id);
        
        // Test with a simple prompt
        await LLMService.generateContent('Hello, please respond with "Connection successful"');
        
        // Restore original settings
        LLMService.setProvider(originalProvider, originalModel);
        
        alert('✅ Connection successful!');
        setProviderStatus(prev => ({ ...prev, [providerId]: true }));
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      alert(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProviderStatus(prev => ({ ...prev, [providerId]: false }));
    } finally {
      setTestingProvider(null);
    }
  };

  if (!isOpen) return null;

  const selectedProvider = LLMService.getProvider(currentProvider);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">LLM Provider Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Provider Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Select AI Provider</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map(provider => (
              <div
                key={provider.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  currentProvider === provider.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleProviderChange(provider.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-lg">{provider.name}</h4>
                  <div className={`w-3 h-3 rounded-full ${
                    providerStatus[provider.id] ? 'bg-green-500' : 'bg-red-500'
                  }`} title={providerStatus[provider.id] ? 'Connected' : 'Not configured'} />
                </div>
                <p className="text-sm text-gray-600 mb-3">{provider.description}</p>
                <div className="text-xs text-gray-500">
                  {provider.models.length} model{provider.models.length !== 1 ? 's' : ''} available
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        {selectedProvider && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Select Model</h3>
            <div className="grid grid-cols-1 gap-3">
              {selectedProvider.models.map(model => (
                <div
                  key={model.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    currentModel === model.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleModelChange(model.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{model.name}</h4>
                      <p className="text-sm text-gray-600">{model.description}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>Max: {(model.maxTokens / 1000).toLocaleString()}K tokens</div>
                      <div>${model.costPer1kTokens.toFixed(6)}/1K tokens</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Key Configuration */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">API Key Configuration</h3>
          <div className="space-y-4">
            {providers.map(provider => (
              <div key={provider.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium">{provider.apiKeyLabel}</label>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      providerStatus[provider.id] ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-xs text-gray-500">
                      {providerStatus[provider.id] ? 'Connected' : 'Not configured'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeys[provider.id] || ''}
                    onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                    placeholder={`Enter your ${provider.name} API key`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleTestConnection(provider.id)}
                    disabled={!apiKeys[provider.id] || testingProvider === provider.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {testingProvider === provider.id ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {provider.id === 'gemini' 
                    ? 'Get your API key from Google AI Studio (https://aistudio.google.com/app/apikey)'
                    : 'Get your API key from Moonshot AI Platform (https://platform.moonshot.ai/console/api-keys)'
                  }
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
