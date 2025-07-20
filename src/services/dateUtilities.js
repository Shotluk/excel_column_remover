// Enhanced dateUtilities.js - Multiple date column detection and flexible sorting

/**
 * ENHANCED date parsing function that returns both month and year
 * @param {*} dateValue - Raw date value from Excel
 * @returns {Object|null} Object with month and year codes or null if not parseable
 */
export const getMonthAndYearFromDate = (dateValue, assumeFormat = 'DD/MM/YYYY') => {
  if (!dateValue || dateValue === '') return null;
  
  // Handle Date objects first
  if (dateValue instanceof Date) {
    const month = dateValue.getMonth() + 1;
    const year = dateValue.getFullYear();
    if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      return {
        month: month.toString().padStart(2, '0'),
        year: year.toString()
      };
    }
    return null;
  }
  
  const str = String(dateValue).trim();

  // Handle Excel serial numbers
  if (typeof dateValue === 'number' && dateValue > 25000 && dateValue < 50000) {
    try {
      const excelEpoch = new Date(1899, 11, 30);
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      const dateObj = new Date(excelEpoch.getTime() + dateValue * millisecondsPerDay);
      
      const month = dateObj.getMonth() + 1;
      const year = dateObj.getFullYear();
      if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return {
          month: month.toString().padStart(2, '0'),
          year: year.toString()
        };
      }
    } catch (error) {
      console.log(`Error parsing Excel serial number ${dateValue}:`, error);
      return null;
    }
  }
  
  // Enhanced string parsing with multiple patterns
  
  // Pattern 1: DD/MM/YYYY with optional time
  if (assumeFormat === 'DD/MM/YYYY') {
    let match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(\s+\d{1,2}:\d{2})?/);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = parseInt(match[3]);
      if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return {
          month: month.toString().padStart(2, '0'),
          year: year.toString()
        };
      }
    }
  } 
  // Pattern 2: MM/DD/YYYY with optional time
  else if (assumeFormat === 'MM/DD/YYYY') {
    let match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(\s+\d{1,2}:\d{2})?/);
    if (match) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      if (month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        return {
          month: month.toString().padStart(2, '0'),
          year: year.toString()
        };
      }
    }
  }
  
  // Pattern 3: Auto-detect format
  let match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(\s+\d{1,2}:\d{2})?/);
  if (match) {
    const first = parseInt(match[1]);
    const second = parseInt(match[2]);
    const year = parseInt(match[3]);
    
    if (year >= 1900 && year <= 2100) {
      // Auto-detect logic
      if (first > 12 && second >= 1 && second <= 12) {
        // DD/MM/YYYY
        return {
          month: second.toString().padStart(2, '0'),
          year: year.toString()
        };
      } else if (second > 12 && first >= 1 && first <= 12) {
        // MM/DD/YYYY
        return {
          month: first.toString().padStart(2, '0'),
          year: year.toString()
        };
      } else if (first >= 1 && first <= 31 && second >= 1 && second <= 12) {
        // Assume DD/MM/YYYY (European standard)
        return {
          month: second.toString().padStart(2, '0'),
          year: year.toString()
        };
      }
    }
  }
  
  // Pattern 4: ISO format (YYYY-MM-DD)
  match = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(\s+\d{1,2}:\d{2})?/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      return {
        month: month.toString().padStart(2, '0'),
        year: year.toString()
      };
    }
  }
  
  // Pattern 5: JavaScript Date constructor fallback
  try {
    const cleanStr = str.replace(/\s+/g, ' ').trim();
    const parsedDate = new Date(cleanStr);
    
    if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
      const month = parsedDate.getMonth() + 1;
      const year = parsedDate.getFullYear();
      return {
        month: month.toString().padStart(2, '0'),
        year: year.toString()
      };
    }
  } catch (error) {
    // Ignore parsing errors
  }
  
  return null;
};

/**
 * LEGACY function - kept for backward compatibility
 * @param {*} dateValue - Raw date value from Excel
 * @returns {string|null} Month code (01-12) or null if not parseable
 */
export const getMonthFromDate = (dateValue, assumeFormat = 'DD/MM/YYYY') => {
  const result = getMonthAndYearFromDate(dateValue, assumeFormat);
  return result ? result.month : null;
};

/**
 * Enhanced function to find ALL date columns in the data - with stricter detection
 * @param {Array} headerRow - Header row
 * @param {Array} sampleRows - Sample data rows
 * @returns {Array} Array of objects with date column information
 */
