// Unified Date Logic - ONE function for both counting and filtering

/**
 * SINGLE date parsing function used for BOTH counting and filtering
 * This ensures perfect consistency between the two operations
 * @param {*} dateValue - Raw date value from Excel
 * @returns {string|null} Month code (01-12) or null if not parseable
 */
export const getMonthFromDate = (dateValue, assumeFormat = 'DD/MM/YYYY') => {
  if (!dateValue || dateValue === '') return null;
  
  const str = String(dateValue).trim();

  // Excel serial number handling remains

  if (assumeFormat === 'DD/MM/YYYY') {
    const match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      return month >= 1 && month <= 12 ? month.toString().padStart(2, '0') : null;
    }
  } else if (assumeFormat === 'MM/DD/YYYY') {
    const match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (match) {
      const month = parseInt(match[1]);
      return month >= 1 && month <= 12 ? month.toString().padStart(2, '0') : null;
    }
  }

  return null;
};


/**
 * Find date column using simple logic
 * @param {Array} headerRow - Header row
 * @param {Array} sampleRows - Sample data rows
 * @returns {number} Date column index or -1
 */
export const findDateColumn = (headerRow, sampleRows = []) => {
  if (!headerRow || headerRow.length === 0) return -1;
  
  console.log('=== DATE COLUMN DETECTION ===');
  console.log('Headers:', headerRow);
  
  // Strategy 1: Look for obvious date headers
  const dateKeywords = ['date', 'submission', 'created', 'time'];
  
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i];
    if (!header) continue;
    
    const headerStr = header.toString().toLowerCase();
    if (dateKeywords.some(keyword => headerStr.includes(keyword))) {
      console.log(`Found date column: Index ${i} - "${header}"`);
      return i;
    }
  }
  
  // Strategy 2: Analyze sample data if no obvious header
  let bestColumnIndex = -1;
  let bestScore = 0;
  
  for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
    let validDates = 0;
    let totalValues = 0;
    
    sampleRows.forEach(row => {
      if (row && row[colIndex] !== null && row[colIndex] !== undefined && row[colIndex] !== '') {
        totalValues++;
        if (getMonthFromDate(row[colIndex])) {
          validDates++;
        }
      }
    });
    
    if (totalValues > 0) {
      const score = (validDates / totalValues) * 100;
      console.log(`Column ${colIndex} "${headerRow[colIndex]}": ${validDates}/${totalValues} valid dates (${score.toFixed(1)}%)`);
      
      if (score > bestScore && score > 50) {
        bestScore = score;
        bestColumnIndex = colIndex;
      }
    }
  }
  
  console.log(`Selected date column: Index ${bestColumnIndex} with ${bestScore.toFixed(1)}% confidence`);
  console.log('=== END DATE COLUMN DETECTION ===');
  
  return bestColumnIndex;
};

/**
 * Count entries by month - EXACTLY the same logic as filtering
 * @param {Array} jsonData - Excel data
 * @returns {Array|null} Month counts or null
 */
export const countEntriesByMonth = (jsonData) => {
  if (!jsonData || jsonData.length < 2) {
    console.log("Insufficient data for month counting");
    return null;
  }

  const headerRow = jsonData[0];
  const sampleRows = jsonData.slice(1, Math.min(11, jsonData.length));
  
  // Find date column
  const dateColIndex = findDateColumn(headerRow, sampleRows);
  
  if (dateColIndex === -1) {
    console.log("No date column found");
    return null;
  }
  
  console.log('=== MONTH COUNTING ===');
  console.log(`Using date column: Index ${dateColIndex} - "${headerRow[dateColIndex]}"`);
  
  // Initialize month counters
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
  
  let totalProcessed = 0;
  let validDateCount = 0;
  
  // Store row details for debugging
  const rowDetails = [];
  
  // Count each row using the SAME logic as filtering
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row) continue;
    
    totalProcessed++;
    const dateValue = row[dateColIndex];
    
    // Use the EXACT SAME function as filtering
    const monthCode = getMonthFromDate(dateValue);
    
    const detail = {
      rowIndex: i,
      originalValue: dateValue,
      extractedMonth: monthCode,
      isValid: monthCode !== null
    };
    rowDetails.push(detail);
    
    if (monthCode && months[monthCode]) {
      months[monthCode].count++;
      validDateCount++;
    }
  }
  
  console.log(`Processed ${totalProcessed} rows, found ${validDateCount} with valid dates`);
  
  // Show first 10 parsing results for debugging
  console.log('Sample parsing results:');
  rowDetails.slice(0, 10).forEach(detail => {
    console.log(`Row ${detail.rowIndex}: "${detail.originalValue}" -> ${detail.extractedMonth || 'FAILED'}`);
  });
  
  // Create results
  const results = Object.entries(months)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, data]) => ({
      month: data.name,
      code: data.code,
      count: data.count
    }));
  
  console.log("Final month counts:", results);
  console.log('=== END MONTH COUNTING ===');
  
  // Store the row details globally for comparison with filtering
  window.countingRowDetails = rowDetails;
  
  return results.length > 0 ? results : null;
};

