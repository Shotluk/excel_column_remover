// excelExport.js - Updated functions for exporting Excel files with new columns support

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Export data using XLSX library (basic export without borders)
 * @param {Array} processedData - Processed data array
 * @returns {ArrayBuffer} Excel file as binary data
 */
export const exportWithXLSX = (processedData) => {
  // Create a new workbook
  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.aoa_to_sheet(processedData);
  
  // Set column widths to better fit content
  const maxWidth = 100; // Maximum width in Excel units
  const defaultWidth = 12; // Default column width
  
  // Initialize column widths object
  if (!newSheet['!cols']) newSheet['!cols'] = [];
  
  // If we have data, adjust column widths based on content
  if (processedData.length > 0) {
    // For each column
    for (let colIdx = 0; colIdx < processedData[0].length; colIdx++) {
      // Check header length first
      let maxLength = processedData[0][colIdx] ? 
        String(processedData[0][colIdx]).length : 0;
      
      // Check first few data rows (limit to prevent performance issues)
      const rowsToCheck = Math.min(20, processedData.length);
      for (let rowIdx = 1; rowIdx < rowsToCheck; rowIdx++) {
        if (processedData[rowIdx] && processedData[rowIdx][colIdx]) {
          const cellLength = String(processedData[rowIdx][colIdx]).length;
          maxLength = Math.max(maxLength, cellLength);
        }
      }
      
      // Calculate width: roughly 0.8 characters per Excel width unit, plus some padding
      const calculatedWidth = Math.min(maxWidth, Math.max(defaultWidth, Math.ceil(maxLength * 0.8) + 2));
      newSheet['!cols'][colIdx] = { width: calculatedWidth };
    }
  }
  
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
  
  // Convert to binary
  const excelBinary = XLSX.write(newWorkbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  });
  
  return excelBinary;
};

/**
 * Identify table rows vs metadata/footer rows
 * @param {Array} data - Excel data array
 * @returns {Array} Array of row indices that are part of the main table
 */
const identifyTableRows = (data) => {
  const tableRowIndices = [];
  const headerRow = data[0];
  const headerCellCount = headerRow ? headerRow.length : 0;
  
  // Consider header row as part of the table
  tableRowIndices.push(0);
  
  // Check each data row
  for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!row) continue;
    
    // Check if this looks like a data row (has similar structure to header)
    // Criteria: Has at least half as many cells as the header row
    // and doesn't contain typical footer text like "Page"
    const cellCount = row.filter(cell => cell !== undefined && cell !== null && cell !== '').length;
    const isLikelyFooter = row.some(cell => 
      cell && typeof cell === 'string' && 
      (cell.includes('Page') || cell.includes('of ') || 
       cell.match(/^\d+\s*of\s*\d+$/i) || // "1 of 5" pattern
       cell.match(/^-?\d+$/) && parseInt(cell) < 100) // Just a small number by itself
    );
    
    if (cellCount >= headerCellCount / 2 && !isLikelyFooter) {
      tableRowIndices.push(rowIndex);
    }
  }
  
  console.log("Identified table rows:", tableRowIndices);
  return tableRowIndices;
};


/**
 * Identify date columns by header names
 * @param {Array} headerRow - First row containing headers
 * @returns {Array} Array of column indices that contain dates
 */
const identifyDateColumns = (headerRow) => {
  const dateColumnIndices = [];
  
  if (headerRow && headerRow.length > 0) {
    headerRow.forEach((header, index) => {
      if (header && typeof header === 'string' && 
          (header.toLowerCase().includes('date') || 
           header.toLowerCase().includes('time') ||
           header.toLowerCase().includes('submission'))) {
        dateColumnIndices.push(index);
      }
    });
  }
  
  console.log("Identified date columns at indices:", dateColumnIndices);
  return dateColumnIndices;
};

/**
 * Identify amount columns by header names
 * @param {Array} headerRow - First row containing headers
 * @returns {Array} Array of column indices that contain amounts
 */
const identifyAmountColumns = (headerRow) => {
  const amountColumnIndices = [];
  
  if (headerRow && headerRow.length > 0) {
    headerRow.forEach((header, index) => {
      if (header && typeof header === 'string' && 
          (header.toLowerCase().includes('amount') || 
           header.toLowerCase().includes('amt') ||
           header.toLowerCase().includes('price') ||
           header.toLowerCase().includes('cost') ||
           header.toLowerCase().includes('recieved'))) {
        amountColumnIndices.push(index);
      }
    });
  }
  
  console.log("Identified amount columns at indices:", amountColumnIndices);
  return amountColumnIndices;
};

