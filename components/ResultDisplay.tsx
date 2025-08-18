
import React from 'react';

interface ResultDisplayProps {
  textContent: string;
}

const containerStyle: React.CSSProperties = {
  background: '#f9fafb',
  padding: '1.5rem',
  borderRadius: '0.5rem',
  border: '1px solid #e5e7eb',
  overflowX: 'auto',
  whiteSpace: 'pre-wrap', // Important for rendering plain text with line breaks
  fontFamily: 'monospace' // Good for text reports
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ textContent }) => {
    return (
        <div 
            id="report-container"
            style={containerStyle}
        >
            {textContent}
        </div>
    );
};