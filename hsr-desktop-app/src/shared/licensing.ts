import CryptoJS from 'crypto-js';
import { machineId } from 'node-machine-id';

export interface LicenseInfo {
  licenseKey: string;
  machineId: string;
  expiryDate: Date;
  features: string[];
  isValid: boolean;
  daysRemaining: number;
}

export interface LicenseValidationResult {
  isValid: boolean;
  error?: string;
  licenseInfo?: LicenseInfo;
}

export class LicensingService {
  private static readonly SECRET_KEY = 'HSR_CONSTRUCTION_ESTIMATOR_2024_SECURE_KEY_V1';
  private static readonly LICENSE_STORAGE_KEY = 'hsr_license_data';
  private static readonly TRIAL_STORAGE_KEY = 'hsr_trial_data';
  private static readonly TRIAL_DAYS = 7;

  /**
   * Generate a license key for a specific machine
   */
  static generateLicenseKey(
    machineId: string, 
    expiryDate: Date, 
    features: string[] = ['full']
  ): string {
    const licenseData = {
      machineId,
      expiryDate: expiryDate.toISOString(),
      features,
      generated: new Date().toISOString()
    };

    const dataString = JSON.stringify(licenseData);
    const encrypted = CryptoJS.AES.encrypt(dataString, this.SECRET_KEY).toString();
    
    // Create a formatted license key
    const base64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encrypted));
    return this.formatLicenseKey(base64);
  }

  /**
   * Validate a license key
   */
  static async validateLicense(licenseKey: string): Promise<LicenseValidationResult> {
    try {
      // Get current machine ID
      const currentMachineId = await machineId();
      
      // Parse and decrypt license
      const cleanKey = licenseKey.replace(/-/g, '');
      const encrypted = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(cleanKey));
      const decrypted = CryptoJS.AES.decrypt(encrypted, this.SECRET_KEY);
      const licenseData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

      // Validate machine ID
      if (licenseData.machineId !== currentMachineId) {
        return {
          isValid: false,
          error: 'License is not valid for this machine'
        };
      }

      // Validate expiry
      const expiryDate = new Date(licenseData.expiryDate);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (now > expiryDate) {
        return {
          isValid: false,
          error: 'License has expired'
        };
      }

      const licenseInfo: LicenseInfo = {
        licenseKey,
        machineId: currentMachineId,
        expiryDate,
        features: licenseData.features || ['full'],
        isValid: true,
        daysRemaining
      };

      return {
        isValid: true,
        licenseInfo
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid license key format'
      };
    }
  }

  /**
   * Start trial period
   */
  static startTrial(): boolean {
    try {
      const existingTrial = localStorage.getItem(this.TRIAL_STORAGE_KEY);
      if (existingTrial) {
        return false; // Trial already used
      }

      const trialData = {
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + this.TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      };

      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(trialData), this.SECRET_KEY).toString();
      localStorage.setItem(this.TRIAL_STORAGE_KEY, encrypted);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check trial status
   */
  static checkTrialStatus(): { isValid: boolean; daysRemaining: number; error?: string } {
    try {
      const trialData = localStorage.getItem(this.TRIAL_STORAGE_KEY);
      if (!trialData) {
        return { isValid: false, daysRemaining: 0, error: 'No trial found' };
      }

      const decrypted = CryptoJS.AES.decrypt(trialData, this.SECRET_KEY);
      const trial = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
      
      const expiryDate = new Date(trial.expiryDate);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        isValid: now <= expiryDate,
        daysRemaining: Math.max(0, daysRemaining)
      };
    } catch (error) {
      return { isValid: false, daysRemaining: 0, error: 'Invalid trial data' };
    }
  }

  /**
   * Save license to storage
   */
  static saveLicense(licenseKey: string): void {
    const encrypted = CryptoJS.AES.encrypt(licenseKey, this.SECRET_KEY).toString();
    localStorage.setItem(this.LICENSE_STORAGE_KEY, encrypted);
  }

  /**
   * Load license from storage
   */
  static loadLicense(): string | null {
    try {
      const encrypted = localStorage.getItem(this.LICENSE_STORAGE_KEY);
      if (!encrypted) return null;

      const decrypted = CryptoJS.AES.decrypt(encrypted, this.SECRET_KEY);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current machine ID
   */
  static async getMachineId(): Promise<string> {
    return await machineId();
  }

  /**
   * Format license key with dashes
   */
  private static formatLicenseKey(key: string): string {
    return key.match(/.{1,4}/g)?.join('-') || key;
  }

  /**
   * Check if app is licensed
   */
  static async isAppLicensed(): Promise<{ licensed: boolean; trial: boolean; daysRemaining: number; error?: string }> {
    // Check for valid license first
    const savedLicense = this.loadLicense();
    if (savedLicense) {
      const validation = await this.validateLicense(savedLicense);
      if (validation.isValid && validation.licenseInfo) {
        return {
          licensed: true,
          trial: false,
          daysRemaining: validation.licenseInfo.daysRemaining
        };
      }
    }

    // Check trial status
    const trialStatus = this.checkTrialStatus();
    if (trialStatus.isValid) {
      return {
        licensed: true,
        trial: true,
        daysRemaining: trialStatus.daysRemaining
      };
    }

    return {
      licensed: false,
      trial: false,
      daysRemaining: 0,
      error: trialStatus.error
    };
  }
}
