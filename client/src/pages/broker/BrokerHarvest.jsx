// src/pages/broker/BrokerHarvest.jsx
import { useState } from "react";
import HeaderWrapper from "../../components/HeaderWrapper";
import Sidebar from "../../components/Sidebar";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import SelectField from "../../components/SelectField";
import PrimaryButton from "../../components/PrimaryButton";
import DataTable from "../../components/datatable";

export default function BrokerHarvest() {
  const [amount, setAmount] = useState("");
  const [grade, setGrade] = useState("");
  const [rows, setRows] = useState([]);

  const gradeOptions = ["A", "B", "C", "ตกเกรด"]; // ← ตรง enum ระบบ

  function addRow() {
    if (!amount || !grade) return;
    setRows((prev) => [
      {
        id: crypto.randomUUID(),
        amount: Number(amount),
        grade,
        created_at: new Date().toISOString().slice(0, 16).replace("T", " "),
      },
      ...prev,
    ]);
    setAmount("");
    setGrade("");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderWrapper title="บันทึกผลผลิต" subtitle="ระบุปริมาณและเกรดของผลผลิต" />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 pt-28 px-4 md:px-6">
          <Card className="mb-4">
            <div className="grid md:grid-cols-3 gap-4">
              <InputField
                label="ปริมาณ (กก.)"
                type="number"
                placeholder="เช่น 150.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <SelectField
                label="เกรด"
                placeholder="เลือกเกรด"
                options={gradeOptions}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
              <div className="flex items-end">
                <PrimaryButton title="บันทึก" onClick={addRow} disabled={!amount || !grade} />
              </div>
            </div>
          </Card>

          <Card>
            <DataTable
              columns={[
                { key: "created_at", header: "วันที่" },
                { key: "grade", header: "เกรด" },
                { key: "amount", header: "ปริมาณ (กก.)" },
              ]}
              data={rows}
              emptyText="ยังไม่มีรายการบันทึก"
            />
          </Card>
        </main>
      </div>
    </div>
  );
}
