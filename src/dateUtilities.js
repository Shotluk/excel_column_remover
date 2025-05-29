// dateUtilities.js - Functions for handling date operations and month counting

/**
 * Get month code from date string
 * @param {string} dateStr - Date string in various formats
 * @returns {string|null} Month code (01-12) or null if not found
 */
export const getMonthFromDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Format: DD/MM/YYYY
  const ddmmyyyyMatch = dateStr.match(/(\d{2})\/(\d{2})\/\d{4}/);
  if (ddmmyyyyMatch) {
    return ddmmyyyyMatch[2]; // Month is the second capture group
  }
  
  // Format: MM/DD/YYYY (as fallback)
  const mmddyyyyMatch = dateStr.match(/(\d{2})\/\d{2}\/\d{4}/);
  if (mmddyyyyMatch) {
    return mmddyyyyMatch[1];
  }
  
  return null;
};

/**
 * Count entries by month in the dataset
 * @param {Array} jsonData - Excel data as array of arrays
 * @returns {Array|null} Array of month data objects or null if no date column found
 */
export const countEntriesByMonth = (jsonData) => {
  // Find the Date column index
  const headerRow = jsonData[0];
  const dateColIndex = headerRow.findIndex(
    header => header === 'Date' || header.toLowerCase() === 'date'
  );
  
  if (dateColIndex === -1) {
    console.log("No 'Date' column found");
    return null;
  }
  
  // Initialize month counters with month numbers for sorting
  const months = {
    '01': { name: 'January', code: '01', count: 0 },
    '02': { name: 'February', code: '02', count: 0 },
    '03': { name: 'March', code: '03', count: 0 },
    '04': { name: 'April', code: '04', count: 0 },
    '05': { name: 'May', code: '05', count: 0 },
    '06': { name: 'June', code: '06', count: 0 },
    '07': { name: 'July', code: '07', count: 0 },
    '08': { name: 'August', code: '08', count: 0 },
    '09': { name: 'September', code: '09', count: 0 },
    '10': { name: 'October', code: '10', count: 0 },
    '11': { name: 'November', code: '11', count: 0 },
    '12': { name: 'December', code: '12', count: 0 }
  };
  
  // Count entries for each month
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row[dateColIndex]) {
      const dateValue = String(row[dateColIndex]);
      
      // Try different date formats
      let monthCode = null;
      
      // Format: DD/MM/YYYY
      const ddmmyyyyMatch = dateValue.match(/(\d{2})\/(\d{2})\/\d{4}/);
      if (ddmmyyyyMatch) {
        monthCode = ddmmyyyyMatch[2]; // Month is the second capture group
      }
      
      // Format: MM/DD/YYYY (as fallback)
      const mmddyyyyMatch = dateValue.match(/(\d{2})\/\d{2}\/\d{4}/);
      if (!monthCode && mmddyyyyMatch) {
        monthCode = mmddyyyyMatch[1];
      }
      
      // If we found a month, increment the counter
      if (monthCode && months[monthCode]) {
        months[monthCode].count++;
      }
    }
  }
  
  // Filter out months with zero entries and sort by month number
  const results = Object.entries(months)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, data]) => ({
      month: data.name,
      code: data.code,
      count: data.count
    }));
  
  console.log("Month counts:", results);
  return results;
};

/**
 * Calculate total rows to be removed based on selected months
 * @param {Array} selectedMonths - Array of selected month names
 * @param {Array} monthCounts - Array of month count objects
 * @returns {number} Total number of rows to be removed
 */
export const calculateRowsRemoved = (selectedMonths, monthCounts) => {
  if (!selectedMonths.length || !monthCounts) return 0;
  
  return selectedMonths.reduce((total, month) => {
    const monthData = monthCounts.find(m => m.month === month);
    return total + (monthData ? monthData.count : 0);
  }, 0);
};