export const findAllDateColumns = (headerRow, sampleRows = []) => {
  if (!headerRow || headerRow.length === 0) return [];
  
  console.log('=== ENHANCED DATE COLUMN DETECTION ===');
  console.log('Headers:', headerRow);
  
  const dateColumns = [];
  
  // STRICT date keywords - only clear date-related terms
  const strictDateKeywords = [
    'date', 'dates', 'submission', 'created', 'time', 'timestamp', 
  ];
  
  // Multi-word date patterns - these get highest confidence
  const multiWordPatterns = [
    'service date', 'submission date', 'created date', 'visit date',
    'appointment date', 'due date', 'expiry date', 'start date', 'end date',
    'birth date', 'date of birth', 'modified date', 'updated date', 'remittance date'
  ];
  
  // EXCLUDED keywords - these should NOT be considered date columns
  const excludedKeywords = [
    'qty', 'quantity', 'amount', 'amt', 'code', 'id', 'number', 'no',
    'name', 'description', 'type', 'status', 'category', 'class',
    'rate', 'price', 'cost', 'fee', 'total', 'sum', 'count'
  ];
  
  // Check each column
  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i];
    if (!header) continue;
    
    const headerStr = header.toString().toLowerCase().trim();
    let confidence = 0;
    let matchType = '';
    let isExcluded = false;
    
    // FIRST: Check if this column should be excluded
    if (excludedKeywords.some(keyword => headerStr.includes(keyword))) {
      console.log(`Excluding column "${header}" - contains excluded keyword`);
      isExcluded = true;
    }
    
    if (!isExcluded) {
      // Strategy 1: Check multi-word patterns first (highest confidence)
      const multiWordMatch = multiWordPatterns.find(pattern => {
        const normalizedHeader = headerStr.replace(/\s+/g, ' ');
        return normalizedHeader.includes(pattern.toLowerCase());
      });
      
      if (multiWordMatch) {
        confidence = 0.95;
        matchType = `Multi-word pattern: "${multiWordMatch}"`;
      }
      // Strategy 2: Check single keywords - but be more strict
      else {
        const matchedKeyword = strictDateKeywords.find(keyword => {
          // For single keywords, require more exact matching
          if (keyword === 'date') {
            // 'date' keyword must be standalone or at end of header
            return headerStr === 'date' || headerStr.endsWith(' date') || headerStr.endsWith('date');
          } else {
            // Other keywords can be anywhere but header should make sense as a date
            return headerStr.includes(keyword);
          }
        });
        
        if (matchedKeyword) {
          confidence = 0.8;
          matchType = `Keyword: "${matchedKeyword}"`;
        }
      }
      
      // Strategy 3: Analyze sample data for date patterns - but only if we have some keyword confidence
      if (confidence > 0 && sampleRows.length > 0) {
        let validDates = 0;
        let totalValues = 0;
        
        sampleRows.forEach(row => {
          if (row && row[i] !== null && row[i] !== undefined && row[i] !== '') {
            totalValues++;
            if (getMonthFromDate(row[i])) {
              validDates++;
            }
          }
        });
        
        if (totalValues > 0) {
          const dataConfidence = (validDates / totalValues);
          
          // Boost confidence if data matches keyword prediction
          if (dataConfidence > 0.8) {
            confidence = Math.max(confidence, 0.9);
            matchType += ` + High data confidence (${validDates}/${totalValues})`;
          } else if (dataConfidence > 0.5) {
            confidence = Math.max(confidence, confidence * 0.9);
            matchType += ` + Moderate data confidence (${validDates}/${totalValues})`;
          } else if (dataConfidence < 0.3) {
            // If data doesn't support the keyword match, lower confidence significantly
            confidence *= 0.3;
            matchType += ` - Poor data match (${validDates}/${totalValues})`;
          }
        }
      }
      // Strategy 4: ONLY data analysis (no keyword match) - require very high confidence
      else if (confidence === 0 && sampleRows.length > 0) {
        let validDates = 0;
        let totalValues = 0;
        
        sampleRows.forEach(row => {
          if (row && row[i] !== null && row[i] !== undefined && row[i] !== '') {
            totalValues++;
            if (getMonthFromDate(row[i])) {
              validDates++;
            }
          }
        });
        
        if (totalValues > 0) {
          const dataConfidence = (validDates / totalValues);
          
          // Only accept columns with very high data confidence if no keywords match
          if (dataConfidence > 0.9) {
            confidence = 0.7;
            matchType = `Pure data analysis: ${validDates}/${totalValues} valid dates`;
          }
        }
      }
    }
    
    // Only include columns with reasonable confidence AND not excluded
    if (confidence > 0.7 && !isExcluded) {
      dateColumns.push({
        index: i,
        header: header,
        confidence: confidence,
        matchType: matchType,
        displayName: header
      });
      
      console.log(`Found date column: Index ${i} - "${header}" (confidence: ${confidence.toFixed(3)}, ${matchType})`);
    } else if (confidence > 0) {
      console.log(`Rejected column: Index ${i} - "${header}" (confidence: ${confidence.toFixed(3)}, ${matchType}) - too low confidence`);
    }
  }
  
  // Sort by confidence (highest first)
  dateColumns.sort((a, b) => b.confidence - a.confidence);
  
  console.log(`Found ${dateColumns.length} valid date columns total`);
  console.log('=== END ENHANCED DATE COLUMN DETECTION ===');
  
  return dateColumns;
};

