import { useState, useEffect} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import axios from 'axios'
import Sidebar from './components/Sidebar'

function App() {
  const [data, setData] = useState({})

  useEffect(() => {

    axios.get('http://localhost:3000/api/data').then(res => {
      setData(res.data);
    }).catch(err => {
      console.error("Error fetching data: ", err)
    })

  }, [])

  return (
    <>
      <div>
        <Sidebar />
      </div>
    </>
  )
}

export default App
