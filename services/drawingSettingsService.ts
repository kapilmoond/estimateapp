import { DrawingSettings, getDefaultSettings } from '../components/DrawingSettingsPanel';

const SETTINGS_STORAGE_KEY = 'hsr_drawing_settings';

export class DrawingSettingsService {
  /**
   * Load settings from localStorage or return defaults
   */
  static loadSettings(): DrawingSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.error('Error loading drawing settings:', error);
    }
    
    return getDefaultSettings();
  }

  /**
   * Save settings to localStorage
   */
  static saveSettings(settings: DrawingSettings): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving drawing settings:', error);
    }
  }

  /**
   * Reset settings to defaults
   */
  static resetSettings(): DrawingSettings {
    const defaults = getDefaultSettings();
    this.saveSettings(defaults);
    return defaults;
  }

  /**
   * Merge stored settings with defaults to ensure all properties exist
   */
  private static mergeWithDefaults(stored: any): DrawingSettings {
    const defaults = getDefaultSettings();
    
    return {
      documentFormat: stored.documentFormat || defaults.documentFormat,
      units: stored.units || defaults.units,
      scale: stored.scale || defaults.scale,
      
      layers: {
        construction: {
          name: stored.layers?.construction?.name || defaults.layers.construction.name,
          color: stored.layers?.construction?.color ?? defaults.layers.construction.color,
          lineType: stored.layers?.construction?.lineType || defaults.layers.construction.lineType
        },
        dimensions: {
          name: stored.layers?.dimensions?.name || defaults.layers.dimensions.name,
          color: stored.layers?.dimensions?.color ?? defaults.layers.dimensions.color,
          lineType: stored.layers?.dimensions?.lineType || defaults.layers.dimensions.lineType
        },
        hatching: {
          name: stored.layers?.hatching?.name || defaults.layers.hatching.name,
          color: stored.layers?.hatching?.color ?? defaults.layers.hatching.color,
          lineType: stored.layers?.hatching?.lineType || defaults.layers.hatching.lineType
        },
        text: {
          name: stored.layers?.text?.name || defaults.layers.text.name,
          color: stored.layers?.text?.color ?? defaults.layers.text.color,
          lineType: stored.layers?.text?.lineType || defaults.layers.text.lineType
        }
      },
      
      dimensions: {
        textHeight: stored.dimensions?.textHeight ?? defaults.dimensions.textHeight,
        arrowSize: stored.dimensions?.arrowSize ?? defaults.dimensions.arrowSize,
        tickSize: stored.dimensions?.tickSize ?? defaults.dimensions.tickSize,
        extensionBeyond: stored.dimensions?.extensionBeyond ?? defaults.dimensions.extensionBeyond,
        extensionOffset: stored.dimensions?.extensionOffset ?? defaults.dimensions.extensionOffset,
        textGap: stored.dimensions?.textGap ?? defaults.dimensions.textGap,
        textPosition: stored.dimensions?.textPosition || defaults.dimensions.textPosition,
        textAlignment: stored.dimensions?.textAlignment || defaults.dimensions.textAlignment,
        arrowType: stored.dimensions?.arrowType || defaults.dimensions.arrowType,
        showUnits: stored.dimensions?.showUnits ?? defaults.dimensions.showUnits,
        decimalPlaces: stored.dimensions?.decimalPlaces ?? defaults.dimensions.decimalPlaces,
        roundingValue: stored.dimensions?.roundingValue ?? defaults.dimensions.roundingValue,
        suppressZeros: stored.dimensions?.suppressZeros ?? defaults.dimensions.suppressZeros
      },
      
      text: {
        defaultHeight: stored.text?.defaultHeight ?? defaults.text.defaultHeight,
        fontName: stored.text?.fontName || defaults.text.fontName,
        widthFactor: stored.text?.widthFactor ?? defaults.text.widthFactor,
        obliqueAngle: stored.text?.obliqueAngle ?? defaults.text.obliqueAngle
      },
      
      lines: {
        defaultLineType: stored.lines?.defaultLineType || defaults.lines.defaultLineType,
        defaultLineWeight: stored.lines?.defaultLineWeight ?? defaults.lines.defaultLineWeight
      },
      
      hatching: {
        defaultPattern: stored.hatching?.defaultPattern || defaults.hatching.defaultPattern,
        defaultScale: stored.hatching?.defaultScale ?? defaults.hatching.defaultScale,
        defaultAngle: stored.hatching?.defaultAngle ?? defaults.hatching.defaultAngle
      },
      
      coordinates: {
        originX: stored.coordinates?.originX ?? defaults.coordinates.originX,
        originY: stored.coordinates?.originY ?? defaults.coordinates.originY,
        coordinateSystem: stored.coordinates?.coordinateSystem || defaults.coordinates.coordinateSystem
      },
      
      spacing: {
        dimensionOffset: stored.spacing?.dimensionOffset ?? defaults.spacing.dimensionOffset,
        elementSpacing: stored.spacing?.elementSpacing ?? defaults.spacing.elementSpacing,
        marginSize: stored.spacing?.marginSize ?? defaults.spacing.marginSize
      }
    };
  }

  /**
   * Export settings as JSON file
   */
  static exportSettings(settings: DrawingSettings): void {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'hsr_drawing_settings.json';
    link.click();
    
    URL.revokeObjectURL(link.href);
  }

  /**
   * Import settings from JSON file
   */
  static async importSettings(file: File): Promise<DrawingSettings> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const imported = JSON.parse(content);
          const merged = this.mergeWithDefaults(imported);
          this.saveSettings(merged);
          resolve(merged);
        } catch (error) {
          reject(new Error('Invalid settings file format'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Get settings for specific drawing type (future enhancement)
   */
  static getSettingsForDrawingType(type: 'architectural' | 'mechanical' | 'electrical'): DrawingSettings {
    const base = this.loadSettings();
    
    switch (type) {
      case 'architectural':
        return {
          ...base,
          dimensions: {
            ...base.dimensions,
            textHeight: 300,
            arrowSize: 120,
            showUnits: true
          },
          hatching: {
            ...base.hatching,
            defaultPattern: 'ANSI31'
          }
        };
        
      case 'mechanical':
        return {
          ...base,
          dimensions: {
            ...base.dimensions,
            textHeight: 200,
            arrowSize: 80,
            decimalPlaces: 2
          },
          hatching: {
            ...base.hatching,
            defaultPattern: 'ANSI32'
          }
        };
        
      case 'electrical':
        return {
          ...base,
          dimensions: {
            ...base.dimensions,
            textHeight: 150,
            arrowSize: 60,
            showUnits: false
          },
          lines: {
            ...base.lines,
            defaultLineType: 'DASHED'
          }
        };
        
      default:
        return base;
    }
  }

  /**
   * Validate settings object
   */
  static validateSettings(settings: any): boolean {
    try {
      // Check required top-level properties
      const required = ['documentFormat', 'units', 'scale', 'layers', 'dimensions', 'text', 'lines', 'hatching', 'coordinates', 'spacing'];
      for (const prop of required) {
        if (!(prop in settings)) {
          return false;
        }
      }
      
      // Check layer structure
      const layerTypes = ['construction', 'dimensions', 'hatching', 'text'];
      for (const layerType of layerTypes) {
        if (!settings.layers[layerType] || 
            typeof settings.layers[layerType].name !== 'string' ||
            typeof settings.layers[layerType].color !== 'number') {
          return false;
        }
      }
      
      // Check dimension properties
      if (typeof settings.dimensions.textHeight !== 'number' ||
          typeof settings.dimensions.arrowSize !== 'number') {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}
