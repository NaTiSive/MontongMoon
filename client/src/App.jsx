import { useState, useEffect} from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import axios from 'axios'
import PrimaryButton from './components/PrimaryButton'
import SecondaryButton from './components/SecondaryButton'

function App() {
    const handleClick = () => {
    alert("กดปุ่มแล้ว");
  };
  return (
    <div className='flex p-2 flex-row gap-3'>
      <PrimaryButton label="ปุ่มหลัก" onClick={handleClick}/>
      <SecondaryButton label="ปุ่มรอง" onClick={handleClick}/>
    </div>
  )
}

export default App
