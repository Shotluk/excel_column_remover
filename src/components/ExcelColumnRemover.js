// Enhanced ExcelColumnRemover.js - With flexible date column selection
import React, { useState, useCallback } from 'react';
import { Calendar, Download, Clock, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

// Import all the enhanced modular functions
import { handleFileUpload, resetFileState } from '../services/fileHandling.js';
import { 
  selectYellowColumns, 
  processExcelData, 
  toggleHeaderSelection, 
  toggleMonthSelection,
} from '../services/dataProcessing.js';
import { calculateRowsRemoved, getMonthAndYearFromDate, countEntriesByMonthWithColumn } from '../services/dateUtilities.js';
import { 
  exportWithXLSX, 
  exportWithBordersUsingExcelJS, 
  downloadXLSXFile,
  exportSeparatedDataWithStyling,          
} from '../services/excelExport.js';
import { validateProcessingRequirements, validateDataAvailability, isYellowColumn } from '../utils/validationUtilites.js';

// Import the Column Reordering Component
import ColumnReorderingComponent from './columnReorderingcomponent.js';

// Enhanced month separation with flexible date column and year support
const separateDataByMonths = (jsonData, selectedDateColumnIndex, headerRowIndex, selectedHeaders, selectedMonths, monthCounts, allNewColumns, columnOrder, headers, addedCustomColumns) => {
  if (!jsonData || jsonData.length < 2 || selectedDateColumnIndex === -1) {
    return null;
  }
  
  console.log('=== ENHANCED MONTH-YEAR SEPARATION DEBUG ===');
  console.log('Using selected date column index:', selectedDateColumnIndex);
  console.log('Total rows:', jsonData.length);
  console.log('Header row index:', headerRowIndex);
  console.log('Selected headers to remove:', selectedHeaders);
  console.log('Selected month-years to filter:', selectedMonths);
  
  // Check if the selected date column will be removed
  const originalDateHeader = jsonData[headerRowIndex][selectedDateColumnIndex];
  const dateColumnWillBeRemoved = selectedHeaders.includes(originalDateHeader);
  
  console.log('Date column header:', originalDateHeader);
  console.log('Date column will be removed:', dateColumnWillBeRemoved);
  
  if (dateColumnWillBeRemoved) {
    console.log('Cannot separate by months: The selected date column will be removed in processing');
    return null;
  }
  
  // Process data using the selected date column
  let processedData;
  try {
    processedData = processExcelData(
      jsonData, 
      headerRowIndex, 
      selectedHeaders, 
      selectedMonths, 
      monthCounts, 
      selectedDateColumnIndex,
      allNewColumns,
      columnOrder,
      headers,
      addedCustomColumns
    );
  } catch (error) {
    console.error('Error in processExcelData during separation:', error);
    return null;
  }
  
  if (!processedData || processedData.length < 2) {
    console.log('No processed data available for separation');
    return null;
  }
  
  // Find the date column in processed data
  const processedHeaderRow = processedData[0];
  const processedDateColumnIndex = processedHeaderRow.findIndex(header => header === originalDateHeader);
  
  if (processedDateColumnIndex === -1) {
    console.log('Date column not found in processed data - this should not happen if we checked above');
    return null;
  }
  
  // Initialize month-year data structure
  const monthYearData = new Map(); // Key: "YYYY-MM", Value: { name, code, year, rows }
  const monthNames = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
  };
  
  let processedRows = 0;
  let assignedRows = 0;
  let invalidDateRows = 0;
  
  // Process each row
  for (let i = 1; i < processedData.length; i++) {
    const row = processedData[i];
    if (!row) continue;
    
    processedRows++;
    const dateValue = row[processedDateColumnIndex];
    const dateResult = getMonthAndYearFromDate(dateValue);
    
    if (dateResult && dateResult.month && dateResult.year) {
      const monthYearKey = `${dateResult.year}-${dateResult.month}`;
      
      if (!monthYearData.has(monthYearKey)) {
        const monthName = monthNames[dateResult.month];
        monthYearData.set(monthYearKey, {
          name: `${monthName} ${dateResult.year}`, // "January 2024"
          code: dateResult.month,
          year: dateResult.year,
          monthYearKey: monthYearKey,
          rows: []
        });
      }
      
      monthYearData.get(monthYearKey).rows.push(row);
      assignedRows++;
    } else {
      invalidDateRows++;
    }
  }
  
  // Convert to array and sort by year then month
  const monthsWithData = Array.from(monthYearData.values())
    .filter(monthYear => monthYear.rows.length > 0)
    .sort((a, b) => {
      // Sort by year first, then by month
      const yearCompare = a.year.localeCompare(b.year);
      if (yearCompare !== 0) return yearCompare;
      return a.code.localeCompare(b.code);
    });
  
  console.log('Months with data:', monthsWithData.map(m => `${m.name}: ${m.rows.length} rows`));
  console.log('=== END ENHANCED MONTH-YEAR SEPARATION DEBUG ===');
  
  return {
    headerRow: processedHeaderRow,
    monthsWithData,
    totalRows: processedRows,
    assignedRows,
    invalidDateRows
  };
};

