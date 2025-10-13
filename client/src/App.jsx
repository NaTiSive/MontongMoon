import { useState } from 'react'
import './App.css'
import axios from 'axios'
import Sidebar from './components/Sidebar'

function App() {
  const [grade, setGrade] = useState('') 

  return (
    <>
      <div>
        <Sidebar />
      </div>
    </>
  )
}


export default App
