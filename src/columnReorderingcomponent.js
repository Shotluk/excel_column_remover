import React, { useState } from 'react';
import { ChevronUp, ChevronDown, GripVertical, RotateCcw } from 'lucide-react';

const ColumnReorderingComponent = ({ 
  headers, 
  onColumnOrderChange, 
  currentOrder = null 
}) => {
  const [columnOrder, setColumnOrder] = useState(
    currentOrder || (headers ? headers.map((_, i) => i) : [])
  );
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Get ordered headers for display
  const orderedHeaders = columnOrder.map(index => headers[index]).filter(Boolean);

  const moveColumn = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    const newOrder = [...columnOrder];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    
    setColumnOrder(newOrder);
    onColumnOrderChange(newOrder);
  };

  const moveUp = (currentIndex) => {
    if (currentIndex > 0) {
      moveColumn(currentIndex, currentIndex - 1);
    }
  };

  const moveDown = (currentIndex) => {
    if (currentIndex < columnOrder.length - 1) {
      moveColumn(currentIndex, currentIndex + 1);
    }
  };

  const resetOrder = () => {
    const originalOrder = headers.map((_, i) => i);
    setColumnOrder(originalOrder);
    onColumnOrderChange(originalOrder);
  };

  const applyPredefinedOrder = (orderType) => {
    let newOrder;
    
    switch (orderType) {
      case 'alphabetical':
        newOrder = headers
          .map((header, index) => ({ header: header || '', index }))
          .sort((a, b) => a.header.localeCompare(b.header))
          .map(item => item.index);
        break;
      case 'yellowFirst':
        const yellowColumns = ['Mobile', 'Payer', 'Claim ID', 'Submission Date', 'Xml FileName', 'Doctor', 'Card No', 'Services'];
        const yellowIndices = [];
        const otherIndices = [];
        
        headers.forEach((header, index) => {
          const isYellow = yellowColumns.some(yellow => 
            header && header.toLowerCase() === yellow.toLowerCase()
          );
          if (isYellow) {
            yellowIndices.push(index);
          } else {
            otherIndices.push(index);
          }
        });
        
        newOrder = [...yellowIndices, ...otherIndices];
        break;
      default:
        newOrder = headers.map((_, i) => i);
    }
    
    setColumnOrder(newOrder);
    onColumnOrderChange(newOrder);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveColumn(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  if (!headers || headers.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Column Order
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => applyPredefinedOrder('alphabetical')}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            A-Z
          </button>
          <button
            onClick={() => applyPredefinedOrder('yellowFirst')}
            className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
          >
            Priority First
          </button>
          <button
            onClick={resetOrder}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {orderedHeaders.map((header, displayIndex) => {
          const originalIndex = columnOrder[displayIndex];
          const isYellow = ['mobile', 'payer', 'claim id', 'submission date', 'xml filename', 'doctor', 'card no', 'services']
            .includes((header || '').toLowerCase());

          return (
            <div
              key={`${originalIndex}-${displayIndex}`}
              draggable
              onDragStart={(e) => handleDragStart(e, displayIndex)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, displayIndex)}
              className={`flex items-center gap-3 p-3 bg-white rounded border transition-all cursor-move ${
                draggedIndex === displayIndex ? 'opacity-50 scale-95' : 'hover:shadow-sm'
              }`}
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
              
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium truncate block ${
                  isYellow ? 'text-yellow-600' : 'text-gray-700'
                }`}>
                  {header}
                </span>
                <span className="text-xs text-gray-500">
                  Position {displayIndex + 1}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveUp(displayIndex)}
                  disabled={displayIndex === 0}
                  className={`p-1 rounded ${
                    displayIndex === 0 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveDown(displayIndex)}
                  disabled={displayIndex === orderedHeaders.length - 1}
                  className={`p-1 rounded ${
                    displayIndex === orderedHeaders.length - 1 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-sm text-gray-500">
        <span className="font-medium">Tip:</span> Drag columns to reorder, or use the arrow buttons. 
        Yellow columns are priority fields.
      </div>
    </div>
  );
};

export default ColumnReorderingComponent;