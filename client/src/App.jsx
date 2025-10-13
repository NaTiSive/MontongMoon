import { useState, useEffect} from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import axios from 'axios'
import SearchBar from './components/serchbar'

function App() {
  const handleSearch = (keyword) => {
    console.log("คำที่ค้นหา:", keyword);
  };

  return (
    <div className="p-6">
      <SearchBar placeholder="ค้นหาชื่อผู้รับเหมา..." onSearch={handleSearch} />
    </div>
  );
}

export default App
