import { useState, useEffect} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import axios from 'axios'

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
      <div className='text-xl font-semibold text-blue-600 bg-gray-100 p-4 rounded-lg shadow'>
        {data.message}
      </div>
    </>
  )
}

export default App
