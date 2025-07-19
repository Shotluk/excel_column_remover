// excelExport.js - Updated with ID column handling to prevent unwanted numeric formatting

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Identify ID columns by header names to prevent numeric formatting
 * @param {Array} headerRow - First row containing headers
 * @returns {Array} Array of column indices that should be treated as IDs/text
 */
const identifyIdColumns = (headerRow) => {
  const idColumnIndices = [];
  
  if (headerRow && headerRow.length > 0) {
    headerRow.forEach((header, index) => {
      if (header && typeof header === 'string') {
        // Common patterns for ID columns - look for keywords or patterns
        const idPatterns = [
          /id$/i,          // Ends with 'id' (case insensitive)
          /^id/i,          // Starts with 'id'
          /no$/i,          // Ends with 'no'
          /number$/i,      // Ends with 'number'
          /code$/i,        // Ends with 'code'
          /^bill/i,        // Starts with 'bill'
          /^file/i,        // Starts with 'file'
          /^card/i,        // Starts with 'card'
          /^claim/i,       // Starts with 'claim'
          /^ref/i,         // Starts with 'ref'
          /^account/i,     // Starts with 'account'
          /^customer/i,    // Starts with 'customer'
          /^policy/i,      // Starts with 'policy'
          /^order/i,       // Starts with 'order'
          /^invoice/i,     // Starts with 'invoice'
        ];
        
        // Check if header matches any ID patterns
        if (idPatterns.some(pattern => pattern.test(header))) {
          idColumnIndices.push(index);
        }
      }
    });
  }
  
  console.log("Identified ID columns at indices:", idColumnIndices);
  return idColumnIndices;
};

/**
 * Calculate appropriate column widths based on content
 * @param {Array} data - 2D array of data 
 * @param {number} maxSampleRows - Maximum number of rows to check (for performance)
 * @returns {Array} Array of column widths
 */
const calculateColumnWidths = (data, maxSampleRows = 100) => {
  if (!data || data.length === 0 || !data[0]) return [];
  
  const widths = Array(data[0].length).fill(10); // Default minimum width
  const headerRow = data[0];
  
  // Factor to convert character count to Excel column width
  // Excel column width is based on the number of characters in the default font
  const charWidthFactor = 1.2;
  const minWidth = 8;
  const maxWidth = 50;
  const padding = 2; // Extra space for padding
  
  // Start with headers
  headerRow.forEach((header, colIndex) => {
    if (header) {
      const headerLength = String(header).length;
      widths[colIndex] = Math.max(widths[colIndex], 
        Math.min(maxWidth, Math.ceil(headerLength * charWidthFactor) + padding));
    }
  });
  
  // Check data rows (limit the number of rows to check for performance)
  const rowsToCheck = Math.min(maxSampleRows, data.length);
  
  for (let rowIndex = 1; rowIndex < rowsToCheck; rowIndex++) {
    const row = data[rowIndex];
    if (!row) continue;
    
    row.forEach((cell, colIndex) => {
      if (cell !== null && cell !== undefined) {
        let cellLength;
        
        // Handle different data types
        if (typeof cell === 'number') {
          // For numbers, estimate the display width
          cellLength = String(cell).length;
          
          // If it's a floating point number, add space for decimal places
          if (cell % 1 !== 0) {
            cellLength = Math.max(cellLength, String(cell.toFixed(2)).length);
          }
        } else if (cell instanceof Date) {
          // For dates, estimate a fixed width (e.g., "DD/MM/YYYY" format)
          cellLength = 12; 
        } else {
          // For strings and other types
          cellLength = String(cell).length;
        }
        
        // Update column width if this cell is wider
        widths[colIndex] = Math.max(widths[colIndex], 
          Math.min(maxWidth, Math.ceil(cellLength * charWidthFactor) + padding));
      }
    });
  }
  
  return widths;
};

/**
 * Export data using XLSX library with auto-width columns
 * @param {Array} processedData - Processed data array
 * @returns {ArrayBuffer} Excel file as binary data
 */
