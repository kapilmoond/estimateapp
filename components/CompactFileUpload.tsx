import React, { useRef } from 'react';
import { ReferenceDoc } from '../types';

interface CompactFileUploadProps {
  onFileUpload: (newFiles: ReferenceDoc[]) => void;
  uploadedFiles: ReferenceDoc[];
  isFileProcessing: boolean;
}

export const CompactFileUpload: React.FC<CompactFileUploadProps> = ({
  onFileUpload,
  uploadedFiles,
  isFileProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newDocs: ReferenceDoc[] = files.map(file => ({
      file,
      content: '', // Will be processed later
      type: file.type.includes('pdf') ? 'pdf' : 
            file.type.includes('word') ? 'word' :
            file.type.includes('sheet') || file.name.endsWith('.xlsx') ? 'excel' : 'text'
    }));

    onFileUpload(newDocs);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.docx,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isFileProcessing}
        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
        title={`Upload reference documents (${uploadedFiles.length} files)`}
      >
        {isFileProcessing ? (
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        )}
      </button>

      {uploadedFiles.length > 0 && (
        <>
          <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {uploadedFiles.length}
          </div>

          {/* File list tooltip on hover */}
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg p-2 whitespace-nowrap z-10">
            <div className="max-w-48">
              <div className="font-medium mb-1">Uploaded Files:</div>
              {uploadedFiles.map((doc, index) => (
                <div key={index} className="text-xs text-gray-300 truncate">
                  {doc.file.name}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
