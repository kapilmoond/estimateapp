import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-4">
          HSR Construction Estimator
        </h1>
        <p className="text-center text-gray-600 mb-8">
          AI-Powered Costing with Haryana Schedule of Rates
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-xl font-bold text-blue-800 mb-2">
            🚀 Knowledge Base System Deployed!
          </h2>
          <p className="text-blue-700">
            The app is now running with the new knowledge base features. 
            This is a test version to verify deployment is working.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