export const exportWithXLSX = (processedData) => {
  // Create a new workbook
  const newWorkbook = XLSX.utils.book_new();
  
  // Identify ID columns to format as text
  const headerRow = processedData[0] || [];
  const idColumns = identifyIdColumns(headerRow);
  
  // Convert to worksheet with specific formatting
  const newSheet = XLSX.utils.aoa_to_sheet(processedData);
  
  // Apply text format to ID columns
  idColumns.forEach(colIndex => {
    const colLetter = XLSX.utils.encode_col(colIndex);
    
    // Format all cells in this column as text
    for (let rowIndex = 1; rowIndex < processedData.length; rowIndex++) {
      const cellRef = colLetter + (rowIndex + 1); // +1 because XLSX is 1-indexed for rows
      
      if (newSheet[cellRef]) {
        // Ensure cell has a format object
        if (!newSheet[cellRef].z) {
          newSheet[cellRef].z = '@'; // '@' is the Excel format code for Text
        }
      }
    }
  });
  
  // Calculate optimal column widths
  const columnWidths = calculateColumnWidths(processedData);
  
  // Set column widths
  newSheet['!cols'] = columnWidths.map(width => ({ width }));
  
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
  
  // Convert to binary
  const excelBinary = XLSX.write(newWorkbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  });
  
  return excelBinary;
};

/**
 * Calculate optimal column width for ExcelJS
 * This is more accurate as it can use the actual font metrics
 * @param {ExcelJS.Worksheet} worksheet - The worksheet 
 * @param {Array} data - The data as 2D array
 */
const applyOptimalColumnWidths = (worksheet, data) => {
  const columnWidths = calculateColumnWidths(data);
  
  // Apply calculated widths to worksheet columns
  columnWidths.forEach((width, i) => {
    const col = worksheet.getColumn(i + 1); // ExcelJS uses 1-based indexing
    col.width = width;
  });
};

/**
 * Identify date columns by header names and content analysis
 * @param {Array} data - Full data array with header row
 * @returns {Array} Array of column indices that contain dates
 */
const identifyDateColumns = (data) => {
  if (!data || data.length < 2) return [];
  
  const dateColumnIndices = [];
  const headerRow = data[0];
  
  // First pass: check headers for date-related keywords
  headerRow.forEach((header, index) => {
    if (header && typeof header === 'string' && 
        (header.toLowerCase().includes('date') || 
         header.toLowerCase().includes('time') ||
         header.toLowerCase().includes('submission'))) {
      dateColumnIndices.push(index);
    }
  });
  
  // Second pass: analyze content for date patterns
  // We'll only check a few rows for performance
  const rowsToCheck = Math.min(10, data.length - 1);
  
  for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
    // Skip already identified date columns
    if (dateColumnIndices.includes(colIndex)) continue;
    
    let datePatternMatches = 0;
    let rowsWithContent = 0;
    
    for (let rowIndex = 1; rowIndex <= rowsToCheck; rowIndex++) {
      const row = data[rowIndex];
      if (!row || !row[colIndex]) continue;
      
      const cellValue = row[colIndex];
      rowsWithContent++;
      
      // Check if it's already a date object
      if (cellValue instanceof Date) {
        datePatternMatches++;
        continue;
      }
      
      // Check for common date patterns in strings
      if (typeof cellValue === 'string') {
        // Various date formats: DD/MM/YYYY, MM-DD-YYYY, YYYY-MM-DD, etc.
        const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/;
        if (datePattern.test(cellValue)) {
          datePatternMatches++;
        }
      }
      
      // Check for Excel date serial numbers (numbers within a certain range)
      if (typeof cellValue === 'number') {
        // Excel date serial numbers typically fall within this range
        if (cellValue > 25000 && cellValue < 50000) {
          datePatternMatches++;
        }
      }
    }
    
    // If most of the cells in this column match date patterns, consider it a date column
    if (rowsWithContent > 0 && datePatternMatches / rowsWithContent > 0.6) {
      dateColumnIndices.push(colIndex);
    }
  }
  
  console.log("Identified date columns at indices:", dateColumnIndices);
  return dateColumnIndices;
};

/**
 * Identify numeric/amount columns by header names and content analysis
 * @param {Array} data - Full data array with header row
 * @param {Array} idColumns - Array of column indices that are ID columns (to exclude)
 * @returns {Array} Array of column indices that contain amounts
 */