/**
 * Filter rows by months - EXACTLY the same logic as counting
 * @param {Array} adjustedJsonData - Data to filter
 * @param {Array} selectedMonths - Months to remove
 * @param {Array} monthCounts - Month count data
 * @param {number} dateColumnIndex - Date column index
 * @returns {Array} Filtered data
 */
export const filterRowsByMonths = (adjustedJsonData, selectedMonths, monthCounts, dateColumnIndex) => {
  if (!adjustedJsonData || adjustedJsonData.length === 0) {
    return adjustedJsonData;
  }
  
  console.log('=== MONTH FILTERING ===');
  console.log('Selected months to exclude:', selectedMonths);
  console.log('Date column index:', dateColumnIndex);
  console.log('Input rows:', adjustedJsonData.length - 1);
  
  if (selectedMonths.length === 0 || dateColumnIndex === -1) {
    console.log('No filtering needed');
    return adjustedJsonData;
  }
  
  // Get month codes to remove
  const monthCodesToRemove = selectedMonths.map(month => {
    const foundMonth = monthCounts.find(m => m.month === month);
    return foundMonth ? foundMonth.code : null;
  }).filter(code => code !== null);
  
  console.log('Month codes to remove:', monthCodesToRemove);
  
  const filteredData = [adjustedJsonData[0]]; // Keep header
  
  let removedCount = 0;
  let keptCount = 0;
  const removedByMonth = {};
  selectedMonths.forEach(month => {
    removedByMonth[month] = 0;
  });
  
  // We'll track rows that are removed for debugging
  const filteringRowDetails = [];
  
  for (let i = 1; i < adjustedJsonData.length; i++) {
    const row = adjustedJsonData[i];
    if (!row) continue;  // Skip null rows entirely
    
    const dateValue = row[dateColumnIndex];
    const trimmedDateValue = dateValue ? String(dateValue).trim() : '';

    const monthCode = getMonthFromDate(dateValue);

    // REMOVE rows with blank date (treat blank like invalid and remove)
    if (trimmedDateValue === '') {
      removedCount++;
      continue;  // skip adding this row
    }
    
    // REMOVE rows with invalid/unparseable dates
    if (!monthCode) {
      removedCount++;
      continue;  // skip adding this row
    }
    
    // REMOVE rows whose month should be excluded
    if (monthCodesToRemove.includes(monthCode)) {
      removedCount++;
      
      // Increment removed count per month
      const monthEntry = monthCounts.find(m => m.code === monthCode);
      if (monthEntry && removedByMonth.hasOwnProperty(monthEntry.month)) {
        removedByMonth[monthEntry.month]++;
      }
      continue;  // skip adding this row
    }
    
    // KEEP row if none of above cases matched
    filteredData.push(row);
    keptCount++;
  }
  
  console.log('Results:');
  console.log('- Rows removed:', removedCount);
  console.log('- Rows kept:', keptCount);
  console.log('- Output rows:', filteredData.length - 1);
  
  console.log('Verification:');
  Object.entries(removedByMonth).forEach(([month, actualRemoved]) => {
    const expectedCount = monthCounts.find(m => m.month === month)?.count || 0;
    console.log(`- ${month}: Removed ${actualRemoved}, Expected ${expectedCount}`);
    
    if (actualRemoved === expectedCount) {
      console.log(`  ✅ Perfect match`);
    } else {
      console.error(`  ❌ MISMATCH! Off by ${Math.abs(actualRemoved - expectedCount)}`);
    }
  });
  
  // Compare with counting phase if available
  if (window.countingRowDetails) {
    console.log('Comparing with counting phase...');
    let mismatches = 0;
    
    filteringRowDetails.forEach(filterDetail => {
      const countDetail = window.countingRowDetails.find(c => c.rowIndex === filterDetail.rowIndex);
      if (countDetail && countDetail.extractedMonth !== filterDetail.extractedMonth) {
        mismatches++;
        if (mismatches <= 5) {
          console.error(`Row ${filterDetail.rowIndex}: Counting got "${countDetail.extractedMonth}", Filtering got "${filterDetail.extractedMonth}"`);
        }
      }
    });
    
    if (mismatches === 0) {
      console.log('✅ Perfect consistency between counting and filtering');
    } else {
      console.error(`❌ Found ${mismatches} inconsistencies between counting and filtering`);
    }
  }
  
  console.log('=== END MONTH FILTERING ===');
  
  return filteredData;
};

/**
 * Calculate rows to be removed
 * @param {Array} selectedMonths - Selected months
 * @param {Array} monthCounts - Month counts
 * @returns {number} Total rows to remove
 */
export const calculateRowsRemoved = (selectedMonths, monthCounts) => {
  if (!selectedMonths.length || !monthCounts) return 0;
  
  return selectedMonths.reduce((total, month) => {
    const monthData = monthCounts.find(m => m.month === month);
    return total + (monthData ? monthData.count : 0);
  }, 0);
};