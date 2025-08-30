import React, { useState, useEffect } from 'react';

export interface DrawingSettings {
  // Document Settings
  documentFormat: 'R2010' | 'R2014' | 'R2018';
  units: 'mm' | 'm' | 'inches' | 'feet';
  scale: number;
  
  // Layer Settings
  layers: {
    construction: { name: string; color: number; lineType: string };
    dimensions: { name: string; color: number; lineType: string };
    hatching: { name: string; color: number; lineType: string };
    text: { name: string; color: number; lineType: string };
  };
  
  // Dimension Settings
  dimensions: {
    textHeight: number;
    arrowSize: number;
    tickSize: number;
    extensionBeyond: number;
    extensionOffset: number;
    textGap: number;
    textPosition: 'above' | 'below' | 'center';
    textAlignment: 'left' | 'center' | 'right';
    arrowType: 'arrows' | 'ticks' | 'auto';
    showUnits: boolean;
    decimalPlaces: number;
    roundingValue: number;
    suppressZeros: boolean;
  };
  
  // Text Settings
  text: {
    defaultHeight: number;
    fontName: string;
    widthFactor: number;
    obliqueAngle: number;
  };
  
  // Line Settings
  lines: {
    defaultLineType: string;
    defaultLineWeight: number;
  };
  
  // Hatching Settings
  hatching: {
    defaultPattern: string;
    defaultScale: number;
    defaultAngle: number;
  };
  
  // Coordinate Settings
  coordinates: {
    originX: number;
    originY: number;
    coordinateSystem: 'bottom-left' | 'top-left' | 'center';
  };
  
  // Spacing Settings
  spacing: {
    dimensionOffset: number;
    elementSpacing: number;
    marginSize: number;
  };
}

interface DrawingSettingsPanelProps {
  settings: DrawingSettings;
  onSettingsChange: (settings: DrawingSettings) => void;
  onClose: () => void;
}