/**
 * Legacy function for backward compatibility - returns the best date column index
 * @param {Array} headerRow - Header row
 * @param {Array} sampleRows - Sample data rows
 * @returns {number} Best date column index or -1
 */
export const findDateColumn = (headerRow, sampleRows = []) => {
  const dateColumns = findAllDateColumns(headerRow, sampleRows);
  return dateColumns.length > 0 ? dateColumns[0].index : -1;
};

/**
 * Count entries by month-year combinations using a specific date column
 * @param {Array} jsonData - Excel data
 * @param {number} dateColumnIndex - Index of the date column to use
 * @returns {Array|null} Month-year counts or null
 */
export const countEntriesByMonthWithColumn = (jsonData, dateColumnIndex) => {
  if (!jsonData || jsonData.length < 2 || dateColumnIndex === -1) {
    console.log("Insufficient data for month counting or invalid date column");
    return null;
  }

  const headerRow = jsonData[0];
  
  console.log('=== MONTH-YEAR COUNTING WITH SPECIFIC COLUMN ===');
  console.log(`Using date column: Index ${dateColumnIndex} - "${headerRow[dateColumnIndex]}"`);
  
  // Initialize month-year tracking
  const monthYearCounts = new Map(); // Key: "YYYY-MM", Value: count
  const monthNames = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
  };
  
  let totalProcessed = 0;
  let validDateCount = 0;
  const failedParses = [];
  
  // Count each row using the specified date column
  for (let i = 1; i < Math.min(jsonData.length, 21); i++) { // Check first 20 rows for debugging
    const row = jsonData[i];
    if (!row) continue;
    
    totalProcessed++;
    const dateValue = row[dateColumnIndex];
    
    const dateResult = getMonthAndYearFromDate(dateValue);
    
    if (dateResult && dateResult.month && dateResult.year) {
      const monthYearKey = `${dateResult.year}-${dateResult.month}`;
      monthYearCounts.set(monthYearKey, (monthYearCounts.get(monthYearKey) || 0) + 1);
      validDateCount++;
    } else {
      // Store failed parses for debugging
      if (failedParses.length < 10) {
        failedParses.push({
          rowIndex: i,
          originalValue: dateValue,
          type: typeof dateValue,
          stringValue: String(dateValue)
        });
      }
    }
  }
  
  // If we have failures in the first 20 rows, log them for debugging
  if (failedParses.length > 0) {
    console.log('=== DATE PARSING FAILURES (first 20 rows) ===');
    failedParses.forEach(failure => {
      console.log(`Row ${failure.rowIndex}: "${failure.originalValue}" (type: ${failure.type})`);
    });
    console.log('=== END PARSING FAILURES ===');
  }
  
  // Now process all remaining rows
  for (let i = 21; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row) continue;
    
    totalProcessed++;
    const dateValue = row[dateColumnIndex];
    
    const dateResult = getMonthAndYearFromDate(dateValue);
    
    if (dateResult && dateResult.month && dateResult.year) {
      const monthYearKey = `${dateResult.year}-${dateResult.month}`;
      monthYearCounts.set(monthYearKey, (monthYearCounts.get(monthYearKey) || 0) + 1);
      validDateCount++;
    }
  }
  
  console.log(`Processed ${totalProcessed} rows, found ${validDateCount} with valid dates`);
  
  // Convert to results format with month-year display names
  const results = Array.from(monthYearCounts.entries())
    .map(([monthYearKey, count]) => {
      const [year, month] = monthYearKey.split('-');
      const monthName = monthNames[month];
      return {
        month: `${monthName} ${year}`, // Display name: "January 2024"
        code: month, // Keep original month code for compatibility
        yearCode: year, // Add year code
        monthYearKey: monthYearKey, // Add combined key for filtering
        count: count
      };
    })
    .sort((a, b) => {
      // Sort by year first, then by month
      const yearCompare = a.yearCode.localeCompare(b.yearCode);
      if (yearCompare !== 0) return yearCompare;
      return a.code.localeCompare(b.code);
    });
  
  console.log("Month-Year counts:", results);
  console.log('=== END MONTH-YEAR COUNTING WITH SPECIFIC COLUMN ===');
  
  return results.length > 0 ? results : null;
};

