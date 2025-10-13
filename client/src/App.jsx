import { useState } from 'react'
import './App.css'
import SelectField from './components/SelectField'

function App() {
  const [grade, setGrade] = useState('') 

  return (
    <div className="p-6">
      <SelectField
        label="เกรดผลผลิต"
        placeholder="เลือกเกรด"
        options={["A", "B", "C", "ตกเกรด"]}
        value={grade}
        onChange={(e) => setGrade(e.target.value)}  //อัปเดต state
      />

      <p className="mt-3 text-gray-700">เลือกแล้ว: {grade || '—'}</p>
    </div>
  )
}


export default App