export const DrawingSettingsPanel: React.FC<DrawingSettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onClose
}) => {
  const [localSettings, setLocalSettings] = useState<DrawingSettings>(settings);
  const [activeTab, setActiveTab] = useState<'document' | 'layers' | 'dimensions' | 'text' | 'advanced'>('document');

  const updateSettings = (section: keyof DrawingSettings, field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateLayerSettings = (layerType: keyof DrawingSettings['layers'], field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      layers: {
        ...prev.layers,
        [layerType]: {
          ...prev.layers[layerType],
          [field]: value
        }
      }
    }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(getDefaultSettings());
  };

  const renderDocumentTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Document Settings</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DXF Format
          </label>
          <select
            value={localSettings.documentFormat}
            onChange={(e) => updateSettings('documentFormat', '', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="R2010">AutoCAD 2010 (R2010)</option>
            <option value="R2014">AutoCAD 2014 (R2014)</option>
            <option value="R2018">AutoCAD 2018 (R2018)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Units
          </label>
          <select
            value={localSettings.units}
            onChange={(e) => updateSettings('units', '', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="mm">Millimeters (mm)</option>
            <option value="m">Meters (m)</option>
            <option value="inches">Inches</option>
            <option value="feet">Feet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Drawing Scale (1:X)
          </label>
          <input
            type="number"
            value={localSettings.scale}
            onChange={(e) => updateSettings('scale', '', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="1"
            max="1000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Coordinate System
          </label>
          <select
            value={localSettings.coordinates.coordinateSystem}
            onChange={(e) => updateSettings('coordinates', 'coordinateSystem', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="bottom-left">Bottom-Left Origin</option>
            <option value="top-left">Top-Left Origin</option>
            <option value="center">Center Origin</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Origin X Offset
          </label>
          <input
            type="number"
            value={localSettings.coordinates.originX}
            onChange={(e) => updateSettings('coordinates', 'originX', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Origin Y Offset
          </label>
          <input
            type="number"
            value={localSettings.coordinates.originY}
            onChange={(e) => updateSettings('coordinates', 'originY', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
    </div>
  );

  const renderLayersTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 sticky top-0 bg-white py-2 border-b border-gray-200">Layer Settings</h3>

      <div className="space-y-4">
        {Object.entries(localSettings.layers).map(([layerType, layer]) => (
          <div key={layerType} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <h4 className="font-medium text-gray-900 mb-4 capitalize flex items-center">
              <span className="w-4 h-4 rounded mr-2" style={{backgroundColor: `hsl(${layer.color * 360 / 255}, 70%, 50%)`}}></span>
              {layerType} Layer
            </h4>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Layer Name
              </label>
              <input
                type="text"
                value={layer.name}
                onChange={(e) => updateLayerSettings(layerType as keyof DrawingSettings['layers'], 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color (0-255)
              </label>
              <input
                type="number"
                value={layer.color}
                onChange={(e) => updateLayerSettings(layerType as keyof DrawingSettings['layers'], 'color', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
                max="255"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Line Type
              </label>
              <select
                value={layer.lineType}
                onChange={(e) => updateLayerSettings(layerType as keyof DrawingSettings['layers'], 'lineType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="CONTINUOUS">Continuous</option>
                <option value="DASHED">Dashed</option>
                <option value="DOTTED">Dotted</option>
                <option value="DASHDOT">Dash-Dot</option>
              </select>
            </div>
          </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDimensionsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 sticky top-0 bg-white py-2 border-b border-gray-200">Dimension Settings</h3>

      <div className="space-y-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">Text and Arrow Settings</h4>
          <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text Height
          </label>
          <input
            type="number"
            value={localSettings.dimensions.textHeight}
            onChange={(e) => updateSettings('dimensions', 'textHeight', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="10"
            max="1000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Arrow Size
          </label>
          <input
            type="number"
            value={localSettings.dimensions.arrowSize}
            onChange={(e) => updateSettings('dimensions', 'arrowSize', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="5"
            max="500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tick Size (Fallback)
          </label>
          <input
            type="number"
            value={localSettings.dimensions.tickSize}
            onChange={(e) => updateSettings('dimensions', 'tickSize', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="5"
            max="500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Arrow Type
          </label>
          <select
            value={localSettings.dimensions.arrowType}
            onChange={(e) => updateSettings('dimensions', 'arrowType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="auto">Auto (Arrows with Tick Fallback)</option>
            <option value="arrows">Force Arrows</option>
            <option value="ticks">Force Tick Marks</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Extension Beyond Line
          </label>
          <input
            type="number"
            value={localSettings.dimensions.extensionBeyond}
            onChange={(e) => updateSettings('dimensions', 'extensionBeyond', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            max="200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Extension Line Offset
          </label>
          <input
            type="number"
            value={localSettings.dimensions.extensionOffset}
            onChange={(e) => updateSettings('dimensions', 'extensionOffset', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            max="100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text Gap
          </label>
          <input
            type="number"
            value={localSettings.dimensions.textGap}
            onChange={(e) => updateSettings('dimensions', 'textGap', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            max="100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text Position
          </label>
          <select
            value={localSettings.dimensions.textPosition}
            onChange={(e) => updateSettings('dimensions', 'textPosition', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="above">Above Line</option>
            <option value="below">Below Line</option>
            <option value="center">Center on Line</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text Alignment
          </label>
          <select
            value={localSettings.dimensions.textAlignment}
            onChange={(e) => updateSettings('dimensions', 'textAlignment', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Decimal Places
          </label>
          <input
            type="number"
            value={localSettings.dimensions.decimalPlaces}
            onChange={(e) => updateSettings('dimensions', 'decimalPlaces', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            max="8"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rounding Value
          </label>
          <input
            type="number"
            value={localSettings.dimensions.roundingValue}
            onChange={(e) => updateSettings('dimensions', 'roundingValue', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            step="0.1"
          />
        </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dimension Line Offset
            </label>
            <input
              type="number"
              value={localSettings.spacing.dimensionOffset}
              onChange={(e) => updateSettings('spacing', 'dimensionOffset', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="50"
              max="1000"
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Extension Line Settings</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Extension Beyond Line
            </label>
            <input
              type="number"
              value={localSettings.dimensions.extensionBeyond}
              onChange={(e) => updateSettings('dimensions', 'extensionBeyond', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              max="200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Extension Line Offset
            </label>
            <input
              type="number"
              value={localSettings.dimensions.extensionOffset}
              onChange={(e) => updateSettings('dimensions', 'extensionOffset', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Gap
            </label>
            <input
              type="number"
              value={localSettings.dimensions.textGap}
              onChange={(e) => updateSettings('dimensions', 'textGap', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Number Formatting</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Decimal Places
            </label>
            <input
              type="number"
              value={localSettings.dimensions.decimalPlaces}
              onChange={(e) => updateSettings('dimensions', 'decimalPlaces', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              max="8"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rounding Value
            </label>
            <input
              type="number"
              value={localSettings.dimensions.roundingValue}
              onChange={(e) => updateSettings('dimensions', 'roundingValue', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              step="0.1"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.dimensions.showUnits}
              onChange={(e) => updateSettings('dimensions', 'showUnits', e.target.checked)}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Show Units in Dimension Text</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={localSettings.dimensions.suppressZeros}
              onChange={(e) => updateSettings('dimensions', 'suppressZeros', e.target.checked)}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Suppress Leading/Trailing Zeros</span>
          </label>
        </div>
      </div>
    </div>
    </div>
  );

  const renderTextTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Text Settings</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Text Height
          </label>
          <input
            type="number"
            value={localSettings.text.defaultHeight}
            onChange={(e) => updateSettings('text', 'defaultHeight', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="10"
            max="1000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Font Name
          </label>
          <select
            value={localSettings.text.fontName}
            onChange={(e) => updateSettings('text', 'fontName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="arial.ttf">Arial</option>
            <option value="times.ttf">Times New Roman</option>
            <option value="calibri.ttf">Calibri</option>
            <option value="helvetica.ttf">Helvetica</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Width Factor
          </label>
          <input
            type="number"
            value={localSettings.text.widthFactor}
            onChange={(e) => updateSettings('text', 'widthFactor', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0.1"
            max="3.0"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Oblique Angle (degrees)
          </label>
          <input
            type="number"
            value={localSettings.text.obliqueAngle}
            onChange={(e) => updateSettings('text', 'obliqueAngle', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="-85"
            max="85"
          />
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Line Settings</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Line Type
            </label>
            <select
              value={localSettings.lines.defaultLineType}
              onChange={(e) => updateSettings('lines', 'defaultLineType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="CONTINUOUS">Continuous</option>
              <option value="DASHED">Dashed</option>
              <option value="DOTTED">Dotted</option>
              <option value="DASHDOT">Dash-Dot</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Line Weight
            </label>
            <input
              type="number"
              value={localSettings.lines.defaultLineWeight}
              onChange={(e) => updateSettings('lines', 'defaultLineWeight', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Hatching Settings</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Pattern
            </label>
            <select
              value={localSettings.hatching.defaultPattern}
              onChange={(e) => updateSettings('hatching', 'defaultPattern', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ANSI31">ANSI31 (Concrete)</option>
              <option value="ANSI32">ANSI32 (Steel)</option>
              <option value="ANSI33">ANSI33 (Bronze)</option>
              <option value="ANSI34">ANSI34 (Plastic)</option>
              <option value="ANSI35">ANSI35 (Fire Brick)</option>
              <option value="ANSI36">ANSI36 (Marble)</option>
              <option value="ANSI37">ANSI37 (Lead)</option>
              <option value="ANSI38">ANSI38 (Aluminum)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Scale
            </label>
            <input
              type="number"
              value={localSettings.hatching.defaultScale}
              onChange={(e) => updateSettings('hatching', 'defaultScale', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0.1"
              max="10.0"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Angle (degrees)
            </label>
            <input
              type="number"
              value={localSettings.hatching.defaultAngle}
              onChange={(e) => updateSettings('hatching', 'defaultAngle', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              max="360"
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Spacing Settings</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Element Spacing
            </label>
            <input
              type="number"
              value={localSettings.spacing.elementSpacing}
              onChange={(e) => updateSettings('spacing', 'elementSpacing', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="10"
              max="1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Drawing Margin
            </label>
            <input
              type="number"
              value={localSettings.spacing.marginSize}
              onChange={(e) => updateSettings('spacing', 'marginSize', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              max="1000"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'document', label: 'Document', icon: '📄' },
    { id: 'layers', label: 'Layers', icon: '📋' },
    { id: 'dimensions', label: 'Dimensions', icon: '📐' },
    { id: 'text', label: 'Text', icon: '📝' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[95vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              🎛️ Drawing Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab Navigation - Fixed */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {activeTab === 'document' && renderDocumentTab()}
            {activeTab === 'layers' && renderLayersTab()}
            {activeTab === 'dimensions' && renderDimensionsTab()}
            {activeTab === 'text' && renderTextTab()}
            {activeTab === 'advanced' && renderAdvancedTab()}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              🔄 Reset to Defaults
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
              >
                💾 Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Default settings function
export const getDefaultSettings = (): DrawingSettings => ({
  documentFormat: 'R2010',
  units: 'mm',
  scale: 1,

  layers: {
    construction: { name: 'CONSTRUCTION', color: 7, lineType: 'CONTINUOUS' },
    dimensions: { name: 'DIMENSIONS', color: 1, lineType: 'CONTINUOUS' },
    hatching: { name: 'HATCHING', color: 2, lineType: 'CONTINUOUS' },
    text: { name: 'TEXT', color: 3, lineType: 'CONTINUOUS' }
  },

  dimensions: {
    textHeight: 250,
    arrowSize: 100,
    tickSize: 50,
    extensionBeyond: 50,
    extensionOffset: 30,
    textGap: 30,
    textPosition: 'above',
    textAlignment: 'center',
    arrowType: 'auto',
    showUnits: false,
    decimalPlaces: 0,
    roundingValue: 0,
    suppressZeros: false
  },

  text: {
    defaultHeight: 200,
    fontName: 'arial.ttf',
    widthFactor: 1.0,
    obliqueAngle: 0
  },

  lines: {
    defaultLineType: 'CONTINUOUS',
    defaultLineWeight: 0
  },

  hatching: {
    defaultPattern: 'ANSI31',
    defaultScale: 1.0,
    defaultAngle: 45
  },

  coordinates: {
    originX: 0,
    originY: 0,
    coordinateSystem: 'bottom-left'
  },

  spacing: {
    dimensionOffset: 300,
    elementSpacing: 100,
    marginSize: 200
  }
});
