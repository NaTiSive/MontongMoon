import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import axios from "axios";
import TextArea from "./components/TextArea";

function App() {
  const [problem, setProblem] = useState("");

  return (
    <div>
      <TextArea
        label="รายละเอียดปัญหา"
        placeholder="ตัวอย่าง: ใบเหลือง"
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        rows={4}
      />

      <p className="mt-3 text-gray-700">ค่าที่ป้อนคือ: {problem}</p>
    </div>
  );
}

export default App;