const identifyAmountColumns = (data, idColumns = []) => {
  if (!data || data.length < 2) return [];
  
  const amountColumnIndices = [];
  const headerRow = data[0];
  
  // First pass: check headers for amount-related keywords
  headerRow.forEach((header, index) => {
    // Skip ID columns - they should never be treated as amount columns
    if (idColumns.includes(index)) return;
    
    if (header && typeof header === 'string' && 
        (header.toLowerCase().includes('amount') || 
         header.toLowerCase().includes('amt') ||
         header.toLowerCase().includes('price') ||
         header.toLowerCase().includes('cost') ||
         header.toLowerCase().includes('fee') ||
         header.toLowerCase().includes('total') ||
         header.toLowerCase().includes('sum') ||
         header.toLowerCase().includes('recieved'))) {
      amountColumnIndices.push(index);
    }
  });
  
  // Second pass: analyze content for numeric patterns
  // We'll only check a few rows for performance
  const rowsToCheck = Math.min(10, data.length - 1);
  
  for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
    // Skip already identified amount columns or ID columns
    if (amountColumnIndices.includes(colIndex) || idColumns.includes(colIndex)) continue;
    
    let numericValueCount = 0;
    let rowsWithContent = 0;
    
    for (let rowIndex = 1; rowIndex <= rowsToCheck; rowIndex++) {
      const row = data[rowIndex];
      if (!row || row[colIndex] === undefined || row[colIndex] === null) continue;
      
      const cellValue = row[colIndex];
      rowsWithContent++;
      
      // Check if it's a number
      if (typeof cellValue === 'number') {
        numericValueCount++;
        continue;
      }
      
      // Check for currency/numeric patterns in strings
      if (typeof cellValue === 'string') {
        // Currency pattern: optional currency symbol, digits, optional decimal point, more digits
        const currencyPattern = /^[$€£¥]?\s*\d+(\.\d+)?$/;
        // Numeric pattern with commas: 1,234.56
        const numericPattern = /^-?\s*\d{1,3}(,\d{3})*(\.\d+)?$/;
        
        if (currencyPattern.test(cellValue) || numericPattern.test(cellValue)) {
          numericValueCount++;
        }
      }
    }
    
    // If most of the cells in this column are numeric, consider it an amount column
    if (rowsWithContent > 0 && numericValueCount / rowsWithContent > 0.6) {
      amountColumnIndices.push(colIndex);
    }
  }
  
  console.log("Identified amount columns at indices:", amountColumnIndices);
  return amountColumnIndices;
};

/**
 * Export data using ExcelJS library with smart formatting and auto-width columns
 * @param {Array} data - Data array to export
 * @param {string} fileName - Original filename for download naming
 * @param {Array} selectedMonths - Selected months for filename
 * @returns {Promise<void>} Downloads the file directly
 */
