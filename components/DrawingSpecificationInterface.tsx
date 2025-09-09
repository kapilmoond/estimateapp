import React, { useState } from 'react';

// Drawing specification types
export interface DrawingElement {
  id: string;
  name?: string; // logical, human-meaningful name provided by LLM for regeneration reference
  type: 'line' | 'circle' | 'arc' | 'rectangle' | 'polyline';
  coordinates: number[][];
  properties: {
    layer: string;
    color?: number;
    lineType?: string;
  };
}

export interface DimensionElement {
  id: string;
  name?: string; // logical name for this dimension
  type: 'linear' | 'aligned' | 'radial' | 'angular';
  points: number[][];
  properties: {
    layer: string;
    textHeight: number;
    arrowSize: number;
    position: number[];
    text?: string;
  };
}

export interface DrawingSpecification {
  title: string;
  scale: number;
  units: 'mm' | 'm' | 'inches';
  elements: DrawingElement[];
  dimensions: DimensionElement[];
  layers: {
    name: string;
    color: number;
    lineType?: string;
  }[];
}

interface DrawingSpecificationInterfaceProps {
  onSpecificationComplete: (spec: DrawingSpecification) => void;
  onCancel: () => void;
}

export const DrawingSpecificationInterface: React.FC<DrawingSpecificationInterfaceProps> = ({
  onSpecificationComplete,
  onCancel
}) => {
  const [specification, setSpecification] = useState<DrawingSpecification>({
    title: '',
    scale: 1,
    units: 'mm',
    elements: [],
    dimensions: [],
    layers: [
      { name: 'CONSTRUCTION', color: 7 },
      { name: 'DIMENSIONS', color: 1 },
      { name: 'HATCHING', color: 2 }
    ]
  });

  const [currentStep, setCurrentStep] = useState<'basic' | 'elements' | 'dimensions' | 'review'>('basic');
  const [currentElement, setCurrentElement] = useState<Partial<DrawingElement>>({});
  const [currentDimension, setCurrentDimension] = useState<Partial<DimensionElement>>({});

  const addElement = () => {
    if (currentElement.type && currentElement.coordinates) {
      const newElement: DrawingElement = {
        id: `element_${Date.now()}`,
        type: currentElement.type,
        coordinates: currentElement.coordinates,
        properties: {
          layer: currentElement.properties?.layer || 'CONSTRUCTION',
          color: currentElement.properties?.color || 7
        }
      };
      
      setSpecification(prev => ({
        ...prev,
        elements: [...prev.elements, newElement]
      }));
      
      setCurrentElement({});
    }
  };

  const addDimension = () => {
    if (currentDimension.type && currentDimension.points) {
      const newDimension: DimensionElement = {
        id: `dimension_${Date.now()}`,
        type: currentDimension.type,
        points: currentDimension.points,
        properties: {
          layer: 'DIMENSIONS',
          textHeight: currentDimension.properties?.textHeight || 100,
          arrowSize: currentDimension.properties?.arrowSize || 50,
          position: currentDimension.properties?.position || [0, -200]
        }
      };
      
      setSpecification(prev => ({
        ...prev,
        dimensions: [...prev.dimensions, newDimension]
      }));
      
      setCurrentDimension({});
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Basic Drawing Information</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Drawing Title
        </label>
        <input
          type="text"
          value={specification.title}
          onChange={(e) => setSpecification(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Enter drawing title"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scale
          </label>
          <select
            value={specification.scale}
            onChange={(e) => setSpecification(prev => ({ ...prev, scale: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value={1}>1:1</option>
            <option value={10}>1:10</option>
            <option value={50}>1:50</option>
            <option value={100}>1:100</option>
            <option value={200}>1:200</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Units
          </label>
          <select
            value={specification.units}
            onChange={(e) => setSpecification(prev => ({ ...prev, units: e.target.value as 'mm' | 'm' | 'inches' }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="mm">Millimeters (mm)</option>
            <option value="m">Meters (m)</option>
            <option value="inches">Inches</option>
          </select>
        </div>
      </div>

      <button
        onClick={() => setCurrentStep('elements')}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
      >
        Next: Add Elements
      </button>
    </div>
  );

  const renderElementsStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Drawing Elements</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-3">Add New Element</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Element Type
            </label>
            <select
              value={currentElement.type || ''}
              onChange={(e) => setCurrentElement(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select type</option>
              <option value="line">Line</option>
              <option value="circle">Circle</option>
              <option value="arc">Arc</option>
              <option value="rectangle">Rectangle</option>
              <option value="polyline">Polyline</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Layer
            </label>
            <select
              value={currentElement.properties?.layer || 'CONSTRUCTION'}
              onChange={(e) => setCurrentElement(prev => ({
                ...prev,
                properties: { ...prev.properties, layer: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {specification.layers.map(layer => (
                <option key={layer.name} value={layer.name}>{layer.name}</option>
              ))}
            </select>
          </div>
        </div>

        {currentElement.type === 'line' && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <input
              type="number"
              placeholder="Start X"
              onChange={(e) => {
                const coords = currentElement.coordinates || [[0, 0], [0, 0]];
                coords[0][0] = Number(e.target.value);
                setCurrentElement(prev => ({ ...prev, coordinates: coords }));
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Start Y"
              onChange={(e) => {
                const coords = currentElement.coordinates || [[0, 0], [0, 0]];
                coords[0][1] = Number(e.target.value);
                setCurrentElement(prev => ({ ...prev, coordinates: coords }));
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="End X"
              onChange={(e) => {
                const coords = currentElement.coordinates || [[0, 0], [0, 0]];
                coords[1][0] = Number(e.target.value);
                setCurrentElement(prev => ({ ...prev, coordinates: coords }));
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="End Y"
              onChange={(e) => {
                const coords = currentElement.coordinates || [[0, 0], [0, 0]];
                coords[1][1] = Number(e.target.value);
                setCurrentElement(prev => ({ ...prev, coordinates: coords }));
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        )}

        <button
          onClick={addElement}
          disabled={!currentElement.type || !currentElement.coordinates}
          className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          Add Element
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Added Elements ({specification.elements.length})</h4>
        {specification.elements.map((element, index) => (
          <div key={element.id} className="bg-white p-2 border rounded text-sm">
            {index + 1}. {element.type} on {element.properties.layer}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setCurrentStep('basic')}
          className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('dimensions')}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Next: Add Dimensions
        </button>
      </div>
    </div>
  );

  const renderDimensionsStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Dimensions</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-3">Add New Dimension</h4>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dimension Type
            </label>
            <select
              value={currentDimension.type || ''}
              onChange={(e) => setCurrentDimension(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select type</option>
              <option value="linear">Linear</option>
              <option value="aligned">Aligned</option>
              <option value="radial">Radial</option>
              <option value="angular">Angular</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Height
            </label>
            <input
              type="number"
              value={currentDimension.properties?.textHeight || 100}
              onChange={(e) => setCurrentDimension(prev => ({
                ...prev,
                properties: { ...prev.properties, textHeight: Number(e.target.value) }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <button
          onClick={addDimension}
          disabled={!currentDimension.type}
          className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          Add Dimension
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setCurrentStep('elements')}
          className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('review')}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Review & Generate
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Review Drawing Specification</h3>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Drawing Info</h4>
        <p>Title: {specification.title}</p>
        <p>Scale: 1:{specification.scale}</p>
        <p>Units: {specification.units}</p>
        <p>Elements: {specification.elements.length}</p>
        <p>Dimensions: {specification.dimensions.length}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setCurrentStep('dimensions')}
          className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
        >
          Back
        </button>
        <button
          onClick={() => onSpecificationComplete(specification)}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
        >
          Generate Drawing
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-lg">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Professional Drawing Specification
        </h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className={currentStep === 'basic' ? 'font-semibold text-blue-600' : ''}>1. Basic Info</span>
          <span>→</span>
          <span className={currentStep === 'elements' ? 'font-semibold text-blue-600' : ''}>2. Elements</span>
          <span>→</span>
          <span className={currentStep === 'dimensions' ? 'font-semibold text-blue-600' : ''}>3. Dimensions</span>
          <span>→</span>
          <span className={currentStep === 'review' ? 'font-semibold text-blue-600' : ''}>4. Review</span>
        </div>
      </div>

      {currentStep === 'basic' && renderBasicInfo()}
      {currentStep === 'elements' && renderElementsStep()}
      {currentStep === 'dimensions' && renderDimensionsStep()}
      {currentStep === 'review' && renderReviewStep()}

      <div className="mt-6 pt-4 border-t">
        <button
          onClick={onCancel}
          className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