/**
 * Export data using ExcelJS library (with borders and advanced formatting)
 * @param {Array} data - Data array to export
 * @param {string} fileName - Original filename for download naming
 * @param {Array} selectedMonths - Selected months for filename
 * @returns {Promise<void>} Downloads the file directly
 */
// Updated exportWithBordersUsingExcelJS function with fixed border application logic

export const exportWithBordersUsingExcelJS = async (data, fileName, selectedMonths = []) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    // Identify date columns and amount columns
    const dateColumnIndices = identifyDateColumns(data[0]);
    const amountColumnIndices = identifyAmountColumns(data[0]);
    
    // Add header row
    if (data.length > 0 && data[0]) {
      const headerRow = worksheet.addRow(data[0]);
      
      // Style header row
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });
    }
    
    // Add data rows with special handling for date and amount columns
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row) continue;
      
      const newRow = worksheet.addRow(row);
      
      // Apply special formatting to date columns
      dateColumnIndices.forEach(colIndex => {
        if (colIndex < row.length) {
          const cell = newRow.getCell(colIndex + 1); // +1 because ExcelJS is 1-indexed
          const value = row[colIndex];
          
          // Check if it's a numeric string that could be an Excel date serial
          if (value && !isNaN(value)) {
            const numValue = parseFloat(value);
            // Excel date serial numbers are typically in this range
            if (numValue > 40000 && numValue < 50000) {
              // Convert Excel serial number to JavaScript Date
              const excelEpoch = new Date(1899, 11, 30); // Excel's epoch
              const millisecondsPerDay = 24 * 60 * 60 * 1000;
              const dateObj = new Date(excelEpoch.getTime() + numValue * millisecondsPerDay);
              
              // Store as Date object but with specific formatting
              cell.value = dateObj;
              cell.numFmt = 'dd/mm/yyyy h:mm:ss AM/PM';
            }
          }
        }
      });
      
      // Apply formatting to amount columns
      amountColumnIndices.forEach(colIndex => {
        if (colIndex < row.length) {
          const cell = newRow.getCell(colIndex + 1);
          // Apply number formatting
          cell.numFmt = '#,##0.00';
        }
      });
    }
    
    // Apply borders to ALL cells - removing the conditional check that was causing issues
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });
    });
    
    // Set column widths automatically
    worksheet.columns.forEach((column, i) => {
      
      // For date columns, set wider
      if (dateColumnIndices.includes(i)) {
        column.width = 22; // Wide enough for date + time format
      } 
      // For amount columns, set standard width
      else if (amountColumnIndices.includes(i)) {
        column.width = 15;
      }
      // For other columns, calculate based on content
      else {
        let maxLength = 15;
        // column.eachCell({ includeEmpty: true }, (cell) => {
        //   const val = cell.value ? cell.value.toString() : '';
        //   maxLength = Math.max(maxLength, val.length);
        // });
        column.width = maxLength + 2;
      }
    });
    
    // Create and download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    
    let downloadName = `modified_${fileName}`;
    
    // Add info about what was removed to the filename
    if (selectedMonths.length > 0) {
      downloadName = `without_${selectedMonths.join('_')}_${fileName}`;
    }
    
    downloadFile(blob, downloadName);
  } catch (error) {
    console.error('Error with ExcelJS:', error);
    throw new Error('Error with ExcelJS: ' + error.message + '. Consider using basic export.');
  }
};

/**
 * Download a blob as a file
 * @param {Blob} blob - File blob to download
 * @param {string} filename - Name for the downloaded file
 */
export const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Create download for XLSX exported data
 * @param {ArrayBuffer} processedData - Binary Excel data
 * @param {string} fileName - Original filename
 * @param {Array} selectedMonths - Selected months for filename
 */
export const downloadXLSXFile = (processedData, fileName, selectedMonths = []) => {
  const blob = new Blob([processedData], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  let downloadName = `modified_${fileName}`;
  
  // Add info about what was removed to the filename
  if (selectedMonths.length > 0) {
    downloadName = `without_${selectedMonths.join('_')}_${fileName}`;
  }
  
  downloadFile(blob, downloadName);
};