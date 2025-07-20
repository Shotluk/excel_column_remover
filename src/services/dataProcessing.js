// Enhanced dataProcessing.js - Flexible date column support

import { filterRowsByMonths } from './dateUtilities.js';

/**
 * Select predefined yellow columns (specific to this application)
 * @param {Array} headers - Array of header names
 * @param {Array} currentSelectedHeaders - Currently selected headers
 * @returns {Array} Updated array of selected headers
 */
export const selectYellowColumns = (headers, currentSelectedHeaders) => {
  const yellowColumns = ['Mobile', 'Payer', 'Claim ID', 'Submission Date', 'Xml FileName', 'Doctor', 'Card No', 'Services'];
  const columnsToSelect = yellowColumns.filter(col => 
    headers.some(header => header === col || header.toLowerCase() === col.toLowerCase())
  );
  
  const newSelection = [...currentSelectedHeaders];
  columnsToSelect.forEach(col => {
    // Find exact or case-insensitive match
    const matchedHeader = headers.find(
      header => header === col || header.toLowerCase() === col.toLowerCase()
    );
    if (matchedHeader && !newSelection.includes(matchedHeader)) {
      newSelection.push(matchedHeader);
    }
  });
  
  return newSelection;
};

/**
 * Add new columns to the processed Excel data
 * @param {Array} processedData - Data after column removal and filtering
 * @param {Array} newHeaders - Array of headers for new columns
 * @returns {Array} Data with new columns added
 */
export const addNewColumns = (processedData, newHeaders) => {
  if (!processedData || processedData.length === 0) {
    return processedData;
  }
  
  // Add new columns to header row
  const headerRow = [...processedData[0], ...newHeaders];
  
  // Add empty cells for new columns in each data row
  const updatedData = [
    headerRow,
    ...processedData.slice(1).map(row => {
      return [...row, ...Array(newHeaders.length).fill('')];
    })
  ];
  
  return updatedData;
};

/**
 * Reorder columns in a data array
 * @param {Array} data - Data array to reorder
 * @param {Array} columnOrder - Array of column indices in the desired order
 * @returns {Array} Data with columns reordered
 */
export const reorderColumns = (data, columnOrder) => {
  if (!data || data.length === 0 || !columnOrder || columnOrder.length === 0) {
    return data;
  }
  
  return data.map(row => {
    if (!row || !Array.isArray(row)) return row;
    
    // Create a new row with columns in the specified order
    return columnOrder.map(index => {
      // Return empty string for out-of-bounds indices
      return index < row.length ? row[index] : '';
    });
  });
};

/**
 * Validate a column order array
 * @param {Array} headers - Header array 
 * @param {Array} columnOrder - Column order array to validate
 * @returns {Object} Validation result with isValid flag and message
 */
export const validateColumnOrder = (headers, columnOrder) => {
  if (!headers || !columnOrder) {
    return { isValid: false, message: 'Missing headers or column order' };
  }
  
  // Ensure all indices are valid
  for (const index of columnOrder) {
    if (typeof index !== 'number' || index < 0 || index >= headers.length) {
      return { 
        isValid: false, 
        message: `Invalid column index: ${index}. Must be between 0 and ${headers.length - 1}` 
      };
    }
  }
  
  // Check for duplicate indices
  const uniqueIndices = new Set(columnOrder);
  if (uniqueIndices.size !== columnOrder.length) {
    return { isValid: false, message: 'Column order contains duplicate indices' };
  }
  
  // Check if all columns are included
  if (columnOrder.length !== headers.length) {
    // This is just a warning, not an error
    console.warn(`Column order doesn't include all columns. Expected ${headers.length}, got ${columnOrder.length}`);
  }
  
  return { isValid: true, message: 'Valid column order' };
};

/**
 * Enhanced process Excel data with flexible date column selection
 * @param {Array} jsonData - Raw Excel data as array of arrays
 * @param {number} headerRowIndex - Index of the header row
 * @param {Array} selectedHeaders - Headers to remove
 * @param {Array} selectedMonths - Months to filter out
 * @param {Array} monthCounts - Month count data for mapping
 * @param {number} selectedDateColumnIndex - Index of the selected date column for filtering
 * @param {Array} newHeaders - Headers for new columns to add
 * @param {Array} columnOrder - New column order indices (optional)
 * @param {Array} originalHeaders - Original headers before adding new columns
 * @param {Array} addedColumns - Custom added columns
 * @returns {Array} Processed data with columns removed, rows filtered, new columns added, and reordered
 */
