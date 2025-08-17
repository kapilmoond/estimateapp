
import React from 'react';

export const Spinner: React.FC = () => (
  <div className="flex items-center space-x-2">
    <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
    <span>Processing...</span>
  </div>
);
