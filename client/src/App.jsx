import { useState, useEffect} from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import axios from 'axios'
import Header from './components/Header'

function App() {

  return (
    <>
    <div className='min-h-screen flex flex-col bg-gray-50'>
        <Header name="Nattakorn KK" role = "owner"/>
    </div>
    </>
  )
}

export default App;
