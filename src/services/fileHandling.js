
import * as XLSX from 'xlsx';
import { findHeaderRow } from '../utils/headerDetection.js';
import { countEntriesByMonth, findDateColumn } from './dateUtilities.js';

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
 * Parse Excel file and extract data with header detection
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
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1,raw: true });
        
        
        console.log('=== FILE PARSING DEBUG ===');
        
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
        console.log('Sample adjusted data (first 3 rows):', adjustedJsonData.slice(0, 3));
        
        // Count entries by month with enhanced detection
        console.log('=== MONTH COUNTING DEBUG ===');
        const monthData = countEntriesByMonth(adjustedJsonData);
        
        if (monthData) {
          console.log('Successfully found month data:', monthData);
        } else {
          console.log('No month data found - checking manual date column detection...');
          
          // Try manual detection with sample data
          const sampleRows = adjustedJsonData.slice(1, Math.min(6, adjustedJsonData.length));
          const dateColIndex = findDateColumn(headerRow, sampleRows);
          
          console.log('Manual date column detection result:', dateColIndex);
          if (dateColIndex !== -1) {
            console.log('Date column header:', headerRow[dateColIndex]);
            console.log('Sample date values:', sampleRows.map(row => row ? row[dateColIndex] : null));
          }
        }
        
        // Find date column index for later use (with improved detection)
        const sampleRows = adjustedJsonData.slice(1, Math.min(6, adjustedJsonData.length));
        const dateColumnIndex = findDateColumn(headerRow, sampleRows);
        console.log('Date value at row 5:', jsonData[5][dateColumnIndex]);
        const sampleDates = adjustedJsonData.slice(1, 10).map(row => {
          if (!row) return null;
          const val = row[dateColumnIndex];
          return { val, type: typeof val, isDate: val instanceof Date };
        });
        console.log('Sample date types and values:', sampleDates);

        
        console.log('Final date column index:', dateColumnIndex);
        console.log('=== END DEBUG ===');
        
        resolve({
          jsonData,
          headers: headerRow,
          headerRowIndex,
          monthCounts: monthData,
          dateColumnIndex,
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
    console.log('File upload successful, calling onSuccess with:', {
      fileName: parsedData.fileName,
      headerCount: parsedData.headers.length,
      monthCountsLength: parsedData.monthCounts ? parsedData.monthCounts.length : 0,
      dateColumnIndex: parsedData.dateColumnIndex
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
 * Reset all file-related state
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
    jsonData: null,
    headerRowIndex: 0,
    error: ''
  };
};