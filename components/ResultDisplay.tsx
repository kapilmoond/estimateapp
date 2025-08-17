
import React from 'react';

interface ResultDisplayProps {
  htmlContent: string;
}

// A simple container with some basic styling to ensure the rendered HTML is scoped.
const containerStyle: React.CSSProperties = {
  background: '#f9fafb', // bg-gray-50
  padding: '1.5rem', // p-6
  borderRadius: '0.5rem', // rounded-lg
  border: '1px solid #e5e7eb', // border border-gray-200
  overflowX: 'auto',
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ htmlContent }) => {
    // This is necessary because the user has requested the AI to generate its own HTML format.
    // In a real-world production app, this HTML should be sanitized to prevent XSS attacks.
    return (
        <div 
            id="report-container"
            style={containerStyle}
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
    );
};