import { useState, useEffect} from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import axios from 'axios'
import Card from './components/Card'

function App() {
  return (
    <div className="p-6 grid grid-cols-2 gap-6">
      <Card>
        <h2 className="text-lg font-semibold mb-2">สรุปเกรดผลผลิต</h2>
        <p className="text-sm text-gray-600">เกรด A: 850 kg</p>
        <p className="text-sm text-gray-600">เกรด B: 300 kg</p>
      </Card>

      <Card className="bg-yellow-50">
        <h2 className="text-lg font-semibold mb-2">ข้อเสนอจากผู้รับเหมา</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700">
          <li>Broker A — ฿35/kg</li>
          <li>Broker B — ฿32/kg</li>
        </ul>
      </Card>
    </div>
  );
}

export default App
