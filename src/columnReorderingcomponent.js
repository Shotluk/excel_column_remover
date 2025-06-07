// columnReorderingComponent.js - Updated with Click-to-Move and Dropdown functionality
import React, { useState } from 'react';
import { RotateCcw, X, ArrowRight } from 'lucide-react';

const ColumnReorderingComponent = ({ 
  headers, 
  onColumnOrderChange, 
  currentOrder = null 
}) => {
  const [columnOrder, setColumnOrder] = useState(
    currentOrder || (headers ? headers.map((_, i) => i) : [])
  );
  const [selectedColumnForMove, setSelectedColumnForMove] = useState(null);
  const [moveMode, setMoveMode] = useState(false);

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

  const handleColumnClick = (displayIndex) => {
    if (!moveMode) {
      // Start move mode
      setSelectedColumnForMove(displayIndex);
      setMoveMode(true);
    } else if (selectedColumnForMove === displayIndex) {
      // Cancel move (clicked same column)
      cancelMove();
    }
    // If in move mode and clicked different column, do nothing (let insertion points handle it)
  };

  const handleInsertionClick = (targetIndex) => {
    if (moveMode && selectedColumnForMove !== null) {
      moveColumn(selectedColumnForMove, targetIndex);
      cancelMove();
    }
  };

  const handleDropdownChange = (displayIndex, newPosition) => {
    const targetIndex = parseInt(newPosition) - 1; // Convert to 0-based index
    if (targetIndex !== displayIndex && targetIndex >= 0 && targetIndex < orderedHeaders.length) {
      moveColumn(displayIndex, targetIndex);
    }
  };

  const cancelMove = () => {
    setSelectedColumnForMove(null);
    setMoveMode(false);
  };

  const resetOrder = () => {
    const originalOrder = headers.map((_, i) => i);
    setColumnOrder(originalOrder);
    onColumnOrderChange(originalOrder);
    cancelMove(); // Cancel any active move
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
    cancelMove(); // Cancel any active move
  };

  if (!headers || headers.length === 0) {
    return null;
  }

  const selectedColumnName = selectedColumnForMove !== null ? orderedHeaders[selectedColumnForMove] : null;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Column Order
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => applyPredefinedOrder('alphabetical')}
            disabled={moveMode}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            A-Z
          </button>
          <button
            onClick={() => applyPredefinedOrder('yellowFirst')}
            disabled={moveMode}
            className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Priority First
          </button>
          <button
            onClick={resetOrder}
            disabled={moveMode}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Move mode instructions */}
      {moveMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Moving "{selectedColumnName}" - Click where to place it
              </span>
            </div>
            <button
              onClick={cancelMove}
              className="p-1 hover:bg-blue-100 rounded text-blue-600"
              title="Cancel move"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {/* Insertion point at the beginning */}
        {moveMode && selectedColumnForMove !== 0 && (
          <div 
            onClick={() => handleInsertionClick(0)}
            className="h-2 flex items-center justify-center cursor-pointer group"
          >
            <div className="w-full h-0.5 bg-blue-300 group-hover:bg-blue-500 group-hover:h-1 transition-all rounded"></div>
          </div>
        )}

        {orderedHeaders.map((header, displayIndex) => {
          const originalIndex = columnOrder[displayIndex];
          const isYellow = ['mobile', 'payer', 'claim id', 'submission date', 'xml filename', 'doctor', 'card no', 'services']
            .includes((header || '').toLowerCase());
          const isSelected = moveMode && selectedColumnForMove === displayIndex;
          const isInMoveMode = moveMode && selectedColumnForMove !== null;

          return (
            <React.Fragment key={`${originalIndex}-${displayIndex}`}>
              <div
                onClick={() => handleColumnClick(displayIndex)}
                className={`flex items-center gap-3 p-3 bg-white rounded border transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md cursor-pointer' 
                    : isInMoveMode 
                      ? 'border-gray-200 opacity-60 cursor-default'
                      : 'border-gray-200 cursor-pointer hover:shadow-sm hover:border-gray-300'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate block ${
                      isYellow ? 'text-yellow-600' : 'text-gray-700'
                    } ${isSelected ? 'text-blue-700' : ''}`}>
                      {header}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded-full font-medium">
                        Moving
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    Position {displayIndex + 1}
                  </span>
                </div>

                {/* Dropdown for position selection */}
                {!isInMoveMode && (
                  <div className="flex items-center gap-2">
                    <select
                      value={displayIndex + 1}
                      onChange={(e) => handleDropdownChange(displayIndex, e.target.value)}
                      onClick={(e) => e.stopPropagation()} // Prevent triggering column click
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      title="Change position"
                    >
                      {orderedHeaders.map((_, index) => (
                        <option key={index} value={index + 1}>
                          Position {index + 1}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-400 font-medium">
                      or click to move
                    </div>
                  </div>
                )}
              </div>

              {/* Insertion point after each column (except for selected column and last position) */}
              {moveMode && 
               selectedColumnForMove !== displayIndex && 
               selectedColumnForMove !== displayIndex + 1 && 
               displayIndex < orderedHeaders.length - 1 && (
                <div 
                  onClick={() => handleInsertionClick(displayIndex + 1)}
                  className="h-2 flex items-center justify-center cursor-pointer group"
                >
                  <div className="w-full h-0.5 bg-blue-300 group-hover:bg-blue-500 group-hover:h-1 transition-all rounded"></div>
                </div>
              )}

              {/* Insertion point at the end */}
              {moveMode && 
               displayIndex === orderedHeaders.length - 1 && 
               selectedColumnForMove !== displayIndex && (
                <div 
                  onClick={() => handleInsertionClick(displayIndex + 1)}
                  className="h-2 flex items-center justify-center cursor-pointer group"
                >
                  <div className="w-full h-0.5 bg-blue-300 group-hover:bg-blue-500 group-hover:h-1 transition-all rounded"></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-3 text-sm text-gray-500">
        <span className="font-medium">Tip:</span> {
          moveMode 
            ? "Click on the blue lines to place your selected column, or click the X to cancel."
            : "Click any column to start moving it, or use the dropdown to select a new position. Yellow columns are priority fields."
        }
      </div>
    </div>
  );
};

export default ColumnReorderingComponent;