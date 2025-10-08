import { useState, useEffect} from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import axios from 'axios'
import InputField from './components/InputField'

function App() {
  return (
    <div>
       <InputField label="ชื่อ" placeholder="กรอกชื่อของคุณ" />
    </div>
  )
}

export default App
