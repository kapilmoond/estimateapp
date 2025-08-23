/**
 * Cloud Functions Configuration
 * Manages backend URL configuration for different deployment environments
 */

export interface BackendConfig {
  url: string;
  type: 'local' | 'cloud-functions' | 'render' | 'other';
  timeout: number;
  retries: number;
}

export class CloudConfig {
  private static readonly LOCAL_URL = 'http://localhost:5000';
  private static readonly CLOUD_FUNCTIONS_URL = process.env.REACT_APP_CLOUD_FUNCTIONS_URL || '';
  
  /**
   * Get the current backend configuration
   */
  static getBackendConfig(): BackendConfig {
    // Check if Cloud Functions URL is configured
    if (this.CLOUD_FUNCTIONS_URL) {
      return {
        url: this.CLOUD_FUNCTIONS_URL,
        type: 'cloud-functions',
        timeout: 30000, // 30 seconds for cloud functions
        retries: 2
      };
    }
    
    // Default to local development
    return {
      url: this.LOCAL_URL,
      type: 'local',
      timeout: 10000, // 10 seconds for local
      retries: 1
    };
  }
  
  /**
   * Set Cloud Functions URL (for dynamic configuration)
   */
  static setCloudFunctionsUrl(url: string): void {
    // Store in localStorage for persistence
    localStorage.setItem('cloudFunctionsUrl', url);
  }
  
  /**
   * Get Cloud Functions URL from localStorage or environment
   */
  static getCloudFunctionsUrl(): string {
    return localStorage.getItem('cloudFunctionsUrl') || this.CLOUD_FUNCTIONS_URL;
  }
  
  /**
   * Check if running in cloud environment
   */
  static isCloudEnvironment(): boolean {
    return !!this.getCloudFunctionsUrl();
  }
  
  /**
   * Get appropriate timeout for current environment
   */
  static getTimeout(): number {
    return this.getBackendConfig().timeout;
  }
  
  /**
   * Get retry count for current environment
   */
  static getRetries(): number {
    return this.getBackendConfig().retries;
  }
  
  /**
   * Format URL for specific endpoint
   */
  static getEndpointUrl(endpoint: string): string {
    const config = this.getBackendConfig();
    const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }
  
  /**
   * Test backend connectivity
   */
  static async testConnectivity(): Promise<{
    available: boolean;
    type: string;
    url: string;
    responseTime: number;
    error?: string;
  }> {
    const config = this.getBackendConfig();
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second test timeout
      
      const response = await fetch(this.getEndpointUrl('/health'), {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          available: true,
          type: config.type,
          url: config.url,
          responseTime
        };
      } else {
        return {
          available: false,
          type: config.type,
          url: config.url,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        available: false,
        type: config.type,
        url: config.url,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Auto-detect best backend configuration
   */
  static async autoDetectBackend(): Promise<BackendConfig> {
    const configs: BackendConfig[] = [];
    
    // Add Cloud Functions URL if available
    const cloudUrl = this.getCloudFunctionsUrl();
    if (cloudUrl) {
      configs.push({
        url: cloudUrl,
        type: 'cloud-functions',
        timeout: 30000,
        retries: 2
      });
    }
    
    // Add local URL
    configs.push({
      url: this.LOCAL_URL,
      type: 'local',
      timeout: 10000,
      retries: 1
    });
    
    // Test each configuration
    for (const config of configs) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${config.url}/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`✅ Backend detected: ${config.type} at ${config.url}`);
          return config;
        }
      } catch (error) {
        console.log(`❌ Backend not available: ${config.type} at ${config.url}`);
      }
    }
    
    // Return default if none work
    console.log('⚠️ No backend available, using default configuration');
    return this.getBackendConfig();
  }
}
