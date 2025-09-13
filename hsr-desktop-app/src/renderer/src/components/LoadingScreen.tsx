import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Zap, Shield } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center">
      <div className="text-center text-white">
        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
          className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <Building2 className="w-12 h-12" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-3xl font-bold mb-2"
        >
          HSR Construction Estimator
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-white text-opacity-80 mb-8"
        >
          Professional Construction Cost Estimation
        </motion.p>

        {/* Loading Spinner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="flex justify-center mb-8"
        >
          <div className="w-8 h-8 border-3 border-white border-opacity-30 border-t-white rounded-full animate-spin" />
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex justify-center space-x-8 text-sm"
        >
          <div className="flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            <span>AI-Powered</span>
          </div>
          <div className="flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            <span>Secure</span>
          </div>
          <div className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            <span>Professional</span>
          </div>
        </motion.div>

        {/* Loading Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.4 }}
          className="text-white text-opacity-60 text-sm mt-6"
        >
          Initializing professional estimation tools...
        </motion.p>
      </div>
    </div>
  );
}
