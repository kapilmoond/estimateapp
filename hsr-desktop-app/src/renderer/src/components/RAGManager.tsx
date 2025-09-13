import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Database, FileText, Trash2, Search } from 'lucide-react';
import { useAppState } from '../contexts/AppStateContext';
import toast from 'react-hot-toast';

interface RAGManagerProps {
  onClose: () => void;
}

export function RAGManager({ onClose }: RAGManagerProps) {
  const { state } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    try {
      // TODO: Implement file upload to RAG server
      for (const file of Array.from(files)) {
        console.log('Uploading file:', file.name);
      }
      toast.success('Files uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }
    // TODO: Implement RAG search
    toast.info('Searching knowledge base...');
  };

  const mockDocuments = [
    { id: '1', name: 'Construction Standards.pdf', size: '2.4 MB', type: 'pdf', uploadDate: new Date() },
    { id: '2', name: 'Material Specifications.docx', size: '1.8 MB', type: 'docx', uploadDate: new Date() },
    { id: '3', name: 'Cost Database.xlsx', size: '3.2 MB', type: 'xlsx', uploadDate: new Date() },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Knowledge Base
        </h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* RAG Server Status */}
        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              state.ragServerStatus.isRunning ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <div>
              <h3 className="font-medium text-slate-800 dark:text-slate-200">
                RAG Server Status
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {state.ragServerStatus.isRunning 
                  ? `Connected • ${state.ragServerStatus.documentsCount} documents indexed`
                  : 'Disconnected • Start the RAG server to enable knowledge base features'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            Search Knowledge Base
          </h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </motion.button>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            Upload Documents
          </h3>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              Drag and drop files here, or click to select
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
              Supports PDF, Word, Excel, and text files
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <motion.label
              htmlFor="file-upload"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Select Files</span>
            </motion.label>
          </div>
        </div>

        {/* Document List */}
        <div>
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            Uploaded Documents
          </h3>
          {mockDocuments.length > 0 ? (
            <div className="space-y-2">
              {mockDocuments.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium text-slate-800 dark:text-slate-200">
                        {doc.name}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {doc.size} • {doc.uploadDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No documents uploaded yet
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-xs">
                Upload documents to enhance AI responses with your knowledge base
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
