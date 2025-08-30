import * as XLSX from 'xlsx';

export interface ParsedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  metadata: {
    sheets?: string[];
    pages?: number;
    encoding?: string;
    structure?: any;
  };
  parsedAt: number;
}

export interface ExcelSheet {
  name: string;
  data: any[][];
  headers: string[];
  rowCount: number;
  columnCount: number;
}

export interface ExcelParseResult {
  fileName: string;
  sheets: ExcelSheet[];
  summary: string;
  totalRows: number;
  totalSheets: number;
}

export class FileParsingService {
  /**
   * Parse uploaded file based on its type
   */
  static async parseFile(file: File): Promise<ParsedFile> {
    const fileType = this.getFileType(file);
    
    try {
      let content = '';
      let metadata: any = {};
      
      switch (fileType) {
        case 'excel':
          const excelResult = await this.parseExcelFile(file);
          content = this.formatExcelContent(excelResult);
          metadata = {
            sheets: excelResult.sheets.map(s => s.name),
            totalRows: excelResult.totalRows,
            totalSheets: excelResult.totalSheets,
            structure: excelResult
          };
          break;
          
        case 'word':
          content = await this.parseWordFile(file);
          metadata = { pages: this.estimatePages(content) };
          break;
          
        case 'pdf':
          content = await this.parsePdfFile(file);
          metadata = { pages: this.estimatePages(content) };
          break;
          
        case 'text':
          content = await this.parseTextFile(file);
          metadata = { encoding: 'UTF-8' };
          break;
          
        case 'markdown':
          content = await this.parseMarkdownFile(file);
          metadata = { encoding: 'UTF-8', type: 'markdown' };
          break;
          
        default:
          content = await this.parseAsText(file);
          metadata = { encoding: 'auto-detected' };
      }
      
      return {
        name: file.name,
        type: fileType,
        size: file.size,
        content,
        metadata,
        parsedAt: Date.now()
      };
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error(`Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Excel file with professional sheet handling
   */
  static async parseExcelFile(file: File): Promise<ExcelParseResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const sheets: ExcelSheet[] = [];
          let totalRows = 0;
          
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Extract headers (first row)
            const headers = jsonData.length > 0 ? (jsonData[0] as string[]) : [];
            
            // Get data rows
            const dataRows = jsonData.slice(1);
            
            const sheetInfo: ExcelSheet = {
              name: sheetName,
              data: jsonData as any[][],
              headers,
              rowCount: jsonData.length,
              columnCount: headers.length
            };
            
            sheets.push(sheetInfo);
            totalRows += jsonData.length;
          });
          
          resolve({
            fileName: file.name,
            sheets,
            summary: this.createExcelSummary(sheets),
            totalRows,
            totalSheets: sheets.length
          });
        } catch (error) {
          reject(new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Format Excel content for LLM context
   */
  static formatExcelContent(excelResult: ExcelParseResult): string {
    let content = `# Excel File: ${excelResult.fileName}\n\n`;
    content += `**File Summary:**\n`;
    content += `- Total Sheets: ${excelResult.totalSheets}\n`;
    content += `- Total Rows: ${excelResult.totalRows}\n`;
    content += `- Sheet Names: ${excelResult.sheets.map(s => s.name).join(', ')}\n\n`;
    
    excelResult.sheets.forEach((sheet, index) => {
      content += `## Sheet ${index + 1}: "${sheet.name}"\n\n`;
      content += `**Sheet Information:**\n`;
      content += `- Rows: ${sheet.rowCount}\n`;
      content += `- Columns: ${sheet.columnCount}\n`;
      content += `- Headers: ${sheet.headers.join(', ')}\n\n`;
      
      if (sheet.data.length > 0) {
        content += `**Data Preview (First 10 rows):**\n\n`;
        
        // Create table format
        const previewRows = sheet.data.slice(0, Math.min(11, sheet.data.length)); // Headers + 10 data rows
        
        previewRows.forEach((row, rowIndex) => {
          if (rowIndex === 0) {
            // Headers
            content += `| ${row.join(' | ')} |\n`;
            content += `| ${row.map(() => '---').join(' | ')} |\n`;
          } else {
            // Data rows
            content += `| ${row.join(' | ')} |\n`;
          }
        });
        
        if (sheet.data.length > 11) {
          content += `\n*... and ${sheet.data.length - 11} more rows*\n`;
        }
      }
      
      content += '\n---\n\n';
    });
    
    return content;
  }

  /**
   * Create Excel summary for metadata
   */
  static createExcelSummary(sheets: ExcelSheet[]): string {
    const sheetSummaries = sheets.map(sheet => 
      `${sheet.name} (${sheet.rowCount} rows, ${sheet.columnCount} cols)`
    );
    return `Excel file with ${sheets.length} sheets: ${sheetSummaries.join(', ')}`;
  }

  /**
   * Parse Word document (basic text extraction)
   */
  static async parseWordFile(file: File): Promise<string> {
    // For now, treat as binary and extract what we can
    // In a full implementation, you'd use a library like mammoth.js
    const text = await this.parseAsText(file);
    return `# Word Document: ${file.name}\n\n${text}`;
  }

  /**
   * Parse PDF file (basic text extraction)
   */
  static async parsePdfFile(file: File): Promise<string> {
    // For now, treat as binary and extract what we can
    // In a full implementation, you'd use a library like pdf-parse
    const text = await this.parseAsText(file);
    return `# PDF Document: ${file.name}\n\n${text}`;
  }

  /**
   * Parse text file
   */
  static async parseTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(`# Text File: ${file.name}\n\n${content}`);
      };
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse Markdown file
   */
  static async parseMarkdownFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(`# Markdown File: ${file.name}\n\n${content}`);
      };
      reader.onerror = () => reject(new Error('Failed to read markdown file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse as text (fallback)
   */
  static async parseAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content || `[Binary file: ${file.name}]`);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Determine file type from extension and MIME type
   */
  static getFileType(file: File): string {
    const extension = file.name.toLowerCase().split('.').pop() || '';
    const mimeType = file.type.toLowerCase();
    
    // Excel files
    if (extension === 'xlsx' || extension === 'xls' || 
        mimeType.includes('spreadsheet') || 
        mimeType.includes('excel')) {
      return 'excel';
    }
    
    // Word files
    if (extension === 'docx' || extension === 'doc' || 
        mimeType.includes('document') || 
        mimeType.includes('word')) {
      return 'word';
    }
    
    // PDF files
    if (extension === 'pdf' || mimeType.includes('pdf')) {
      return 'pdf';
    }
    
    // Markdown files
    if (extension === 'md' || extension === 'markdown') {
      return 'markdown';
    }
    
    // Text files
    if (extension === 'txt' || mimeType.includes('text')) {
      return 'text';
    }
    
    return 'unknown';
  }

  /**
   * Estimate number of pages in text content
   */
  static estimatePages(content: string): number {
    const wordsPerPage = 250;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerPage);
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file before parsing
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['excel', 'word', 'pdf', 'text', 'markdown'];
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }
    
    const fileType = this.getFileType(file);
    if (!allowedTypes.includes(fileType) && fileType !== 'unknown') {
      return { valid: false, error: 'Unsupported file type' };
    }
    
    return { valid: true };
  }
}
