// App.js
import React from 'react';
import ExcelColumnRemover from './ExcelColumnRemover'; // Adjust path as needed

function App() {
  return (
    <div className="App">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">My Application</h1>
      </header>
      
      <main className="container mx-auto py-6 px-4">
        <ExcelColumnRemover />
      </main>
      
      
    </div>
  );
}

export default App;