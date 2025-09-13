import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, Key, Monitor, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAppState } from '../contexts/AppStateContext';
import toast from 'react-hot-toast';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { theme, setTheme, actualTheme } = useTheme();
  const { state, dispatch } = useAppState();
  const [apiKeys, setApiKeys] = useState({
    gemini: '',
    openai: '',
    moonshot: '',
    openrouter: '',
  });

  const handleSaveApiKey = (provider: string, key: string) => {
    // TODO: Save API key securely
    toast.success(`${provider} API key saved`);
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Settings
        </h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Theme Settings */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            Appearance
          </h3>
          <div className="space-y-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTheme(option.value as any)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                    theme === option.value
                      ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{option.label}</span>
                  {theme === option.value && (
                    <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* API Keys */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            API Keys
          </h3>
          <div className="space-y-4">
            {Object.entries(apiKeys).map(([provider, key]) => (
              <div key={provider}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 capitalize">
                  {provider} API Key
                </label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                    placeholder={`Enter ${provider} API key...`}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSaveApiKey(provider, key)}
                    disabled={!key.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Application Settings */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            Application
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200">Auto-save Projects</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Automatically save project changes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200">Enable Notifications</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">Show system notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* About */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            About
          </h3>
          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
              HSR Construction Estimator
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Version 1.0.0
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Professional construction cost estimation powered by AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
