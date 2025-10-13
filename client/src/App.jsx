import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import axios from "axios";
import DataTable from "./components/datatable";

function App() {
  const offerCols = [
    { key: "submittedAt", header: "วันที่เสนอ" },
    { key: "brokerName", header: "ผู้รับเหมา" },
    { key: "quantityKg", header: "ปริมาณ (กก.)" },
    { key: "pricePerKg", header: "ราคา (บาท/กก.)" },
    { key: "payMethod", header: "วิธีจ่ายเงิน" },
  ];

  const offerData = [
    { id: "of1", submittedAt: "2025-10-08", brokerName: "บจก. สวนสบายใจ", quantityKg: 500, pricePerKg: 120, payMethod: "โอนเงิน" },
    { id: "of2", submittedAt: "2025-10-09", brokerName: "คุณสมชาย", quantityKg: 300, pricePerKg: 115, payMethod: "เงินสด" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4 text-gray-800">ข้อเสนอที่เข้ามา</h1>
      <DataTable columns={offerCols} data={offerData} />
    </div>
  );
}

export default App;
