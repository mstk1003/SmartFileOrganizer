
import React from 'react';
import { GripVertical, X, Calendar, Hash, Type } from 'lucide-react';
import { RulePart } from '../types';

interface RuleChipProps {
  part: RulePart;
  index: number;
  isDragging: boolean;
  onRemove: (id: string) => void;
  onUpdate: (id: string, value: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnter: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

const RuleChip: React.FC<RuleChipProps> = ({ 
  part, 
  index, 
  isDragging,
  onRemove, 
  onUpdate,
  onDragStart,
  onDragEnter,
  onDragEnd
}) => {
  const getIcon = () => {
    switch (part.type) {
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'sequence': return <Hash className="w-4 h-4" />;
      case 'string': return <Type className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (part.type) {
      case 'date': return '日付 (YYYYMMDD)';
      case 'sequence': return '連番 (01, 001...)';
      case 'string': return null;
    }
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`
        flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-40 scale-95 border-blue-400 bg-blue-50' : 'opacity-100 scale-100 border-slate-200 hover:border-blue-300'}
      `}
    >
      <div className="text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className={`flex items-center gap-2 px-2 py-1 rounded text-slate-700 font-medium ${part.type !== 'string' ? 'bg-slate-100' : ''}`}>
        {getIcon()}
        {getLabel() && <span className="text-sm">{getLabel()}</span>}
      </div>

      {part.type === 'string' && (
        <input
          type="text"
          value={part.value || ''}
          onChange={(e) => onUpdate(part.id, e.target.value)}
          placeholder="文字列を入力..."
          className="flex-1 px-3 py-1 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      )}

      <div className="flex-1" />

      <button
        onClick={() => onRemove(part.id)}
        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
        title="削除"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default RuleChip;
