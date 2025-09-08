import React, { useMemo, useState } from 'react';
import { DrawingService, ProjectDrawing } from '../services/drawingService';
import { ProjectService } from '../services/projectService';

interface DrawingContextSelectorProps {
  drawings: ProjectDrawing[];
  onChange: () => void; // reload saved drawings from parent
}

export const DrawingContextSelector: React.FC<DrawingContextSelectorProps> = ({ drawings, onChange }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const projectId = useMemo(() => ProjectService.getCurrentProjectId() || 'default', []);

  const includedCount = drawings.filter(d => d.includeInContext !== false).length;

  const toggleInclude = (drawing: ProjectDrawing) => {
    const updated: ProjectDrawing = { ...drawing, includeInContext: drawing.includeInContext === false ? true : false };
    DrawingService.updateDrawing(updated);
    onChange();
  };

  const toggleAll = (include: boolean) => {
    drawings.forEach(d => {
      if ((d.includeInContext !== false) !== include) {
        const updated: ProjectDrawing = { ...d, includeInContext: include };
        DrawingService.updateDrawing(updated);
      }
    });
    onChange();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this drawing?')) return;
    DrawingService.deleteDrawing(id);
    onChange();
  };

  if (drawings.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className="text-sm text-gray-700 hover:text-gray-900"
            title={isExpanded ? 'Hide drawings selector' : 'Show drawings selector'}
          >
            {isExpanded ? '▾' : '▸'} Drawings Context Selector
          </button>
          <span className="text-xs text-gray-500">({includedCount} in context of {drawings.length})</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => toggleAll(true)}
            className="px-2 py-1 rounded bg-green-100 text-green-800 hover:bg-green-200"
            title="Include all drawings in context"
          >
            Include All
          </button>
          <button
            onClick={() => toggleAll(false)}
            className="px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Exclude all drawings from context"
          >
            Exclude All
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 max-h-48 overflow-y-auto divide-y divide-gray-200">
          {drawings
            .slice()
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(d => (
            <div key={d.id} className="py-2 flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.includeInContext !== false}
                  onChange={() => toggleInclude(d)}
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 truncate max-w-[36ch]" title={d.title}>{d.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(d.timestamp).toLocaleString()}
                  </div>
                </div>
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(d.id)}
                  className="text-red-600 hover:text-red-700 text-xs"
                  title="Delete drawing"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="mt-2 text-xs text-gray-600">
          Checked drawings will be included in context for: Discussion, Design, and Drawing prompts.
        </div>
      )}
    </div>
  );
};

