/**
 * DXF Hosting Service - Temporary file hosting for DXF preview
 * Provides multiple hosting options for DXF files to work with iframe viewers
 */

export interface HostingResult {
  success: boolean;
  url?: string;
  error?: string;
  provider?: string;
}

export class DXFHostingService {
  private static readonly HOSTING_PROVIDERS = [
    {
      name: 'file.io',
      upload: DXFHostingService.uploadToFileIO,
      maxSize: 100 * 1024 * 1024, // 100MB
      duration: '24 hours'
    },
    {
      name: 'tmpfiles.org',
      upload: DXFHostingService.uploadToTmpFiles,
      maxSize: 100 * 1024 * 1024, // 100MB
      duration: '1 hour'
    },
    {
      name: 'transfer.sh',
      upload: DXFHostingService.uploadToTransferSh,
      maxSize: 10 * 1024 * 1024 * 1024, // 10GB
      duration: '14 days'
    }
  ];

  /**
   * Upload DXF file to temporary hosting service
   */
  static async uploadDXFFile(dxfContent: string, filename: string): Promise<HostingResult> {
    const blob = this.createDXFBlob(dxfContent);
    
    // Try each hosting provider in order
    for (const provider of this.HOSTING_PROVIDERS) {
      try {
        console.log(`Trying to upload to ${provider.name}...`);
        const result = await provider.upload(blob, filename);
        
        if (result.success && result.url) {
          console.log(`Successfully uploaded to ${provider.name}: ${result.url}`);
          return {
            ...result,
            provider: provider.name
          };
        }
      } catch (error) {
        console.log(`Failed to upload to ${provider.name}:`, error);
        continue;
      }
    }

    return {
      success: false,
      error: 'All hosting providers failed. Please download the DXF file directly.'
    };
  }

  /**
   * Create DXF blob from content (handles both base64 and plain text)
   */
  private static createDXFBlob(dxfContent: string): Blob {
    try {
      // Check if it's base64 encoded
      if (dxfContent.startsWith('data:') || /^[A-Za-z0-9+/]+=*$/.test(dxfContent.replace(/\s/g, ''))) {
        const base64Data = dxfContent.replace(/^data:[^,]*,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: 'application/dxf' });
      } else {
        // Plain text DXF
        return new Blob([dxfContent], { type: 'application/dxf' });
      }
    } catch (error) {
      // Fallback to plain text
      return new Blob([dxfContent], { type: 'application/dxf' });
    }
  }

  /**
   * Upload to file.io (24 hour hosting)
   */
  private static async uploadToFileIO(blob: Blob, filename: string): Promise<HostingResult> {
    const formData = new FormData();
    formData.append('file', blob, `${filename.replace(/[^a-zA-Z0-9]/g, '_')}.dxf`);

    const response = await fetch('https://file.io', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.link) {
      return {
        success: true,
        url: result.link
      };
    } else {
      throw new Error(result.message || 'Upload failed');
    }
  }

  /**
   * Upload to tmpfiles.org (1 hour hosting)
   */
  private static async uploadToTmpFiles(blob: Blob, filename: string): Promise<HostingResult> {
    const formData = new FormData();
    formData.append('file', blob, `${filename.replace(/[^a-zA-Z0-9]/g, '_')}.dxf`);

    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (result.status === 'success' && result.data?.url) {
      return {
        success: true,
        url: result.data.url
      };
    } else {
      throw new Error(result.message || 'Upload failed');
    }
  }

  /**
   * Upload to transfer.sh (14 day hosting)
   */
  private static async uploadToTransferSh(blob: Blob, filename: string): Promise<HostingResult> {
    const cleanFilename = `${filename.replace(/[^a-zA-Z0-9]/g, '_')}.dxf`;
    
    const response = await fetch(`https://transfer.sh/${cleanFilename}`, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': 'application/dxf'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const url = await response.text();
    
    if (url && url.trim()) {
      return {
        success: true,
        url: url.trim()
      };
    } else {
      throw new Error('No URL returned');
    }
  }

  /**
   * Generate ShareCAD viewer URL
   */
  static generateShareCADUrl(fileUrl: string): string {
    return `//sharecad.org/cadframe/load?url=${encodeURIComponent(fileUrl)}`;
  }

  /**
   * Generate alternative viewer URLs
   */
  static generateAlternativeViewerUrls(fileUrl: string): {
    name: string;
    url: string;
    description: string;
  }[] {
    return [
      {
        name: 'ShareCAD',
        url: `https://sharecad.org/cadframe/load?url=${encodeURIComponent(fileUrl)}`,
        description: 'Professional CAD viewer with zoom and pan'
      },
      {
        name: 'AutoCAD Web',
        url: `https://web.autocad.com/`,
        description: 'Upload to AutoCAD Web for full editing (requires account)'
      },
      {
        name: 'OnShape',
        url: `https://www.onshape.com/`,
        description: 'Professional cloud CAD platform (requires account)'
      }
    ];
  }

  /**
   * Check if file size is suitable for hosting
   */
  static isFileSuitableForHosting(dxfContent: string): {
    suitable: boolean;
    size: number;
    sizeFormatted: string;
    reason?: string;
  } {
    const blob = this.createDXFBlob(dxfContent);
    const size = blob.size;
    const sizeFormatted = this.formatFileSize(size);
    
    // Check against the most permissive provider (transfer.sh - 10GB)
    const maxSize = 10 * 1024 * 1024 * 1024;
    
    if (size > maxSize) {
      return {
        suitable: false,
        size,
        sizeFormatted,
        reason: `File too large (${sizeFormatted}). Maximum size is 10GB.`
      };
    }

    return {
      suitable: true,
      size,
      sizeFormatted
    };
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * Get hosting provider information
   */
  static getHostingProviderInfo(): {
    name: string;
    maxSize: string;
    duration: string;
    description: string;
  }[] {
    return this.HOSTING_PROVIDERS.map(provider => ({
      name: provider.name,
      maxSize: this.formatFileSize(provider.maxSize),
      duration: provider.duration,
      description: `Temporary hosting for ${provider.duration}, max ${this.formatFileSize(provider.maxSize)}`
    }));
  }

  /**
   * Create a data URL for small files (fallback)
   */
  static createDataUrl(dxfContent: string): string {
    const blob = this.createDXFBlob(dxfContent);
    return URL.createObjectURL(blob);
  }
}