/**
 * Original count function - uses the best date column automatically
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
  
  // Find the best date column automatically
  const dateColIndex = findDateColumn(headerRow, sampleRows);
  
  if (dateColIndex === -1) {
    console.log("No date column found");
    return null;
  }
  
  return countEntriesByMonthWithColumn(jsonData, dateColIndex);
};

/**
 * Filter rows by month-year combinations using a specific date column
 * @param {Array} adjustedJsonData - Data to filter
 * @param {Array} selectedMonths - Month-year combinations to remove (display names like "January 2024")
 * @param {Array} monthCounts - Month count data with monthYearKey
 * @param {number} dateColumnIndex - Date column index to use for filtering
 * @returns {Array} Filtered data
 */
export const filterRowsByMonths = (adjustedJsonData, selectedMonths, monthCounts, dateColumnIndex) => {
  if (!adjustedJsonData || adjustedJsonData.length === 0) {
    return adjustedJsonData;
  }
  
  console.log('=== MONTH-YEAR FILTERING WITH SPECIFIC COLUMN ===');
  console.log('Selected month-years to exclude:', selectedMonths);
  console.log('Date column index:', dateColumnIndex);
  console.log('Input rows:', adjustedJsonData.length - 1);
  
  if (selectedMonths.length === 0 || dateColumnIndex === -1) {
    console.log('No filtering needed');
    return adjustedJsonData;
  }
  
  // Get month-year keys to remove from the monthCounts data
  const monthYearKeysToRemove = selectedMonths.map(monthDisplay => {
    const foundMonth = monthCounts.find(m => m.month === monthDisplay);
    return foundMonth ? foundMonth.monthYearKey : null;
  }).filter(key => key !== null);
  
  console.log('Month-year keys to remove:', monthYearKeysToRemove);
  
  const filteredData = [adjustedJsonData[0]]; // Keep header
  
  let removedCount = 0;
  let keptCount = 0;
  const removedByMonthYear = {};
  selectedMonths.forEach(month => {
    removedByMonthYear[month] = 0;
  });
  
  for (let i = 1; i < adjustedJsonData.length; i++) {
    const row = adjustedJsonData[i];
    if (!row) continue;
    
    const dateValue = row[dateColumnIndex];
    const trimmedDateValue = dateValue ? String(dateValue).trim() : '';

    // REMOVE rows with blank date
    if (trimmedDateValue === '') {
      removedCount++;
      continue;
    }
    
    const dateResult = getMonthAndYearFromDate(dateValue);
    
    // REMOVE rows with invalid/unparseable dates
    if (!dateResult || !dateResult.month || !dateResult.year) {
      removedCount++;
      continue;
    }
    
    // Create month-year key for this row
    const rowMonthYearKey = `${dateResult.year}-${dateResult.month}`;
    
    // REMOVE rows whose month-year should be excluded
    if (monthYearKeysToRemove.includes(rowMonthYearKey)) {
      removedCount++;
      
      // Find the display name and increment counter
      const monthEntry = monthCounts.find(m => m.monthYearKey === rowMonthYearKey);
      if (monthEntry && removedByMonthYear.hasOwnProperty(monthEntry.month)) {
        removedByMonthYear[monthEntry.month]++;
      }
      continue;
    }
    
    // KEEP row
    filteredData.push(row);
    keptCount++;
  }
  
  console.log('Results:');
  console.log('- Rows removed:', removedCount);
  console.log('- Rows kept:', keptCount);
  console.log('- Output rows:', filteredData.length - 1);
  
  console.log('Verification:');
  Object.entries(removedByMonthYear).forEach(([monthYear, actualRemoved]) => {
    const expectedCount = monthCounts.find(m => m.month === monthYear)?.count || 0;
    console.log(`- ${monthYear}: Removed ${actualRemoved}, Expected ${expectedCount}`);
    
    if (actualRemoved === expectedCount) {
      console.log(`  ✅ Perfect match`);
    } else {
      console.error(`  ❌ MISMATCH! Off by ${Math.abs(actualRemoved - expectedCount)}`);
    }
  });
  
  console.log('=== END MONTH-YEAR FILTERING WITH SPECIFIC COLUMN ===');
  
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