export const exportWithBordersUsingExcelJS = async (data, fileName, selectedMonths = []) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    // Identify special columns using our enhanced detection
    const headerRow = data[0] || [];
    const idColumnIndices = identifyIdColumns(headerRow);
    const dateColumnIndices = identifyDateColumns(data);
    const amountColumnIndices = identifyAmountColumns(data, idColumnIndices);
    
    // Add all rows first
    data.forEach((row, rowIndex) => {
      if (!row) return;
      
      const excelRow = worksheet.addRow(row);
      
      // Special formatting for header row
      if (rowIndex === 0) {
        excelRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
          };
          cell.alignment = { 
            vertical: 'middle', 
            horizontal: 'center',
            wrapText: true
          };
        });
      } 
      // Special formatting for data rows
      else {
        // Format ID columns as text to prevent numeric formatting
        idColumnIndices.forEach(colIndex => {
          if (colIndex < row.length) {
            const cell = excelRow.getCell(colIndex + 1);
            const value = row[colIndex];
            
            // Preserve the original value but enforce text format
            if (value !== null && value !== undefined) {
              // For numbers, convert to string to preserve exact value
              if (typeof value === 'number') {
                cell.value = String(value);
              } else {
                cell.value = value;
              }
              
              // Explicitly set format to text
              cell.numFmt = '@';
            }
          }
        });
        
        // Apply special formatting to date columns
        dateColumnIndices.forEach(colIndex => {
          if (colIndex < row.length && !idColumnIndices.includes(colIndex)) {
            const cell = excelRow.getCell(colIndex + 1);
            const value = row[colIndex];
            
            // Handle various date formats
            if (value instanceof Date) {
              // Already a date object
              cell.value = value;
              cell.numFmt = 'dd/mm/yyyy';
            } else if (typeof value === 'number' && value > 25000 && value < 50000) {
              // Excel date serial number
              const excelEpoch = new Date(1899, 11, 30);
              const millisecondsPerDay = 24 * 60 * 60 * 1000;
              const dateObj = new Date(excelEpoch.getTime() + value * millisecondsPerDay);
              
              cell.value = dateObj;
              cell.numFmt = 'dd/mm/yyyy';
            } else if (typeof value === 'string') {
              cell.value = value;            // Keep as original text
              cell.numFmt = '@';             // Format as text

            }
          }
        });
        
        // Apply formatting to amount columns
        amountColumnIndices.forEach(colIndex => {
          if (colIndex < row.length && !idColumnIndices.includes(colIndex)) {
            const cell = excelRow.getCell(colIndex + 1);
            const value = row[colIndex];
            
            // Handle various number formats
            if (typeof value === 'number') {
              cell.numFmt = '#,##0.00';
            } else if (typeof value === 'string') {
              // Try to parse currency strings
              const currencyMatch = value.match(/^[$€£¥]?\s*(\d+(?:\.\d+)?)$/);
              if (currencyMatch) {
                try {
                  cell.value = parseFloat(currencyMatch[1]);
                  cell.numFmt = '#,##0.00';
                } catch (e) {
                  // If parsing fails, keep as string
                }
              }
            }
          }
        });
      }
    });
    
    // Apply auto-fit column widths based on content
    applyOptimalColumnWidths(worksheet, data);
    
    // Apply borders to ALL cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
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

// Add these functions to excelExport.js

/**
 * Export separated month data with advanced styling using ExcelJS
 * @param {Object} separatedData - Separated month data with headerRow and monthsWithData
 * @param {string} fileName - Original filename for download naming
 * @param {boolean} useBorders - Whether to apply borders and styling
 * @returns {Promise<void>} Downloads the file directly
 */
export const exportSeparatedDataWithStyling = async (separatedData, fileName, useBorders = true) => {
  if (useBorders) {
    // Use ExcelJS for advanced styling with borders
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Identify special columns for consistent formatting across all sheets
      const headerRow = separatedData.headerRow || [];
      const idColumnIndices = identifyIdColumns(headerRow);
      const dateColumnIndices = identifyDateColumns([headerRow, ...(separatedData.monthsWithData[0]?.rows.slice(0, 10) || [])]);
      const amountColumnIndices = identifyAmountColumns([headerRow, ...(separatedData.monthsWithData[0]?.rows.slice(0, 10) || [])], idColumnIndices);
      
      // Create a sheet for each month
      for (const month of separatedData.monthsWithData) {
        const worksheet = workbook.addWorksheet(month.name);
        const sheetData = [separatedData.headerRow, ...month.rows];
        
        // Add all rows first
        sheetData.forEach((row, rowIndex) => {
          if (!row) return;
          
          const excelRow = worksheet.addRow(row);
          
          // Special formatting for header row
          if (rowIndex === 0) {
            excelRow.eachCell((cell) => {
              cell.font = { bold: true };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
              };
              cell.alignment = { 
                vertical: 'middle', 
                horizontal: 'center',
                wrapText: true
              };
            });
          } 
          // Special formatting for data rows
          else {
            // Format ID columns as text to prevent numeric formatting
            idColumnIndices.forEach(colIndex => {
              if (colIndex < row.length) {
                const cell = excelRow.getCell(colIndex + 1);
                const value = row[colIndex];
                
                if (value !== null && value !== undefined) {
                  if (typeof value === 'number') {
                    cell.value = String(value);
                  } else {
                    cell.value = value;
                  }
                  cell.numFmt = '@';
                }
              }
            });
            
            // Apply special formatting to date columns
            dateColumnIndices.forEach(colIndex => {
              if (colIndex < row.length && !idColumnIndices.includes(colIndex)) {
                const cell = excelRow.getCell(colIndex + 1);
                const value = row[colIndex];
                
                if (value instanceof Date) {
                  cell.value = value;
                  cell.numFmt = 'dd/mm/yyyy';
                } else if (typeof value === 'number' && value > 25000 && value < 50000) {
                  const excelEpoch = new Date(1899, 11, 30);
                  const millisecondsPerDay = 24 * 60 * 60 * 1000;
                  const dateObj = new Date(excelEpoch.getTime() + value * millisecondsPerDay);
                  
                  cell.value = dateObj;
                  cell.numFmt = 'dd/mm/yyyy';
                } else if (typeof value === 'string') {
                  cell.value = value;
                  cell.numFmt = '@';
                }
              }
            });
            
            // Apply formatting to amount columns
            amountColumnIndices.forEach(colIndex => {
              if (colIndex < row.length && !idColumnIndices.includes(colIndex)) {
                const cell = excelRow.getCell(colIndex + 1);
                const value = row[colIndex];
                
                if (typeof value === 'number') {
                  cell.numFmt = '#,##0.00';
                } else if (typeof value === 'string') {
                  const currencyMatch = value.match(/^[$€£¥]?\s*(\d+(?:\.\d+)?)$/);
                  if (currencyMatch) {
                    try {
                      cell.value = parseFloat(currencyMatch[1]);
                      cell.numFmt = '#,##0.00';
                    } catch (e) {
                      // If parsing fails, keep as string
                    }
                  }
                }
              }
            });
          }
        });
        
        // Apply auto-fit column widths based on content
        applyOptimalColumnWidths(worksheet, sheetData);
        
        // Apply borders to ALL cells
        worksheet.eachRow((row) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } }
            };
          });
        });
      }
      
      // Create and download the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `separated_by_months_styled_${fileName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error with ExcelJS styling:', error);
      // Fallback to basic XLSX export
      exportSeparatedDataBasic(separatedData, fileName);
    }
  } else {
    // Use basic XLSX export
    exportSeparatedDataBasic(separatedData, fileName);
  }
};

