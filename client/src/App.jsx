import { useState, useEffect} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import axios from 'axios'
import PageHeader from './components/pageHeader'

function App() {
  return (
    <div>
      <PageHeader title='รายงานปัญหาที่เกิดขึ้นในสวน' subtitle='แจ้งรายละเอียดปัญหาเพื่อให้เจ้าของสวนให้คำแนะนำได้อย่างรวดเร็ว' />
    </div>
  );
}


export default App
