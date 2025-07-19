// columnReordering.js - Functions for reordering columns in Excel data

/**
 * Reorder columns in data array based on new column order
 * @param {Array} data - 2D array of Excel data
 * @param {Array} newOrder - Array of column indices in desired order
 * @returns {Array} Data with columns reordered
 */
export const reorderColumns = (data, newOrder) => {
  if (!data || data.length === 0 || !newOrder || newOrder.length === 0) {
    return data;
  }
  
  return data.map(row => {
    if (!row) return row;
    return newOrder.map(index => row[index] || '');
  });
};

/**
 * Move a column to a new position
 * @param {Array} headers - Array of header names
 * @param {number} fromIndex - Current index of column to move
 * @param {number} toIndex - Target index for the column
 * @returns {Array} New order array of indices
 */
export const moveColumn = (headers, fromIndex, toIndex) => {
  if (!headers || fromIndex < 0 || toIndex < 0 || 
      fromIndex >= headers.length || toIndex >= headers.length) {
    return headers.map((_, i) => i); // Return original order
  }
  
  const order = headers.map((_, i) => i);
  const [movedItem] = order.splice(fromIndex, 1);
  order.splice(toIndex, 0, movedItem);
  
  return order;
};

/**
 * Get column order based on header names
 * @param {Array} currentHeaders - Current header array
 * @param {Array} desiredHeaderOrder - Desired header names in order
 * @returns {Array} Array of indices representing the new order
 */
export const getColumnOrderByHeaders = (currentHeaders, desiredHeaderOrder) => {
  if (!currentHeaders || !desiredHeaderOrder) {
    return currentHeaders ? currentHeaders.map((_, i) => i) : [];
  }
  
  const order = [];
  
  // First, add columns that are in the desired order
  desiredHeaderOrder.forEach(headerName => {
    const index = currentHeaders.findIndex(h => 
      h && h.toString().toLowerCase() === headerName.toLowerCase()
    );
    if (index !== -1 && !order.includes(index)) {
      order.push(index);
    }
  });
  
  // Then add any remaining columns that weren't specified
  currentHeaders.forEach((_, index) => {
    if (!order.includes(index)) {
      order.push(index);
    }
  });
  
  return order;
};

/**
 * Predefined column orders for common use cases
 */
export const getPredefinedColumnOrders = () => {
  return {
    default: null, // Keep original order
    alphabetical: 'alphabetical',
    yellowFirst: [
      'Mobile', 'Payer', 'Claim ID', 'Submission Date', 
      'Xml FileName', 'Doctor', 'Card No', 'Services'
    ],
    essential: [
      'Claim ID', 'Mobile', 'Payer', 'Doctor', 'Services', 'Submission Date'
    ],
    dateFirst: ['Date', 'Submission Date'],
    amountFirst: ['Amount', 'Recieved amount']
  };
};

/**
 * Sort columns alphabetically
 * @param {Array} headers - Array of header names
 * @returns {Array} Array of indices in alphabetical order
 */
export const getAlphabeticalOrder = (headers) => {
  if (!headers) return [];
  
  return headers
    .map((header, index) => ({ header: header || '', index }))
    .sort((a, b) => a.header.localeCompare(b.header))
    .map(item => item.index);
};

/**
 * Apply predefined column order
 * @param {Array} headers - Current header array
 * @param {string|Array} orderType - Type of predefined order or custom array
 * @returns {Array} Array of indices representing the new order
 */
export const applyPredefinedOrder = (headers, orderType) => {
  if (!headers || !orderType) {
    return headers ? headers.map((_, i) => i) : [];
  }
  
  if (orderType === 'alphabetical') {
    return getAlphabeticalOrder(headers);
  }
  
  if (Array.isArray(orderType)) {
    return getColumnOrderByHeaders(headers, orderType);
  }
  
  const predefinedOrders = getPredefinedColumnOrders();
  const order = predefinedOrders[orderType];
  
  if (Array.isArray(order)) {
    return getColumnOrderByHeaders(headers, order);
  }
  
  return headers.map((_, i) => i); // Default order
};

/**
 * Validate column reordering
 * @param {Array} headers - Header array
 * @param {Array} newOrder - New order array
 * @returns {Object} Validation result
 */
export const validateColumnOrder = (headers, newOrder) => {
  if (!headers || !newOrder) {
    return {
      isValid: false,
      message: 'Headers and new order must be provided'
    };
  }
  
  if (headers.length !== newOrder.length) {
    return {
      isValid: false,
      message: 'New order must have same length as headers'
    };
  }
  
  // Check if all indices are valid and unique
  const uniqueIndices = [...new Set(newOrder)];
  if (uniqueIndices.length !== newOrder.length) {
    return {
      isValid: false,
      message: 'New order contains duplicate indices'
    };
  }
  
  const invalidIndices = newOrder.filter(index => 
    index < 0 || index >= headers.length || !Number.isInteger(index)
  );
  
  if (invalidIndices.length > 0) {
    return {
      isValid: false,
      message: 'New order contains invalid indices'
    };
  }
  
  return {
    isValid: true,
    message: 'Column order is valid'
  };
};