export const processExcelData = (
  jsonData, 
  headerRowIndex, 
  selectedHeaders, 
  selectedMonths, 
  monthCounts, 
  selectedDateColumnIndex, // Changed from dateColumnIndex to selectedDateColumnIndex
  newHeaders = null,
  columnOrder = null,
  originalHeaders = null,
  addedColumns = []
) => {
  if (!jsonData) {
    throw new Error('No data available for processing');
  }
  
  console.log("=== ENHANCED EXCEL DATA PROCESSING DEBUG ===");
  console.log("Processing Excel data with column order:", columnOrder);
  console.log("Adding new columns:", newHeaders);
  console.log("Original headers:", originalHeaders);
  console.log("Added columns:", addedColumns);
  console.log("Selected months to exclude:", selectedMonths);
  console.log("Selected headers to remove:", selectedHeaders);
  console.log("Selected date column index:", selectedDateColumnIndex); // New log
  
  // Use provided headers or empty array
  const columnsToAdd = newHeaders || [];
  
  // Create adjusted data with the correct header row
  const headerRow = jsonData[headerRowIndex];
  const adjustedJsonData = [
    headerRow,
    ...jsonData.slice(headerRowIndex + 1)
  ];
  
  console.log("Initial data rows:", adjustedJsonData.length - 1);
  
  // STEP 1: Filter rows based on selected months using the selected date column
  let filteredData = adjustedJsonData;
  
  if (selectedMonths.length > 0 && selectedDateColumnIndex !== -1) {
    console.log(`Filtering by months using date column index: ${selectedDateColumnIndex}`);
    filteredData = filterRowsByMonths(adjustedJsonData, selectedMonths, monthCounts, selectedDateColumnIndex);
  }
  
  console.log("After month filtering rows:", filteredData.length - 1);
  
  // STEP 2: Add new columns BEFORE removing columns
  const dataWithNewColumns = addNewColumns(filteredData, columnsToAdd);
  
  console.log("After adding new columns:", dataWithNewColumns[0]);
  
  // STEP 3: Apply column reordering BEFORE removing columns
  let reorderedData = dataWithNewColumns;
  
  if (columnOrder && columnOrder.length > 0 && originalHeaders && addedColumns) {
    console.log("Applying column reordering...");
    
    // Create the combined headers list (same as in the component)
    const allCombinedHeaders = [...originalHeaders, ...addedColumns];
    
    // Create headers after adding new columns (original + new columns)
    const headersAfterAddition = [...headerRow, ...columnsToAdd];
    
    console.log("All combined headers (from component):", allCombinedHeaders);
    console.log("Headers after addition:", headersAfterAddition);
    console.log("Column order from component:", columnOrder);
    
    // Create a mapping from component column order to actual data columns
    const finalColumnOrder = [];
    
    columnOrder.forEach(componentIndex => {
      const headerName = allCombinedHeaders[componentIndex];
      console.log(`Looking for header: ${headerName} (component index: ${componentIndex})`);
      
      // Find this header in the headers after addition
      const actualIndex = headersAfterAddition.findIndex(header => header === headerName);
      
      if (actualIndex !== -1) {
        finalColumnOrder.push(actualIndex);
        console.log(`Found ${headerName} at actual index: ${actualIndex}`);
      } else {
        console.warn(`Header ${headerName} not found in final headers`);
      }
    });
    
    console.log("Final column order for reordering:", finalColumnOrder);
    
    // Apply the reordering
    if (finalColumnOrder.length > 0) {
      reorderedData = reorderColumns(dataWithNewColumns, finalColumnOrder);
      console.log("Column reordering applied successfully");
      console.log("Final header row after reordering:", reorderedData[0]);
    }
  }
  
  // STEP 4: FINALLY, remove selected columns (this should happen LAST)
  if (selectedHeaders.length > 0) {
    // Get the header row after reordering
    const currentHeaderRow = reorderedData[0];
    
    // Get indices of headers to remove from the current (reordered) header row
    const headerIndicesToRemove = selectedHeaders.map(header => 
      currentHeaderRow.findIndex(h => h === header)
    ).filter(index => index !== -1);
    
    console.log("Headers to remove:", selectedHeaders);
    console.log("Indices to remove:", headerIndicesToRemove);
    console.log("Current header row:", currentHeaderRow);
    
    // Remove the columns
    const finalProcessedData = reorderedData.map(row => 
      row ? row.filter((_, index) => !headerIndicesToRemove.includes(index)) : []
    );
    
    console.log("Final header row after removal:", finalProcessedData[0]);
    console.log("Final data rows:", finalProcessedData.length - 1);
    console.log("=== END ENHANCED PROCESSING DEBUG ===");
    return finalProcessedData;
  }
  
  console.log("No column removal needed");
  console.log("Final data rows:", reorderedData.length - 1);
  console.log("=== END ENHANCED PROCESSING DEBUG ===");
  return reorderedData;
};

/**
 * Toggle selection of a header in the list
 * @param {string} header - Header name to toggle
 * @param {Array} currentSelection - Current selected headers
 * @returns {Array} Updated selection array
 */
export const toggleHeaderSelection = (header, currentSelection) => {
  if (currentSelection.includes(header)) {
    return currentSelection.filter(h => h !== header);
  } else {
    return [...currentSelection, header];
  }
};

/**
 * Toggle selection of a month in the list
 * @param {string} month - Month name to toggle
 * @param {Array} currentSelection - Current selected months
 * @returns {Array} Updated selection array
 */
export const toggleMonthSelection = (month, currentSelection) => {
  if (currentSelection.includes(month)) {
    return currentSelection.filter(m => m !== month);
  } else {
    return [...currentSelection, month];
  }
};