/**
 * Export separated month data using basic XLSX library
 * @param {Object} separatedData - Separated month data with headerRow and monthsWithData
 * @param {string} fileName - Original filename for download naming
 */
export const exportSeparatedDataBasic = (separatedData, fileName) => {
  const workbook = XLSX.utils.book_new();
  
  separatedData.monthsWithData.forEach(month => {
    // Create data for this month (header + rows)
    const sheetData = [separatedData.headerRow, ...month.rows];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Calculate column widths for better display
    const columnWidths = [];
    if (sheetData.length > 0) {
      for (let colIndex = 0; colIndex < sheetData[0].length; colIndex++) {
        let maxLength = 10; // minimum width
        
        // Check header length
        if (sheetData[0][colIndex]) {
          maxLength = Math.max(maxLength, String(sheetData[0][colIndex]).length);
        }
        
        // Check a few data rows for optimal width
        for (let rowIndex = 1; rowIndex < Math.min(11, sheetData.length); rowIndex++) {
          if (sheetData[rowIndex] && sheetData[rowIndex][colIndex]) {
            maxLength = Math.max(maxLength, String(sheetData[rowIndex][colIndex]).length);
          }
        }
        
        columnWidths.push({ width: Math.min(maxLength + 2, 50) }); // Add padding, max 50
      }
      
      worksheet['!cols'] = columnWidths;
    }
    
    // Identify ID columns to format as text
    const headerRow = sheetData[0] || [];
    const idColumns = identifyIdColumns(headerRow);
    
    // Apply text format to ID columns
    idColumns.forEach(colIndex => {
      const colLetter = XLSX.utils.encode_col(colIndex);
      
      // Format all cells in this column as text
      for (let rowIndex = 1; rowIndex < sheetData.length; rowIndex++) {
        const cellRef = colLetter + (rowIndex + 1); // +1 because XLSX is 1-indexed for rows
        
        if (worksheet[cellRef]) {
          if (!worksheet[cellRef].z) {
            worksheet[cellRef].z = '@'; // '@' is the Excel format code for Text
          }
        }
      }
    });
    
    // Add the sheet with month name
    XLSX.utils.book_append_sheet(workbook, worksheet, month.name);
  });
  
  // Create binary data and download
  const excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBinary], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `separated_by_months_${fileName}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};