// columnReorderingComponent.js - Updated with Add Column functionality and fixed useEffect dependencies
import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, X, ArrowRight, Plus } from 'lucide-react';

const ColumnReorderingComponent = ({ 
  headers, 
  onColumnOrderChange, 
  currentOrder = null,
  onAddColumn, // Handler for adding/removing columns
  addedColumns = [] // External added columns passed from parent
}) => {
  const [columnOrder, setColumnOrder] = useState(
    currentOrder || (headers ? headers.map((_, i) => i) : [])
  );
  const [selectedColumnForMove, setSelectedColumnForMove] = useState(null);
  const [moveMode, setMoveMode] = useState(false);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Combine original headers with externally added columns
  const allHeaders = [...headers, ...addedColumns];
  
  // Get ordered headers for display
  const orderedHeaders = columnOrder.map(index => allHeaders[index]).filter(Boolean);

  // Memoize the column order change handler to prevent unnecessary re-renders
  const handleColumnOrderChange = useCallback((newOrder) => {
    setColumnOrder(newOrder);
    onColumnOrderChange(newOrder);
  }, [onColumnOrderChange]);

  // Update column order when addedColumns changes
  useEffect(() => {
    if (addedColumns.length > columnOrder.length - headers.length) {
      // New columns were added externally, update order
      const newOrder = [...columnOrder];
      for (let i = columnOrder.length; i < allHeaders.length; i++) {
        newOrder.push(i);
      }
      handleColumnOrderChange(newOrder);
    } else if (addedColumns.length < columnOrder.length - headers.length) {
      // Columns were removed, update order
      const newOrder = columnOrder.filter(index => index < allHeaders.length);
      handleColumnOrderChange(newOrder);
    }
  }, [addedColumns.length, headers.length, allHeaders.length, columnOrder, handleColumnOrderChange]);

  const moveColumn = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    const newOrder = [...columnOrder];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    
    handleColumnOrderChange(newOrder);
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

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      // Check if column name already exists
      if (allHeaders.includes(newColumnName.trim())) {
        alert('Column name already exists. Please choose a different name.');
        return;
      }

      const newColumn = newColumnName.trim();

      // Notify parent component about the new column
      if (onAddColumn) {
        onAddColumn(newColumn);
      }

      // Reset modal state
      setNewColumnName('');
      setShowAddColumnModal(false);
    }
  };

  const handleRemoveColumn = (displayIndex) => {
    const columnIndex = columnOrder[displayIndex];
    const columnName = allHeaders[columnIndex];
    
    // Only allow removing added columns (not original headers)
    if (columnIndex >= headers.length) {
      // Notify parent component about column removal
      if (onAddColumn) {
        onAddColumn(null, columnName, 'remove');
      }

      cancelMove();
    }
  };

  const cancelMove = () => {
    setSelectedColumnForMove(null);
    setMoveMode(false);
  };

  const resetOrder = () => {
    const originalOrder = allHeaders.map((_, i) => i);
    handleColumnOrderChange(originalOrder);
    cancelMove(); // Cancel any active move
  };

  const applyPredefinedOrder = (orderType) => {
    let newOrder;
    
    switch (orderType) {
      case 'alphabetical':
        newOrder = allHeaders
          .map((header, index) => ({ header: header || '', index }))
          .sort((a, b) => a.header.localeCompare(b.header))
          .map(item => item.index);
        break;
      case 'yellowFirst':
        const yellowColumns = ['Mobile', 'Payer', 'Claim ID', 'Submission Date', 'Xml FileName', 'Doctor', 'Card No', 'Services'];
        const yellowIndices = [];
        const otherIndices = [];
        
        allHeaders.forEach((header, index) => {
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
        newOrder = allHeaders.map((_, i) => i);
    }
    
    handleColumnOrderChange(newOrder);
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
            onClick={() => setShowAddColumnModal(true)}
            disabled={moveMode}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
            Add Column
          </button>
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

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Add New Column</h4>
              <button
                onClick={() => {
                  setShowAddColumnModal(false);
                  setNewColumnName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="columnName" className="block text-sm font-medium text-gray-700 mb-2">
                Column Name
              </label>
              <input
                id="columnName"
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddColumn()}
                placeholder="Enter column name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddColumnModal(false);
                  setNewColumnName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                disabled={!newColumnName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

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
          const isAddedColumn = originalIndex >= headers.length; // Check if this is an added column

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
                      isAddedColumn 
                        ? 'text-green-600' 
                        : isYellow 
                          ? 'text-yellow-600' 
                          : 'text-gray-700'
                    } ${isSelected ? 'text-blue-700' : ''}`}>
                      {header}
                    </span>
                    {isSelected && (
                      <span className="px-2 py-1 text-xs bg-blue-200 text-blue-800 rounded-full font-medium">
                        Moving
                      </span>
                    )}
                    {isAddedColumn && (
                      <span className="px-2 py-1 text-xs bg-green-200 text-green-800 rounded-full font-medium">
                        New
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    Position {displayIndex + 1}
                  </span>
                </div>

                {/* Dropdown and remove button for position selection */}
                {!isInMoveMode && (
                  <div className="flex items-center gap-2">
                    {isAddedColumn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveColumn(displayIndex);
                        }}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                        title="Remove column"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
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
            : "Click any column to start moving it, or use the dropdown to select a new position. Green columns are newly added, yellow columns are priority fields."
        }
      </div>
    </div>
  );
};

export default ColumnReorderingComponent;