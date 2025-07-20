// Enhanced fileHandling.js - Multiple date column detection

import * as XLSX from 'xlsx';
import { findHeaderRow } from '../utils/headerDetection.js';
import { countEntriesByMonth, findAllDateColumns, countEntriesByMonthWithColumn } from './dateUtilities.js';

/**
 * Validate uploaded file type
 * @param {File} file - The uploaded file
 * @returns {boolean} True if file type is valid
 */
export const validateFileType = (file) => {
  if (!file) return false;
  
  const fileExt = file.name.split('.').pop().toLowerCase();
  return ['xlsx', 'xls', 'csv'].includes(fileExt);
};

/**
 * Parse Excel file and extract data with enhanced date column detection
 * @param {File} file - The uploaded Excel file
 * @returns {Promise<Object>} Object containing parsed data and metadata
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true });
        
        console.log('=== ENHANCED FILE PARSING DEBUG ===');
        console.log('File name:', file.name);
        console.log('Total rows in file:', jsonData.length);
        console.log('First 3 rows:', jsonData.slice(0, 3));
        
        if (jsonData.length === 0) {
          reject(new Error('The file appears to be empty'));
          return;
        }
        
        // Use improved header detection logic
        const headerRowIndex = findHeaderRow(jsonData);
        const headerRow = jsonData[headerRowIndex];
        
        console.log('Detected header row index:', headerRowIndex);
        console.log('Header row:', headerRow);
        
        if (!headerRow || headerRow.length === 0) {
          reject(new Error('Could not detect headers in the file'));
          return;
        }
        
        // Create adjusted data with the correct header row
        const adjustedJsonData = [
          headerRow,
          ...jsonData.slice(headerRowIndex + 1)
        ];
        
        console.log('Adjusted data length:', adjustedJsonData.length);
        
        // Enhanced date column detection - find ALL date columns
        const sampleRows = adjustedJsonData.slice(1, Math.min(6, adjustedJsonData.length));
        const allDateColumns = findAllDateColumns(headerRow, sampleRows);
        
        console.log('=== ALL DATE COLUMNS FOUND ===');
        console.log('Total date columns found:', allDateColumns.length);
        allDateColumns.forEach((col, index) => {
          console.log(`${index + 1}. ${col.header} (Index: ${col.index}, Confidence: ${col.confidence.toFixed(3)})`);
        });
        
        // Use the best date column for initial month counting (backward compatibility)
        const primaryDateColumnIndex = allDateColumns.length > 0 ? allDateColumns[0].index : -1;
        
        // Count entries by month using the primary date column
        let monthData = null;
        if (primaryDateColumnIndex !== -1) {
          monthData = countEntriesByMonthWithColumn(adjustedJsonData, primaryDateColumnIndex);
          console.log('Primary date column month data:', monthData);
        }
        
        console.log('=== END ENHANCED FILE PARSING DEBUG ===');
        
        resolve({
          jsonData,
          headers: headerRow,
          headerRowIndex,
          monthCounts: monthData,
          dateColumnIndex: primaryDateColumnIndex, // Keep for backward compatibility
          allDateColumns: allDateColumns, // NEW: All detected date columns
          selectedDateColumnIndex: primaryDateColumnIndex, // NEW: Currently selected date column
          fileName: file.name
        });
        
      } catch (error) {
        console.error('Error processing file:', error);
        reject(new Error('Error processing file. Please try a different file.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Handle file upload with validation and parsing
 * @param {Event} event - File input change event
 * @param {Function} onSuccess - Success callback with parsed data
 * @param {Function} onError - Error callback with error message
 * @param {Function} onLoadingStart - Loading start callback
 * @param {Function} onLoadingEnd - Loading end callback
 */
export const handleFileUpload = async (event, onSuccess, onError, onLoadingStart, onLoadingEnd) => {
  const file = event.target.files[0];
  
  // Reset any previous state
  onError('');
  
  if (!file) return;
  
  if (!validateFileType(file)) {
    onError('Please upload an Excel or CSV file');
    return;
  }
  
  console.log('Starting file upload for:', file.name);
  onLoadingStart();
  
  try {
    const parsedData = await parseExcelFile(file);
    console.log('File upload successful, enhanced data:', {
      fileName: parsedData.fileName,
      headerCount: parsedData.headers.length,
      monthCountsLength: parsedData.monthCounts ? parsedData.monthCounts.length : 0,
      dateColumnIndex: parsedData.dateColumnIndex,
      allDateColumnsCount: parsedData.allDateColumns.length,
      selectedDateColumnIndex: parsedData.selectedDateColumnIndex
    });
    onSuccess(parsedData);
  } catch (error) {
    console.error('File upload error:', error);
    onError(error.message);
  } finally {
    onLoadingEnd();
  }
};

/**
 * Reset all file-related state including new date column fields
 * @returns {Object} Reset state object
 */
export const resetFileState = () => {
  return {
    file: null,
    headers: [],
    selectedHeaders: [],
    processedData: null,
    fileName: '',
    monthCounts: null,
    selectedMonths: [],
    dateColumnIndex: -1,
    allDateColumns: [], // NEW
    selectedDateColumnIndex: -1, // NEW
    jsonData: null,
    headerRowIndex: 0,
    error: ''
  };
};