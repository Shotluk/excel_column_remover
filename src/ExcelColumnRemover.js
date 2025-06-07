// ExcelColumnRemover.js - Complete version with imported column reordering component
import React, { useState } from 'react';

// Import all the modular functions
import { handleFileUpload, resetFileState } from './fileHandling.js';
import { 
  selectYellowColumns, 
  processExcelData, 
  toggleHeaderSelection, 
  toggleMonthSelection,
  getDefaultNewHeaders
} from './dataProcessing.js';
import { calculateRowsRemoved } from './dateUtilities.js';
import { exportWithXLSX, exportWithBordersUsingExcelJS, downloadXLSXFile } from './excelExport.js';
import { validateProcessingRequirements, validateDataAvailability, isYellowColumn } from './validationUtilites.js';

// Import the updated Column Reordering Component
import ColumnReorderingComponent from './columnReorderingcomponent.js';

// Main ExcelColumnRemover Component
export default function ExcelColumnRemover() {
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
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [addNewColumns] = useState(true);
  const [newHeaders] = useState(getDefaultNewHeaders());
  
  // State for column reordering
  const [columnOrder, setColumnOrder] = useState(null);
  const [showColumnReordering, setShowColumnReordering] = useState(false);
  
  // Handle file upload using modular function
  const onFileUpload = (e) => {
    const resetState = resetFileState();
    
    // Reset all state
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
    setColumnOrder(null); // Reset column order
    setShowColumnReordering(false); // Hide reordering UI
    
    handleFileUpload(
      e,
      // onSuccess
      (parsedData) => {
        setJsonData(parsedData.jsonData);
        setHeaders(parsedData.headers);
        setHeaderRowIndex(parsedData.headerRowIndex);
        setMonthCounts(parsedData.monthCounts);
        setDateColumnIndex(parsedData.dateColumnIndex);
        setFileName(parsedData.fileName);

        // Auto-select yellow columns immediately after file upload
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
  
  // Handle header toggle using modular function
  const handleToggleHeader = (header) => {
    const newSelection = toggleHeaderSelection(header, selectedHeaders);
    setSelectedHeaders(newSelection);
  };
  
  // Handle month toggle using modular function
  const handleToggleMonth = (month) => {
    const newSelection = toggleMonthSelection(month, selectedMonths);
    setSelectedMonths(newSelection);
  };
  
  // Handle column order change
  const handleColumnOrderChange = (newOrder) => {
    setColumnOrder(newOrder);
  };

  // Toggle column reordering visibility
  const toggleColumnReordering = () => {
    setShowColumnReordering(!showColumnReordering);
  };
  
  // Process the file using modular functions
  const processFile = async () => {
    // Validate requirements
    const requirementValidation = validateProcessingRequirements(selectedHeaders, selectedMonths);
    if (!requirementValidation.isValid) {
      setError(requirementValidation.message);
      return;
    }
    
    // Validate data availability
    const dataValidation = validateDataAvailability(jsonData);
    if (!dataValidation.isValid) {
      setError(dataValidation.message);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Process data using modular function with column reordering
      const processedDataArray = processExcelData(
        jsonData, 
        headerRowIndex, 
        selectedHeaders, 
        selectedMonths, 
        monthCounts, 
        dateColumnIndex,
        addNewColumns ? newHeaders : [],
        columnOrder // Pass the column order
      );
      
      if (useBorders) {
        // Use ExcelJS for styling with borders
        await exportWithBordersUsingExcelJS(processedDataArray, fileName, selectedMonths);
        setProcessedData(true); // Just to indicate processing is done
      } else {
        // Use the XLSX library approach
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
  
  // Download the processed file (for non-ExcelJS method)
  const downloadFile = () => {
    if (!processedData || useBorders) return;
    downloadXLSXFile(processedData, fileName, selectedMonths);
  };
  
  // Calculate rows removed using modular function
  const getRowsRemoved = () => {
    return calculateRowsRemoved(selectedMonths, monthCounts);
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
                    onClick={() => handleToggleMonth(item.month)}
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
              />
            )}
            
            {columnOrder && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Column order set:</span> Columns will be reordered in the output file.
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
                  File processed successfully!
                  {selectedHeaders.length > 0 && (
                    <span> Removed columns: <span className="font-semibold">{selectedHeaders.join(', ')}</span></span>
                 )}
                 {selectedMonths.length > 0 && (
                   <span> Removed {getRowsRemoved()} entries from: <span className="font-semibold">{selectedMonths.join(', ')}</span></span>
                 )}
                 {columnOrder && (
                   <span> Applied <span className="font-semibold">custom column order</span>.</span>
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