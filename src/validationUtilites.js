// validationUtilities.js - Utility functions for data validation and checks

/**
 * Check if processing can proceed based on selections
 * @param {Array} selectedHeaders - Selected headers to remove
 * @param {Array} selectedMonths - Selected months to filter
 * @returns {Object} Validation result with isValid flag and message
 */
export const validateProcessingRequirements = (selectedHeaders, selectedMonths) => {
  if (!selectedHeaders.length && !selectedMonths.length) {
    return {
      isValid: false,
      message: 'Please select at least one column or month to remove'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validate if data is available for processing
 * @param {*} data - Data to validate
 * @returns {Object} Validation result
 */
export const validateDataAvailability = (data) => {
  if (!data) {
    return {
      isValid: false,
      message: 'No data available for processing'
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
};

/**
 * Check if a header name matches yellow column criteria
 * @param {string} header - Header name to check
 * @returns {boolean} True if header is a yellow column
 */
export const isYellowColumn = (header) => {
  const yellowColumns = ['mobile', 'xml filename', 'doctor', 'card no'];
  return yellowColumns.includes(header.toLowerCase());
};

/**
 * Validate file size (optional constraint)
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB (default: 10)
 * @returns {Object} Validation result
 */
export const validateFileSize = (file, maxSizeMB = 10) => {
  if (!file) {
    return {
      isValid: false,
      message: 'No file provided'
    };
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      message: `File size exceeds ${maxSizeMB}MB limit`
    };
  }
  
  return {
    isValid: true,
    message: ''
  };
};

/**
 * Check if any meaningful data would remain after processing
 * @param {Array} headers - Original headers
 * @param {Array} selectedHeaders - Headers to remove
 * @param {number} totalRows - Total number of data rows
 * @param {number} rowsToRemove - Number of rows to remove
 * @returns {Object} Validation result
 */
export const validateRemainingData = (headers, selectedHeaders, totalRows, rowsToRemove) => {
  const remainingColumns = headers.length - selectedHeaders.length;
  const remainingRows = totalRows - rowsToRemove;
  
  if (remainingColumns === 0) {
    return {
      isValid: false,
      message: 'Cannot remove all columns - at least one column must remain'
    };
  }
  
  if (remainingRows === 0) {
    return {
      isValid: false,
      message: 'All data rows would be removed - no data would remain'
    };
  }
  
  return {
    isValid: true,
    message: '',
    remainingColumns,
    remainingRows
  };
};

/**
 * Generate summary of changes to be made
 * @param {Array} selectedHeaders - Headers to remove
 * @param {Array} selectedMonths - Months to filter
 * @param {number} rowsToRemove - Number of rows to remove
 * @returns {string} Summary text
 */
export const generateProcessingSummary = (selectedHeaders, selectedMonths, rowsToRemove) => {
  let summary = '';
  
  if (selectedHeaders.length > 0) {
    summary += `Will remove ${selectedHeaders.length} column(s): ${selectedHeaders.join(', ')}. `;
  }
  
  if (selectedMonths.length > 0) {
    summary += `Will remove ${rowsToRemove} row(s) from months: ${selectedMonths.join(', ')}.`;
  }
  
  return summary.trim();
};