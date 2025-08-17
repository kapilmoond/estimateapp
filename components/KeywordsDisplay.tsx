
import React from 'react';

interface KeywordsDisplayProps {
  keywords: string[];
}

export const KeywordsDisplay: React.FC<KeywordsDisplayProps> = ({ keywords }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <ul className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <li key={index} className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            {keyword}
          </li>
        ))}
      </ul>
    </div>
  );
};
