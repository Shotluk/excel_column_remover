import { useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export default function ExcelColumnRemover() {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [selectedHeaders, setSelectedHeaders] = useState([]);
  const [processedData, setProcessedData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [monthCounts, setMonthCounts] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [dateColumnIndex, setDateColumnIndex] = useState(-1);
  const [jsonData, setJsonData] = useState(null);
  const [useBorders, setUseBorders] = useState(true);
  
  // Function to select yellow columns
  const selectYellowColumns = () => {
    const yellowColumns = ['Mobile', 'Xml FileName', 'Doctor', 'Card No'];
    const columnsToSelect = yellowColumns.filter(col => 
      headers.some(header => header === col || header.toLowerCase() === col.toLowerCase())
    );
    
    setSelectedHeaders(prev => {
      const newSelection = [...prev];
      columnsToSelect.forEach(col => {
        // Find exact or case-insensitive match
        const matchedHeader = headers.find(
          header => header === col || header.toLowerCase() === col.toLowerCase()
        );
        if (matchedHeader && !newSelection.includes(matchedHeader)) {
          newSelection.push(matchedHeader);
        }
      });
      return newSelection;
    });
  };
  
  // Function to toggle month selection for removal
  const toggleMonthSelection = (month) => {
    setSelectedMonths(prev => {
      if (prev.includes(month)) {
        return prev.filter(m => m !== month);
      } else {
        return [...prev, month];
      }
    });
  };
  
  // Function to count entries by month - KEEPING EXACTLY AS IN ORIGINAL
  const countEntriesByMonth = (jsonData) => {
    // Find the Date column index
    const headerRow = jsonData[0];
    const dateColIndex = headerRow.findIndex(
      header => header === 'Date' || header.toLowerCase() === 'date'
    );
    
    setDateColumnIndex(dateColIndex);
    
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
  
  // Get month code from date string - KEEPING EXACTLY AS IN ORIGINAL
  const getMonthFromDate = (dateStr) => {
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
  
  // Handle file upload
  const handleFileUpload = (e) => {
    setError('');
    setHeaders([]);
    setSelectedHeaders([]);
    setProcessedData(null);
    setMonthCounts(null);
    setSelectedMonths([]);
    setDateColumnIndex(-1);
    setJsonData(null);
    
    const file = e.target.files[0];
    if (!file) return;
    
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt)) {
      setError('Please upload an Excel or CSV file');
      return;
    }
    
    setIsLoading(true);
    setFile(file);
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        setJsonData(jsonData);
        
        if (jsonData.length === 0 || jsonData[0].length === 0) {
          setError('The file appears to be empty or has no headers');
          setIsLoading(false);
          return;
        }
        
        // Extract headers (first row)
        const headers = jsonData[0];
        setHeaders(headers);
        
        // Count entries by month
        const monthData = countEntriesByMonth(jsonData);
        setMonthCounts(monthData);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing file:', error);
        setError('Error processing file. Please try a different file.');
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file');
      setIsLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  // Toggle header selection
  const toggleHeaderSelection = (header) => {
    setSelectedHeaders(prev => 
      prev.includes(header) 
        ? prev.filter(h => h !== header) 
        : [...prev, header]
    );
  };
  
  // Process the file - remove selected columns and filter by selected months
  const processFile = () => {
    if (!file || (!selectedHeaders.length && !selectedMonths.length)) {
      setError('Please select at least one column or month to remove');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      if (!jsonData) {
        setError('No data available for processing');
        setIsLoading(false);
        return;
      }
      
      // Get indices of headers to remove
      const headerIndices = selectedHeaders.map(header => 
        jsonData[0].findIndex(h => h === header)
      ).filter(index => index !== -1);
      
      // Get month codes to filter out
      const monthCodesToRemove = selectedMonths.map(month => {
        const foundMonth = monthCounts.find(m => m.month === month);
        return foundMonth ? foundMonth.code : null;
      }).filter(code => code !== null);
      
      // First filter rows based on selected months (if any)
      let filteredData = jsonData;
      
      if (selectedMonths.length > 0 && dateColumnIndex !== -1) {
        filteredData = [jsonData[0]]; // Keep header row
        
        // Add rows that don't match the excluded months
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row[dateColumnIndex]) {
            const dateValue = String(row[dateColumnIndex]);
            const monthCode = getMonthFromDate(dateValue);
            
            // Include row only if its month is not in the exclusion list
            if (!monthCode || !monthCodesToRemove.includes(monthCode)) {
              filteredData.push(row);
            }
          } else {
            // Include rows with no date value
            filteredData.push(row);
          }
        }
      }
      
      // Then remove selected columns
      const processedData = filteredData.map(row => 
        row.filter((_, index) => !headerIndices.includes(index))
      );
      
      if (useBorders) {
        // Use ExcelJS for styling with borders
        exportWithBordersUsingExcelJS(processedData);
        setProcessedData(true); // Just to indicate processing is done
        setIsLoading(false);
      } else {
        // Use the original XLSX library approach
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
              if (processedData[rowIdx][colIdx]) {
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
        
        setProcessedData(excelBinary);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Error processing file: ' + error.message);
      setIsLoading(false);
    }
  };
  
  // Export with borders using ExcelJS
  const exportWithBordersUsingExcelJS = async (data) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      
      // First, identify potential date columns by header name
      const dateColumnIndices = [];
      if (data.length > 0) {
        data[0].forEach((header, index) => {
          if (header && typeof header === 'string' && 
              (header.toLowerCase().includes('date') || 
               header.toLowerCase().includes('time') ||
               header.toLowerCase().includes('submission'))) {
            dateColumnIndices.push(index);
          }
        });
      }
      
      console.log("Identified date columns at indices:", dateColumnIndices);
      
      // Determine which rows are actual data rows (vs. metadata, page numbers, etc.)
      // Strategy: Look for rows that have consistent structure with the headers
      const tableRowIndices = [];
      const headerRow = data[0];
      const headerCellCount = headerRow.length;
      
      // Consider header row as part of the table
      tableRowIndices.push(0);
      
      // Check each data row
      for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        
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
      
      // Add header row
      if (data.length > 0) {
        worksheet.addRow(data[0]);
      }
      
      // Add data rows with special handling for date columns
      for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
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
                cell.numFmt = 'dd/mm/yyyy h:mm:ss AM/PM'; // Format exactly as you want
              }
            }
          }
        });
      }
      
      // Apply borders only to table cells (not to page numbers, metadata, etc.)
      worksheet.eachRow((row, rowIndex) => {
        // Check if this row is part of the table (add 1 because worksheet rows are 1-indexed)
        const isTableRow = tableRowIndices.includes(rowIndex - 1);
        
        if (isTableRow) {
          // This is a table row, apply borders to its cells
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } },
            };
          });
        }
      });
      
      // Set column widths automatically
      worksheet.columns.forEach((column, i) => {
        // For date columns, set wider
        if (dateColumnIndices.includes(i)) {
          column.width = 22; // Wide enough for date + time format
        } else {
          let maxLength = 10;
          column.eachCell({ includeEmpty: true }, (cell) => {
            const val = cell.value ? cell.value.toString() : '';
            maxLength = Math.max(maxLength, val.length);
          });
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
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error with ExcelJS:', error);
      setError('Error with ExcelJS: ' + error.message + '. Falling back to basic export.');
      
      // Fall back to basic XLSX export
      const newWorkbook = XLSX.utils.book_new();
      const newSheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
      
      const excelBinary = XLSX.write(newWorkbook, { 
        bookType: 'xlsx', 
        type: 'array' 
      });
      
      setProcessedData(excelBinary);
      setUseBorders(false);
    }
  };
  
  // Download the processed file (for non-ExcelJS method)
  const downloadFile = () => {
    if (!processedData || useBorders) return;
    
    const blob = new Blob([processedData], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    let downloadName = `modified_${fileName}`;
    
    // Add info about what was removed to the filename
    if (selectedMonths.length > 0) {
      downloadName = `without_${selectedMonths.join('_')}_${fileName}`;
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Calculate rows removed due to month filtering
  const calculateRowsRemoved = () => {
    if (!selectedMonths.length || !monthCounts) return 0;
    
    return selectedMonths.reduce((total, month) => {
      const monthData = monthCounts.find(m => m.month === month);
      return total + (monthData ? monthData.count : 0);
    }, 0);
  };
  
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Excel Column Remover</h2>
        <p className="mt-2 text-indigo-100">Upload an Excel file and select columns to remove</p>
      </div>
      
      <div className="p-8">
        {/* File Upload Section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Excel File
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-4">
            <label className="group relative flex items-center justify-center w-full max-w-xs h-32 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer bg-white">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 group-hover:text-indigo-500 transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-8m-12 0H8m36-12h-4m-8-4v4m0 0v12m-12-8h12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <span className="relative rounded-md font-medium text-indigo-600 hover:text-indigo-700 focus-within:outline-none">
                    {fileName ? fileName : 'Choose a file'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  XLSX, XLS, or CSV up to 10MB
                </p>
              </div>
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileUpload} 
                className="absolute w-full h-full opacity-0 cursor-pointer"
              />
            </label>
            
            {headers.length > 0 && (
              <button
                onClick={selectYellowColumns}
                className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-md shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
              >
                Select Yellow Columns
              </button>
            )}
          </div>
          
          {/* Styling option */}
          {headers.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center">
                <input
                  id="borders-checkbox"
                  type="checkbox"
                  checked={useBorders}
                  onChange={() => setUseBorders(!useBorders)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="borders-checkbox" className="ml-2 block text-sm text-gray-700">
                  Apply thick borders to all cells (using ExcelJS)
                </label>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-2 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Month Distribution Section */}
        {monthCounts && monthCounts.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Data Distribution by Month
            </h3>
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {monthCounts.map((item, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-md shadow-sm border cursor-pointer transition-all ${
                      selectedMonths.includes(item.month)
                        ? 'bg-red-100 border-red-300'
                        : 'bg-white border-indigo-100 hover:border-indigo-300'
                    }`}
                    onClick={() => toggleMonthSelection(item.month)}
                  >
                    <div className={`text-lg font-semibold ${
                      selectedMonths.includes(item.month) 
                        ? 'text-red-700' 
                        : 'text-indigo-700'
                    }`}>
                      {item.month}
                      {selectedMonths.includes(item.month) && (
                        <span className="ml-2 text-red-500">✓</span>
                      )}
                    </div>
                    <div className={`mt-1 ${
                      selectedMonths.includes(item.month) 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                    }`}>
                      {item.count} entries
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-gray-500 flex justify-between items-center">
                <div>
                  Total entries: {monthCounts.reduce((sum, item) => sum + item.count, 0)}
                </div>
                {selectedMonths.length > 0 && (
                  <div className="text-red-600 font-medium">
                    {calculateRowsRemoved()} entries marked for removal
                  </div>
                )}
              </div>
              {selectedMonths.length > 0 && (
                <div className="mt-2 text-sm text-red-700">
                  <span className="font-medium">Note:</span> All rows from {selectedMonths.join(', ')} will be removed from the output file.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Header Selection Section */}
        {headers.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Select Columns to Remove
              </h3>
              <span className="text-sm text-gray-500">
                {selectedHeaders.length} selected
              </span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {headers.map((header, index) => (
                  <div key={index} className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={`header-${index}`}
                        type="checkbox"
                        checked={selectedHeaders.includes(header)}
                        onChange={() => toggleHeaderSelection(header)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label 
                        htmlFor={`header-${index}`} 
                        className={`font-medium ${
                          ['mobile', 'xml filename', 'doctor', 'card no'].includes(header.toLowerCase()) 
                            ? 'text-yellow-600' 
                            : 'text-gray-700'
                        } truncate`}
                        title={header}
                      >
                        {header}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-5">
              <button
                onClick={processFile}
                disabled={(selectedHeaders.length === 0 && selectedMonths.length === 0) || isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  (selectedHeaders.length === 0 && selectedMonths.length === 0) || isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : 'Process File'}
              </button>
            </div>
          </div>
        )}
        
        {/* Download Section */}
        {processedData && (
          <div className="rounded-md bg-green-50 p-4 border border-green-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-green-800">
                  File processed successfully!
                  {selectedHeaders.length > 0 && (
                    <span> Removed columns: <span className="font-semibold">{selectedHeaders.join(', ')}</span></span>
                  )}
                  {selectedMonths.length > 0 && (
                    <span> Removed {calculateRowsRemoved()} entries from: <span className="font-semibold">{selectedMonths.join(', ')}</span></span>
                  )}
                  {useBorders && (
                    <span> Applied <span className="font-semibold">thick borders</span> to all cells.</span>
                  )}
                </p>
              </div>
            </div>
            {!useBorders && (
              <div className="mt-4">
                <button
                  onClick={downloadFile}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Modified File
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )}