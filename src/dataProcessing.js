// Modified dataProcessing.js - Updated with improved column reordering functionality

import { getMonthFromDate } from './dateUtilities.js';

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
 * Default headers to add - can be customized as needed
 * @returns {Array} Array of default headers to add
 */
export const getDefaultNewHeaders = () => {
  return ["Recieved amount", "Recieved date", "Recieved amount", "Recieved date"];
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
 * Process Excel data by removing selected columns, filtering by months, adding new columns, and reordering
 * @param {Array} jsonData - Raw Excel data as array of arrays
 * @param {number} headerRowIndex - Index of the header row
 * @param {Array} selectedHeaders - Headers to remove
 * @param {Array} selectedMonths - Months to filter out
 * @param {Array} monthCounts - Month count data for mapping
 * @param {number} dateColumnIndex - Index of the date column
 * @param {Array} newHeaders - Headers for new columns to add (optional)
 * @param {Array} columnOrder - New column order indices (optional)
 * @returns {Array} Processed data with columns removed, rows filtered, new columns added, and reordered
 */
export const processExcelData = (
  jsonData, 
  headerRowIndex, 
  selectedHeaders, 
  selectedMonths, 
  monthCounts, 
  dateColumnIndex,
  newHeaders = null,
  columnOrder = null
) => {
  if (!jsonData) {
    throw new Error('No data available for processing');
  }
  
  console.log("Processing Excel data with column order:", columnOrder);
  
  // Use default headers if none provided
  const columnsToAdd = newHeaders || getDefaultNewHeaders();
  
  // Create adjusted data with the correct header row
  const headerRow = jsonData[headerRowIndex];
  const adjustedJsonData = [
    headerRow,
    ...jsonData.slice(headerRowIndex + 1)
  ];
  
  // Get indices of headers to remove
  const headerIndices = selectedHeaders.map(header => 
    headerRow.findIndex(h => h === header)
  ).filter(index => index !== -1);
  
  // Get month codes to filter out
  const monthCodesToRemove = selectedMonths.map(month => {
    const foundMonth = monthCounts.find(m => m.month === month);
    return foundMonth ? foundMonth.code : null;
  }).filter(code => code !== null);
  
  // First filter rows based on selected months (if any)
  let filteredData = adjustedJsonData;
  
  if (selectedMonths.length > 0 && dateColumnIndex !== -1) {
    filteredData = [adjustedJsonData[0]]; // Keep header row
    
    // Add rows that don't match the excluded months
    for (let i = 1; i < adjustedJsonData.length; i++) {
      const row = adjustedJsonData[i];
      if (row && row[dateColumnIndex]) {
        const dateValue = String(row[dateColumnIndex]);
        const monthCode = getMonthFromDate(dateValue);
        
        // Include row only if its month is not in the exclusion list
        if (!monthCode || !monthCodesToRemove.includes(monthCode)) {
          filteredData.push(row);
        }
      } else if (row) {
        // Include rows with no date value
        filteredData.push(row);
      }
    }
  }
  
  // Then remove selected columns
  const processedData = filteredData.map(row => 
    row ? row.filter((_, index) => !headerIndices.includes(index)) : []
  );
  
  // Add new columns
  const dataWithNewColumns = addNewColumns(processedData, columnsToAdd);
  
  // Finally, reorder columns if specified
  let finalData = dataWithNewColumns;
  
  if (columnOrder && columnOrder.length > 0) {
    // Update column order to account for removed columns
    // First, create a mapping from original indices to new indices
    let indexMapping = {};
    let newIndex = 0;
    
    for (let i = 0; i < headerRow.length; i++) {
      if (!headerIndices.includes(i)) {
        indexMapping[i] = newIndex++;
      }
    }
    
    // Now add the indices for new columns
    for (let i = 0; i < columnsToAdd.length; i++) {
      indexMapping[headerRow.length + i] = newIndex++;
    }
    
    // Convert the column order to account for removed columns
    const adjustedColumnOrder = columnOrder
      .filter(index => indexMapping[index] !== undefined)
      .map(index => indexMapping[index]);
    
    // Add any missing indices to the end
    const includedIndices = new Set(adjustedColumnOrder);
    for (let i = 0; i < dataWithNewColumns[0].length; i++) {
      if (!includedIndices.has(i)) {
        adjustedColumnOrder.push(i);
      }
    }
    
    console.log("Adjusted column order:", adjustedColumnOrder);
    
    // Validate the new column order
    const validation = validateColumnOrder(dataWithNewColumns[0], adjustedColumnOrder);
    
    if (validation.isValid) {
      // Apply the reordering
      finalData = reorderColumns(dataWithNewColumns, adjustedColumnOrder);
      console.log("Column reordering applied successfully");
    } else {
      console.warn("Invalid column order, using original order:", validation.message);
    }
  }
  
  return finalData;
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