// excelExport.js - Updated with ID column handling and minimal console logging

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Convert Excel serial number to date string
 * @param {number} serialNumber - Excel serial number
 * @param {string} format - Date format (DD/MM/YYYY or MM/DD/YYYY)
 * @returns {string|number} Converted date string or original value
 */
const convertSerialToDateString = (serialNumber, format = 'DD/MM/YYYY') => {
  if (typeof serialNumber !== 'number' || serialNumber < 25000 || serialNumber > 50000) {
    return serialNumber; // Return as-is if not a valid serial number
  }
  
  try {
    // Excel epoch is December 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const dateObj = new Date(excelEpoch.getTime() + serialNumber * millisecondsPerDay);
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
    const year = dateObj.getFullYear();
    
    return format === 'MM/DD/YYYY' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error converting serial number:', error);
    return serialNumber;
  }
};

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
        const idPatterns = [
          /id$/i, /^id/i, /no$/i, /number$/i, /code$/i,
          /^bill/i, /^file/i, /^card/i, /^claim/i, /^ref/i,
          /^account/i, /^customer/i, /^policy/i, /^order/i, /^invoice/i,
        ];
        
        if (idPatterns.some(pattern => pattern.test(header))) {
          idColumnIndices.push(index);
        }
      }
    });
  }
  
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
  
  const charWidthFactor = 1.2;
  const minWidth = 8;
  const maxWidth = 50;
  const padding = 2;
  
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
        
        if (typeof cell === 'number') {
          cellLength = String(cell).length;
          if (cell % 1 !== 0) {
            cellLength = Math.max(cellLength, String(cell.toFixed(2)).length);
          }
        } else if (cell instanceof Date) {
          cellLength = 12; 
        } else {
          cellLength = String(cell).length;
        }
        
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
  const newWorkbook = XLSX.utils.book_new();
  
  const headerRow = processedData[0] || [];
  const idColumns = identifyIdColumns(headerRow);
  const dateColumns = identifyDateColumns(processedData);
  
  // Convert serial numbers to dates in date columns
  const convertedData = processedData.map((row, rowIndex) => {
    if (rowIndex === 0 || !row) return row; // Skip header row
    
    return row.map((cell, colIndex) => {
      if (dateColumns.includes(colIndex) && 
          typeof cell === 'number' && 
          cell > 25000 && cell < 50000) {
        return convertSerialToDateString(cell);
      }
      return cell;
    });
  });
  
  const newSheet = XLSX.utils.aoa_to_sheet(convertedData);
  
  // Apply text format to ID columns
  idColumns.forEach(colIndex => {
    const colLetter = XLSX.utils.encode_col(colIndex);
    
    for (let rowIndex = 1; rowIndex < convertedData.length; rowIndex++) {
      const cellRef = colLetter + (rowIndex + 1);
      
      if (newSheet[cellRef]) {
        if (!newSheet[cellRef].z) {
          newSheet[cellRef].z = '@';
        }
      }
    }
  });
  
  const columnWidths = calculateColumnWidths(convertedData);
  newSheet['!cols'] = columnWidths.map(width => ({ width }));
  
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
  
  const excelBinary = XLSX.write(newWorkbook, { 
    bookType: 'xlsx', 
    type: 'array' 
  });
  
  return excelBinary;
};

/**
 * Calculate optimal column width for ExcelJS
 * @param {ExcelJS.Worksheet} worksheet - The worksheet 
 * @param {Array} data - The data as 2D array
 */
