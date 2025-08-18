import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface FileUploadProps {
  onFileUpload: (files: { file: File; text: string }[]) => void;
  onFileRemove: (fileName: string) => void;
  uploadedFiles: { file: File; text: string }[];
  isFileProcessing: boolean;
  setIsFileProcessing: (isProcessing: boolean) => void;
}

const readExcelFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error("Failed to read file data.");
        }
        const workbook = XLSX.read(data, { type: 'array' });
        let fullText = '';
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          if (json.length > 0) {
            fullText += json.map(row => row.join(' ')).join('\n') + '\n';
          }
        });
        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsArrayBuffer(file);
  });
};

const readPdfFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data || !(data instanceof ArrayBuffer)) {
          throw new Error("Failed to read file data.");
        }

        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const numPages = pdf.numPages;
        let fullText = '';

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => (item as any).str).join(' ');
          fullText += pageText + '\n';
        }
        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsArrayBuffer(file);
  });
};

const readWordFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) {
        return reject(new Error("Failed to read Word file."));
      }
      if (result instanceof ArrayBuffer) {
        mammoth.extractRawText({ arrayBuffer: result })
          .then(resultObj => resolve(resultObj.value))
          .catch(reject);
      } else {
        reject(new Error("FileReader did not return an ArrayBuffer."));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};


export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  onFileRemove,
  uploadedFiles,
  isFileProcessing,
  setIsFileProcessing,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsFileProcessing(true);
    
    const newFiles: { file: File; text: string }[] = [];
    
    for (const file of Array.from(files)) {
      try {
        setProcessingStatus(`Processing ${file.name}...`);
        let extractedText = '';
        const lowerCaseFileName = file.name.toLowerCase();

        if (lowerCaseFileName.endsWith('.txt')) {
          extractedText = await file.text();
        } else if (lowerCaseFileName.endsWith('.xlsx') || lowerCaseFileName.endsWith('.xls')) {
          extractedText = await readExcelFile(file);
        } else if (lowerCaseFileName.endsWith('.docx')) {
           extractedText = await readWordFile(file);
        } else if (lowerCaseFileName.endsWith('.pdf')) {
            extractedText = await readPdfFile(file);
        } else {
          console.warn(`Unsupported file type: ${file.name}`);
          setError(`Unsupported file type: ${file.name}. Please upload TXT, Excel, Word, or PDF files.`);
          continue; 
        }
        newFiles.push({ file, text: extractedText });
      } catch (err: any) {
        console.error(`Error processing file ${file.name}:`, err);
        setError(`Failed to process ${file.name}.`);
      }
    }
    
    if (newFiles.length > 0) {
      onFileUpload(newFiles);
    }

    setIsFileProcessing(false);
    setProcessingStatus('');
    event.target.value = '';
  }, [onFileUpload, setIsFileProcessing]);

  return (
    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg no-print">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Reference Documents (Optional)</h3>
      <p className="text-sm text-gray-500 mb-4">
        Upload PDF, TXT, Excel (.xlsx), or Word (.docx) files. The AI will use their content to inform its responses.
      </p>
      <div className="flex items-center gap-4">
        <label
          htmlFor="file-upload"
          className={`relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 p-2 border border-gray-300 ${isFileProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span>{uploadedFiles.length > 0 ? 'Add More Files' : 'Upload Files'}</span>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            className="sr-only"
            accept=".txt,.xls,.xlsx,.docx,.pdf,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            disabled={isFileProcessing}
            multiple
          />
        </label>
        {isFileProcessing && (
          <div className="flex items-center text-gray-600">
            <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin mr-2"></div>
            <span>{processingStatus}</span>
          </div>
        )}
      </div>
       {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

       {uploadedFiles.length > 0 && !isFileProcessing && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold text-gray-600">Uploaded Files:</h4>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md bg-white">
            {uploadedFiles.map(({ file }) => (
              <li key={file.name} className="px-3 py-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700 font-medium">{file.name}</span>
                </div>
                <button
                  onClick={() => onFileRemove(file.name)}
                  className="text-red-500 hover:text-red-700 font-semibold text-xl leading-none"
                  aria-label={`Remove ${file.name}`}
                  title={`Remove ${file.name}`}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};