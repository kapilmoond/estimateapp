import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Shield, Clock, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { LicensingService } from '../../../shared/licensing';
import toast from 'react-hot-toast';

interface LicenseScreenProps {
  onLicenseActivated: () => void;
  onTrialStarted: () => void;
  error?: string;
}

export function LicenseScreen({ onLicenseActivated, onTrialStarted, error }: LicenseScreenProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [machineId, setMachineId] = useState('');
  const [showMachineId, setShowMachineId] = useState(false);

  useEffect(() => {
    loadMachineId();
  }, []);

  const loadMachineId = async () => {
    try {
      const id = await LicensingService.getMachineId();
      setMachineId(id);
    } catch (error) {
      console.error('Failed to get machine ID:', error);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }

    setIsValidating(true);
    try {
      const validation = await LicensingService.validateLicense(licenseKey.trim());
      
      if (validation.isValid) {
        LicensingService.saveLicense(licenseKey.trim());
        toast.success('License activated successfully!');
        onLicenseActivated();
      } else {
        toast.error(validation.error || 'Invalid license key');
      }
    } catch (error) {
      toast.error('Failed to validate license');
    } finally {
      setIsValidating(false);
    }
  };

  const handleStartTrial = () => {
    const success = LicensingService.startTrial();
    if (success) {
      toast.success('Trial started! You have 7 days to evaluate the software.');
      onTrialStarted();
    } else {
      toast.error('Trial has already been used on this machine');
    }
  };

  const copyMachineId = () => {
    navigator.clipboard.writeText(machineId);
    toast.success('Machine ID copied to clipboard');
  };

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8 text-white">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Shield className="w-8 h-8" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">HSR Construction Estimator</h1>
            <p className="text-white text-opacity-80">Professional Construction Cost Estimation</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500 bg-opacity-20 border border-red-400 rounded-lg p-3 mb-6 flex items-center"
            >
              <AlertCircle className="w-5 h-5 mr-2 text-red-300" />
              <span className="text-red-100 text-sm">{error}</span>
            </motion.div>
          )}

          {/* License Key Input */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-white text-opacity-90">
                License Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white text-opacity-60" />
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="Enter your license key"
                  className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-30"
                  onKeyPress={(e) => e.key === 'Enter' && handleActivateLicense()}
                />
              </div>
            </div>

            {/* Activate Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleActivateLicense}
              disabled={isValidating}
              className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Activate License
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white border-opacity-20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-white text-opacity-60">or</span>
              </div>
            </div>

            {/* Trial Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartTrial}
              className="w-full bg-transparent border border-white border-opacity-30 hover:bg-white hover:bg-opacity-10 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center"
            >
              <Clock className="w-5 h-5 mr-2" />
              Start 7-Day Trial
            </motion.button>

            {/* Machine ID Section */}
            <div className="pt-4 border-t border-white border-opacity-20">
              <button
                onClick={() => setShowMachineId(!showMachineId)}
                className="text-sm text-white text-opacity-70 hover:text-opacity-90 transition-colors"
              >
                {showMachineId ? 'Hide' : 'Show'} Machine ID
              </button>
              
              {showMachineId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-3 bg-white bg-opacity-10 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white text-opacity-80 font-mono break-all">
                      {machineId}
                    </span>
                    <button
                      onClick={copyMachineId}
                      className="ml-2 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-white text-opacity-70" />
                    </button>
                  </div>
                  <p className="text-xs text-white text-opacity-60 mt-2">
                    Provide this Machine ID when purchasing a license
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white border-opacity-20 text-center">
            <p className="text-xs text-white text-opacity-60">
              Need a license? Contact support for purchasing options.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
