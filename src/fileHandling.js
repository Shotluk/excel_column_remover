// fileHandling.js - Functions for handling file upload and Excel parsing

import * as XLSX from 'xlsx';
import { findHeaderRow } from './headerDetection.js';
import { countEntriesByMonth } from './dateUtilities.js';

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
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        console.log('Parsed JSON Data:', jsonData);
        if (jsonData.length === 0) {
          reject(new Error('The file appears to be empty'));
          return;
        }
        
        // Use improved header detection logic
        const headerRowIndex = findHeaderRow(jsonData);
        const headerRow = jsonData[headerRowIndex];
        
        if (!headerRow || headerRow.length === 0) {
          reject(new Error('Could not detect headers in the file'));
          return;
        }
        
        // Create adjusted data with the correct header row
        const adjustedJsonData = [
          headerRow,
          ...jsonData.slice(headerRowIndex + 1)
        ];
        
        // Count entries by month
        const monthData = countEntriesByMonth(adjustedJsonData);
        
        // Find date column index for later use
        const dateColumnIndex = headerRow.findIndex(
          header => header === 'Date' || header.toLowerCase() === 'date'
        );
        
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
  
  onLoadingStart();
  
  try {
    const parsedData = await parseExcelFile(file);
    onSuccess(parsedData);
  } catch (error) {
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