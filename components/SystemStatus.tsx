import React, { useEffect, useState } from 'react';
import { LLMService } from '../services/llmService';
import { EzdxfDrawingService } from '../services/ezdxfDrawingService';

interface SystemStatusProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ isOpen, onClose }) => {
  const [serverStatus, setServerStatus] = useState<{ running: boolean; message: string; version?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const run = async () => {
      setTesting(true);
      try {
        const status = await EzdxfDrawingService.checkServerStatus();
        setServerStatus(status);
      } finally {
        setTesting(false);
      }
    };
    run();
  }, [isOpen]);

  if (!isOpen) return null;

  const provider = LLMService.getCurrentProvider();
  const providerStatus = LLMService.getProviderStatus();
  const model = LLMService.getCurrentModel();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">System Diagnostics</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg p-3">
            <h3 className="font-medium mb-1">LLM Provider</h3>
            <div className="text-sm text-gray-700">Selected: {provider}</div>
            <div className="text-sm text-gray-700">Model: {model}</div>
            <div className="text-sm mt-1">
              Status: {providerStatus[provider] ? (
                <span className="text-green-600">Connected</span>
              ) : (
                <span className="text-red-600">Not configured</span>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <h3 className="font-medium mb-1">Local ezdxf Server</h3>
            <div className="text-sm text-gray-700">{testing ? 'Checking...' : (serverStatus?.message || 'Unknown')}</div>
            {serverStatus && (
              <div className="text-sm text-gray-700">Running: {serverStatus.running ? 'Yes' : 'No'}</div>
            )}
            <button
              onClick={async () => {
                setTesting(true);
                try {
                  const result = await EzdxfDrawingService.testServer();
                  setServerStatus({ running: result.success, message: result.message });
                } finally {
                  setTesting(false);
                }
              }}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Test Server
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
};