const applyOptimalColumnWidths = (worksheet, data) => {
  const columnWidths = calculateColumnWidths(data);
  
  columnWidths.forEach((width, i) => {
    const col = worksheet.getColumn(i + 1);
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
    if (header && typeof header === 'string') {
      const headerStr = header.toLowerCase().trim();
      
      if (headerStr.includes('date') || 
          headerStr.includes('time') ||
          headerStr.includes('submission')) {
        dateColumnIndices.push(index);
      }
    }
  });
  
  // Second pass: analyze content for date patterns
  const rowsToCheck = Math.min(10, data.length - 1);
  
  for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
    if (dateColumnIndices.includes(colIndex)) continue;
    
    let datePatternMatches = 0;
    let rowsWithContent = 0;
    
    for (let rowIndex = 1; rowIndex <= rowsToCheck; rowIndex++) {
      const row = data[rowIndex];
      if (!row || !row[colIndex]) continue;
      
      const cellValue = row[colIndex];
      rowsWithContent++;
      
      if (cellValue instanceof Date) {
        datePatternMatches++;
        continue;
      }
      
      if (typeof cellValue === 'string') {
        const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/;
        if (datePattern.test(cellValue)) {
          datePatternMatches++;
        }
      }
      
      if (typeof cellValue === 'number') {
        if (cellValue > 25000 && cellValue < 50000) {
          datePatternMatches++;
        }
      }
    }
    
    if (rowsWithContent > 0 && datePatternMatches / rowsWithContent > 0.6) {
      dateColumnIndices.push(colIndex);
    }
  }
  
  // Force detection of Service Date column if present
  headerRow.forEach((header, index) => {
    if (header && typeof header === 'string') {
      const headerStr = header.toString().toLowerCase().trim();
      if ((headerStr.includes('service') && headerStr.includes('date')) || 
          headerStr === 'service date') {
        if (!dateColumnIndices.includes(index)) {
          dateColumnIndices.push(index);
        }
      }
    }
  });
  
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
  const rowsToCheck = Math.min(10, data.length - 1);
  
  for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
    if (amountColumnIndices.includes(colIndex) || idColumns.includes(colIndex)) continue;
    
    let numericValueCount = 0;
    let rowsWithContent = 0;
    
    for (let rowIndex = 1; rowIndex <= rowsToCheck; rowIndex++) {
      const row = data[rowIndex];
      if (!row || row[colIndex] === undefined || row[colIndex] === null) continue;
      
      const cellValue = row[colIndex];
      rowsWithContent++;
      
      if (typeof cellValue === 'number') {
        numericValueCount++;
        continue;
      }
      
      if (typeof cellValue === 'string') {
        const currencyPattern = /^[$€£¥]?\s*\d+(\.\d+)?$/;
        const numericPattern = /^-?\s*\d{1,3}(,\d{3})*(\.\d+)?$/;
        
        if (currencyPattern.test(cellValue) || numericPattern.test(cellValue)) {
          numericValueCount++;
        }
      }
    }
    
    if (rowsWithContent > 0 && numericValueCount / rowsWithContent > 0.6) {
      amountColumnIndices.push(colIndex);
    }
  }
  
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
    
    const headerRow = data[0] || [];
    const idColumnIndices = identifyIdColumns(headerRow);
    const dateColumnIndices = identifyDateColumns(data);
    const amountColumnIndices = identifyAmountColumns(data, idColumnIndices);
    
    // Convert serial numbers to dates in date columns before processing
    const processedData = data.map((row, rowIndex) => {
      if (rowIndex === 0 || !row) return row;
      
      return row.map((cell, colIndex) => {
        if (dateColumnIndices.includes(colIndex) && 
            typeof cell === 'number' && 
            cell > 25000 && cell < 50000) {
          return convertSerialToDateString(cell);
        }
        return cell;
      });
    });
    
    // Add all rows first
    processedData.forEach((row, rowIndex) => {
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
        // Format ID columns as text
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
    
    applyOptimalColumnWidths(worksheet, processedData);
    
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
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    
    let downloadName = `modified_${fileName}`;
    
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
  
  if (selectedMonths.length > 0) {
    downloadName = `without_${selectedMonths.join('_')}_${fileName}`;
  }
  
  downloadFile(blob, downloadName);
};

/**
 * Export separated month data with advanced styling using ExcelJS
 * @param {Object} separatedData - Separated month data with headerRow and monthsWithData
 * @param {string} fileName - Original filename for download naming
 * @param {boolean} useBorders - Whether to apply borders and styling
 * @returns {Promise<void>} Downloads the file directly
 */
export const exportSeparatedDataWithStyling = async (separatedData, fileName, useBorders = true) => {
  if (useBorders) {
    try {
      const workbook = new ExcelJS.Workbook();
      
      const headerRow = separatedData.headerRow || [];
      const idColumnIndices = identifyIdColumns(headerRow);
      const dateColumnIndices = identifyDateColumns([headerRow, ...(separatedData.monthsWithData[0]?.rows.slice(0, 10) || [])]);
      const amountColumnIndices = identifyAmountColumns([headerRow, ...(separatedData.monthsWithData[0]?.rows.slice(0, 10) || [])], idColumnIndices);
      
      // Create a sheet for each month
      for (const month of separatedData.monthsWithData) {
        const worksheet = workbook.addWorksheet(month.name);
        const sheetData = [separatedData.headerRow, ...month.rows];
        
        // Convert serial numbers to dates in date columns before processing
        const processedSheetData = sheetData.map((row, rowIndex) => {
          if (rowIndex === 0 || !row) return row;
          
          return row.map((cell, colIndex) => {
            if (dateColumnIndices.includes(colIndex) && 
                typeof cell === 'number' && 
                cell > 25000 && cell < 50000) {
              return convertSerialToDateString(cell);
            }
            return cell;
          });
        });
        
        // Add all rows first
        processedSheetData.forEach((row, rowIndex) => {
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
          else {
            // Format ID columns as text
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
        
        applyOptimalColumnWidths(worksheet, processedSheetData);
        
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
      exportSeparatedDataBasic(separatedData, fileName);
    }
  } else {
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
    // Convert serial numbers before creating sheet
    const convertedData = [
      separatedData.headerRow,
      ...month.rows.map(row => {
        if (!row) return row;
        
        return row.map((cell, colIndex) => {
          if (typeof cell === 'number' && cell > 25000 && cell < 50000) {
            return convertSerialToDateString(cell);
          }
          return cell;
        });
      })
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(convertedData);
    
    // Calculate column widths for better display
    const columnWidths = [];
    if (convertedData.length > 0) {
      for (let colIndex = 0; colIndex < convertedData[0].length; colIndex++) {
        let maxLength = 10;
        
        if (convertedData[0][colIndex]) {
          maxLength = Math.max(maxLength, String(convertedData[0][colIndex]).length);
        }
        
        for (let rowIndex = 1; rowIndex < Math.min(11, convertedData.length); rowIndex++) {
          if (convertedData[rowIndex] && convertedData[rowIndex][colIndex]) {
            maxLength = Math.max(maxLength, String(convertedData[rowIndex][colIndex]).length);
          }
        }
        
        columnWidths.push({ width: Math.min(maxLength + 2, 50) });
      }
      
      worksheet['!cols'] = columnWidths;
    }
    
    // Identify ID columns to format as text
    const headerRow = convertedData[0] || [];
    const idColumns = identifyIdColumns(headerRow);
    
    // Apply text format to ID columns
    idColumns.forEach(colIndex => {
      const colLetter = XLSX.utils.encode_col(colIndex);
      
      for (let rowIndex = 1; rowIndex < convertedData.length; rowIndex++) {
        const cellRef = colLetter + (rowIndex + 1);
        
        if (worksheet[cellRef]) {
          if (!worksheet[cellRef].z) {
            worksheet[cellRef].z = '@';
          }
        }
      }
    });
    
    XLSX.utils.book_append_sheet(workbook, worksheet, month.name);
  });
  
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