// Main Enhanced ExcelColumnRemover Component
export default function ExcelColumnRemover() {
  const [headers, setHeaders] = useState([]);
  const [selectedHeaders, setSelectedHeaders] = useState([]);
  const [processedData, setProcessedData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [monthCounts, setMonthCounts] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [dateColumnIndex, setDateColumnIndex] = useState(-1); // Legacy support
  const [jsonData, setJsonData] = useState(null);
  const [useBorders, setUseBorders] = useState(true);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  
  // NEW: Enhanced date column states
  const [allDateColumns, setAllDateColumns] = useState([]);
  const [selectedDateColumnIndex, setSelectedDateColumnIndex] = useState(-1);
  const [showDateColumnDropdown, setShowDateColumnDropdown] = useState(false);
  
  // Column additions and reordering
  const [addedCustomColumns, setAddedCustomColumns] = useState([]);
  const [columnOrder, setColumnOrder] = useState(null);
  const [showColumnReordering, setShowColumnReordering] = useState(false);
  
  // Month separation
  const [separatedData, setSeparatedData] = useState(null);
  const [isProcessingSeparation, setIsProcessingSeparation] = useState(false);
  
  // Handle file upload using enhanced modular function
  const onFileUpload = (e) => {
    const resetState = resetFileState();
    
    // Reset all state including new ones
    setHeaders(resetState.headers);
    setSelectedHeaders(resetState.selectedHeaders);
    setProcessedData(resetState.processedData);
    setFileName(resetState.fileName);
    setMonthCounts(resetState.monthCounts);
    setSelectedMonths(resetState.selectedMonths);
    setDateColumnIndex(resetState.dateColumnIndex);
    setJsonData(resetState.jsonData);
    setHeaderRowIndex(resetState.headerRowIndex);
    setError(resetState.error);
    setColumnOrder(null);
    setShowColumnReordering(false);
    setAddedCustomColumns([]);
    setSeparatedData(null);
    
    // Reset new date column states
    setAllDateColumns([]);
    setSelectedDateColumnIndex(-1);
    setShowDateColumnDropdown(false);
    
    handleFileUpload(
      e,
      // onSuccess
      (parsedData) => {
        setJsonData(parsedData.jsonData);
        setHeaders(parsedData.headers);
        setHeaderRowIndex(parsedData.headerRowIndex);
        setMonthCounts(parsedData.monthCounts);
        setDateColumnIndex(parsedData.dateColumnIndex); // Legacy
        setFileName(parsedData.fileName);

        // NEW: Set enhanced date column data
        setAllDateColumns(parsedData.allDateColumns || []);
        setSelectedDateColumnIndex(parsedData.selectedDateColumnIndex || -1);

        // Auto-select yellow columns
        const autoSelectedHeaders = selectYellowColumns(parsedData.headers, []);
        setSelectedHeaders(autoSelectedHeaders);
      },
      // onError
      (errorMessage) => setError(errorMessage),
      // onLoadingStart
      () => setIsLoading(true),
      // onLoadingEnd
      () => setIsLoading(false)
    );
  };
  
  // Handle date column change
  const handleDateColumnChange = async (newDateColumnIndex) => {
    if (newDateColumnIndex === selectedDateColumnIndex) return;
    
    console.log('Changing date column to index:', newDateColumnIndex);
    setSelectedDateColumnIndex(newDateColumnIndex);
    setShowDateColumnDropdown(false);
    
    // Recalculate month counts with the new date column
    if (jsonData && newDateColumnIndex !== -1) {
      try {
        const adjustedData = [headers, ...jsonData.slice(headerRowIndex + 1)];
        const newMonthCounts = countEntriesByMonthWithColumn(adjustedData, newDateColumnIndex);
        setMonthCounts(newMonthCounts);
        
        // Reset month selections since counts changed
        setSelectedMonths([]);
        setSeparatedData(null);
        
        console.log('Updated month counts for new date column:', newMonthCounts);
      } catch (error) {
        console.error('Error recalculating month counts:', error);
        setError('Error updating month data for selected date column');
      }
    }
  };
  
  // Handle header toggle
  const handleToggleHeader = (header) => {
    const newSelection = toggleHeaderSelection(header, selectedHeaders);
    setSelectedHeaders(newSelection);
  };
  
  // Handle month toggle
  const handleToggleMonth = (month) => {
    const newSelection = toggleMonthSelection(month, selectedMonths);
    setSelectedMonths(newSelection);
  };
  
  // Handle column order change
  const handleColumnOrderChange = useCallback((newOrder) => {
    setColumnOrder(newOrder);
  }, []);

  // Toggle column reordering visibility
  const toggleColumnReordering = () => {
    setShowColumnReordering(!showColumnReordering);
  };

  // Handler for custom column additions
  const handleAddCustomColumn = (columnName, removedColumnName, action) => {
    if (action === 'remove') {
      setAddedCustomColumns(prev => prev.filter(col => col !== removedColumnName));
    } else if (columnName) {
      setAddedCustomColumns(prev => [...prev, columnName]);
    }
  };
  
  // Enhanced month separation
  const processSeparation = () => {
    if (!jsonData || selectedDateColumnIndex === -1) {
      setError('Cannot separate by months: No data or date column selected');
      return;
    }
    
    setIsProcessingSeparation(true);
    setError('');
    
    try {
      const separated = separateDataByMonths(
        jsonData, 
        selectedDateColumnIndex, // Use selected date column
        headerRowIndex,
        selectedHeaders,
        selectedMonths,
        monthCounts,
        addedCustomColumns,
        columnOrder,
        headers,
        addedCustomColumns
      );
      
      if (!separated || separated.monthsWithData.length === 0) {
        setError('No valid date entries found to separate by months after applying filters');
        setSeparatedData(null);
        return;
      }
      
      setSeparatedData(separated);
    } catch (error) {
      setError('Error processing month separation: ' + error.message);
      setSeparatedData(null);
    } finally {
      setIsProcessingSeparation(false);
    }
  };
  
  // Download separated file
  const downloadSeparatedFile = async () => {
    if (!separatedData) return;
    
    try {
      await exportSeparatedDataWithStyling(separatedData, fileName, useBorders);
    } catch (error) {
      setError('Error downloading separated file: ' + error.message);
    }
  };
  
  // Process the file using enhanced functions
  const processFile = async () => {
    const requirementValidation = validateProcessingRequirements(selectedHeaders, selectedMonths);
    if (!requirementValidation.isValid) {
      setError(requirementValidation.message);
      return;
    }
    
    const dataValidation = validateDataAvailability(jsonData);
    if (!dataValidation.isValid) {
      setError(dataValidation.message);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Use selected date column index for processing
      const processedDataArray = processExcelData(
        jsonData, 
        headerRowIndex, 
        selectedHeaders, 
        selectedMonths, 
        monthCounts, 
        selectedDateColumnIndex, // Use selected date column
        addedCustomColumns,
        columnOrder,
        headers,
        addedCustomColumns
      );
      
      if (useBorders) {
        await exportWithBordersUsingExcelJS(processedDataArray, fileName, selectedMonths);
        setProcessedData(true);
      } else {
        const excelBinary = exportWithXLSX(processedDataArray);
        setProcessedData(excelBinary);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Error processing file: ' + error.message);
      setIsLoading(false);
    }
  };
  
  // Download the processed file
  const downloadFile = () => {
    if (!processedData || useBorders) return;
    downloadXLSXFile(processedData, fileName, selectedMonths);
  };
  
  // Calculate rows removed
  const getRowsRemoved = () => {
    return calculateRowsRemoved(selectedMonths, monthCounts);
  };

  // Get current date column name for display
  const getCurrentDateColumnName = () => {
    if (selectedDateColumnIndex === -1 || !allDateColumns.length) return 'No date column';
    const currentColumn = allDateColumns.find(col => col.index === selectedDateColumnIndex);
    return currentColumn ? currentColumn.header : 'Unknown';
  };
  
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Enhanced Excel Column Remover</h2>
        <p className="mt-2 text-indigo-100">Upload an Excel file and select columns to remove with flexible date sorting</p>
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
                onChange={onFileUpload} 
                className="absolute w-full h-full opacity-0 cursor-pointer"
              />
            </label>
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

        {/* NEW: Date Column Selection Section */}
        {allDateColumns.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Date Column for Month Sorting
            </h3>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Currently using: <span className="font-bold">{getCurrentDateColumnName()}</span>
                  </span>
                </div>
                
                {allDateColumns.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowDateColumnDropdown(!showDateColumnDropdown)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Change Date Column
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </button>
                    
                    {showDateColumnDropdown && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          {allDateColumns.map((dateCol) => (
                            <button
                              key={dateCol.index}
                              onClick={() => handleDateColumnChange(dateCol.index)}
                              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                dateCol.index === selectedDateColumnIndex 
                                  ? 'bg-blue-50 text-blue-700 font-medium' 
                                  : 'text-gray-700'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span>{dateCol.header}</span>
                                <span className="text-xs text-gray-500">
                                  {(dateCol.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {dateCol.matchType}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {allDateColumns.length > 1 && (
                <div className="text-sm text-blue-700">
                  <span className="font-medium">Available date columns:</span> {allDateColumns.length} found
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {allDateColumns.map((col, index) => (
                      <div key={col.index} className="text-xs bg-white rounded px-2 py-1 border">
                        <span className="font-medium">{col.header}</span>
                        <span className="text-gray-500 ml-2">({(col.confidence * 100).toFixed(0)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Month Distribution Section */}
        {monthCounts && monthCounts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Data Distribution by Month & Year
                {selectedDateColumnIndex !== -1 && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (using {getCurrentDateColumnName()})
                  </span>
                )}
              </h3>
              {selectedDateColumnIndex !== -1 && (
                <button
                  onClick={processSeparation}
                  disabled={isProcessingSeparation}
                  className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${
                    isProcessingSeparation
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isProcessingSeparation ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      Separate by Months
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {monthCounts.map((item) => (
                  <div 
                    key={item.monthYearKey || `${item.yearCode}-${item.code}` || `${item.month}-${Math.random()}`} 
                    className={`p-3 rounded-md shadow-sm border cursor-pointer transition-all ${
                      selectedMonths.includes(item.month)
                        ? 'bg-red-100 border-red-300'
                        : 'bg-white border-indigo-100 hover:border-indigo-300'
                    }`}
                    onClick={() => handleToggleMonth(item.month)}
                  >
                    <div className={`text-sm font-semibold ${
                      selectedMonths.includes(item.month) 
                        ? 'text-red-700' 
                        : 'text-indigo-700'
                    }`}>
                      {item.month}
                      {selectedMonths.includes(item.month) && (
                        <span className="ml-2 text-red-500">✓</span>
                      )}
                    </div>
                    <div className={`mt-1 text-xs ${
                      selectedMonths.includes(item.month) 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                    }`}>
                      {item.count} entries
                    </div>
                    {item.yearCode && (
                      <div className="text-xs text-gray-500 mt-1">
                        Year: {item.yearCode}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-gray-500 flex justify-between items-center">
                <div>
                  Total entries: {monthCounts.reduce((sum, item) => sum + item.count, 0)}
                  <span className="ml-2 text-xs">
                    ({monthCounts.length} month-year combinations)
                  </span>
                </div>
                {selectedMonths.length > 0 && (
                  <div className="text-red-600 font-medium">
                    {getRowsRemoved()} entries marked for removal
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

        {/* Month Separation Results Section */}
        {separatedData && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Month Separation Results
            </h3>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-4">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Successfully separated data into {separatedData.monthsWithData.length} month sheets
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {separatedData.assignedRows} of {separatedData.totalRows} rows assigned to months
                    {separatedData.invalidDateRows > 0 && ` (${separatedData.invalidDateRows} rows had invalid dates)`}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    <span className="font-medium">Applied filters using {getCurrentDateColumnName()}:</span> 
                    {selectedHeaders.length > 0 && ` Removed ${selectedHeaders.length} columns`}
                    {selectedMonths.length > 0 && `, Filtered ${selectedMonths.length} months`}
                    {columnOrder && `, Custom column order`}
                    {addedCustomColumns.length > 0 && `, Added ${addedCustomColumns.length} custom columns`}
                    {useBorders && `, Applied borders & styling`}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {separatedData.monthsWithData.map((month) => (
                  <div key={month.monthYearKey || `${month.year}-${month.code}` || month.name} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                    <div className="text-sm font-medium text-gray-900">{month.name}</div>
                    <div className="text-xs text-gray-500">{month.rows.length} entries</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={downloadSeparatedFile}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Excel with Separated Months {useBorders && '(Styled)'}
              </button>
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
                        onChange={() => handleToggleHeader(header)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label 
                        htmlFor={`header-${index}`} 
                        className={`font-medium ${
                          isYellowColumn(header) 
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
          </div>
        )}

        {/* Column Reordering Section */}
        {headers.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Column Order (Optional)
              </h3>
              <button
                onClick={toggleColumnReordering}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {showColumnReordering ? 'Hide' : 'Show'} Column Reordering
              </button>
            </div>
            
            {showColumnReordering && (
              <ColumnReorderingComponent
                headers={headers}
                onColumnOrderChange={handleColumnOrderChange}
                currentOrder={columnOrder}
                onAddColumn={handleAddCustomColumn}
                addedColumns={addedCustomColumns}
              />
            )}
            
            {(columnOrder || addedCustomColumns.length > 0) && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm text-blue-800">
                  {columnOrder && <span><span className="font-medium">Column order set:</span> Columns will be reordered in the output file. </span>}
                  {addedCustomColumns.length > 0 && <span><span className="font-medium">Custom columns added:</span> {addedCustomColumns.join(', ')}.</span>}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Process File Button */}
        {headers.length > 0 && (
          <div className="mb-8">
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
                  File processed successfully using <span className="font-semibold">{getCurrentDateColumnName()}</span>!
                  {selectedHeaders.length > 0 && (
                    <span> Removed columns: <span className="font-semibold">{selectedHeaders.join(', ')}</span></span>
                  )}
                  {selectedMonths.length > 0 && (
                    <span> Removed {getRowsRemoved()} entries from: <span className="font-semibold">{selectedMonths.join(', ')}</span></span>
                  )}
                  {columnOrder && (
                    <span> Applied <span className="font-semibold">custom column order</span>.</span>
                  )}
                  {addedCustomColumns.length > 0 && (
                    <span> Added <span className="font-semibold">{addedCustomColumns.length} custom column(s)</span>.</span>
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
  );
}