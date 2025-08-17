import React, { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set workerSrc once when the module is loaded.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.172/build/pdf.worker.min.mjs`;

interface FileUploadProps {
  onFileUpload: (text: string, file: File) => void;
  onFileClear: () => void;
  uploadedFile: File | null;
  isFileProcessing: boolean;
  setIsFileProcessing: (isProcessing: boolean) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  onFileClear,
  uploadedFile,
  isFileProcessing,
  setIsFileProcessing,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsFileProcessing(true);
    setProcessingStatus('Processing file...');

    try {
      let extractedText = '';
      if (file.type === 'text/plain') {
        setProcessingStatus('Reading text file...');
        extractedText = await file.text();
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        let fullText = '';
        for (let i = 1; i <= numPages; i++) {
          setProcessingStatus(`Extracting text from page ${i} of ${numPages}...`);
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        extractedText = fullText;
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or TXT file.');
      }
      onFileUpload(extractedText, file);
    } catch (err: any) {
      console.error("Error processing file:", err);
      setError(err.message || 'Failed to process the file.');
      onFileClear(); // Clear any previous state if processing fails
    } finally {
      setIsFileProcessing(false);
      setProcessingStatus('');
      // Reset the input value to allow re-uploading the same file
      event.target.value = '';
    }
  }, [onFileUpload, onFileClear, setIsFileProcessing]);

  return (
    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg no-print">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Reference Document (Optional)</h3>
      <p className="text-sm text-gray-500 mb-4">
        Upload a PDF or TXT file to provide context or a reference estimate. The AI will use this document to inform its responses.
      </p>
      <div className="flex items-center gap-4">
        <label
          htmlFor="file-upload"
          className={`relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 p-2 border border-gray-300 ${isFileProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>{uploadedFile ? 'Change File' : 'Upload a file'}</span>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            className="sr-only"
            accept=".pdf,.txt"
            onChange={handleFileChange}
            disabled={isFileProcessing}
          />
        </label>
        {isFileProcessing && (
          <div className="flex items-center text-gray-600">
            <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin mr-2"></div>
            <span>{processingStatus}</span>
          </div>
        )}
        {uploadedFile && !isFileProcessing && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{uploadedFile.name}</span>
            <button
              onClick={onFileClear}
              className="text-red-500 hover:text-red-700 font-semibold text-lg"
              aria-label="Remove file"
            >
              &times;
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};