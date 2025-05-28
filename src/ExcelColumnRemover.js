import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function ExcelColumnRemover() {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [selectedHeaders, setSelectedHeaders] = useState([]);
  const [processedData, setProcessedData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Handle file upload
  const handleFileUpload = (e) => {
    setError('');
    setHeaders([]);
    setSelectedHeaders([]);
    setProcessedData(null);
    
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
        
        if (jsonData.length === 0 || jsonData[0].length === 0) {
          setError('The file appears to be empty or has no headers');
          setIsLoading(false);
          return;
        }
        
        // Extract headers (first row)
        const headers = jsonData[0];
        setHeaders(headers);
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
  
  // Process the file - remove selected columns
  const processFile = () => {
    if (!file || selectedHeaders.length === 0) return;
    
    setIsLoading(true);
    setError('');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        if (jsonData.length === 0) {
          setError('No data found in file');
          setIsLoading(false);
          return;
        }
        
        // Get indices of headers to remove
        const headersToRemove = selectedHeaders;
        const headerIndices = headersToRemove.map(header => 
          jsonData[0].findIndex(h => h === header)
        ).filter(index => index !== -1);
        
        // Process data - remove selected columns
        const processedData = jsonData.map(row => 
          row.filter((_, index) => !headerIndices.includes(index))
        );
        
        // Create a new workbook
        const newWorkbook = XLSX.utils.book_new();
        const newSheet = XLSX.utils.aoa_to_sheet(processedData);
        XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');
        
        // Convert to binary
        const excelBinary = XLSX.write(newWorkbook, { 
          bookType: 'xlsx', 
          type: 'array' 
        });
        
        setProcessedData(excelBinary);
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing file:', error);
        setError('Error processing file. Please try again.');
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file');
      setIsLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  // Download the processed file
  const downloadFile = () => {
    if (!processedData) return;
    
    const blob = new Blob([processedData], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modified_${fileName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          <div className="mt-1 flex items-center">
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
          </div>
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
                        className="font-medium text-gray-700 truncate"
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
                disabled={selectedHeaders.length === 0 || isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  selectedHeaders.length === 0 || isLoading
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
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-green-800">
                  File processed successfully! Removed columns: 
                  <span className="font-semibold"> {selectedHeaders.join(', ')}</span>
                </p>
              </div>
            </div>
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
          </div>
        )}
      </div>
    </div>
  );
}