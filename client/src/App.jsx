import { useState, useEffect} from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import axios from 'axios'
import Header from './components/Header'

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
    <div className="flex h-screen">

      <div className="flex flex-col flex-1 bg-gray-100">
        <Header />

        <main className="p-6">
          <h1 className="text-2xl font-bold">Welcome to MonthongMoon</h1>
          <p>นี่คือพื้นที่สำหรับเนื้อหาหลัก</p>
        </main>
      </div>
    </div>
    </>
  )
}

export default App;
