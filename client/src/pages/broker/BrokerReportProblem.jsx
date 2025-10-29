// src/pages/broker/BrokerReportProblem.jsx
import { useEffect, useMemo, useState } from "react";
import HeaderWrapper from "../../components/HeaderWrapper";
import Sidebar from "../../components/Sidebar";
import Card from "../../components/Card";
import InputField from "../../components/InputField";
import TextArea from "../../components/TextArea";
import SelectField from "../../components/SelectField";
import PrimaryButton from "../../components/PrimaryButton";
import DataTable from "../../components/datatable";
import { seedTreesIfEmpty, listTrees } from "../../api/trees";
import { createProblem, listProblems } from "../../api/problems"; // 👈 ใช้ listProblems แทน
import { useAuth } from "../../contexts/AuthContext";

export default function BrokerReportProblem() {
  const { user } = useAuth();
  const [trees, setTrees] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    seedTreesIfEmpty();
    async function load() {
      const t = await listTrees();
      setTrees(t);

      // 👇 โหลดทั้งหมด แล้วกรองตาม broker_id ที่หน้า
      const all = await listProblems();
      const mine = (all || []).filter(p => p.broker_id === user?.broker_id);
      setRows(mine);
    }
    if (user?.broker_id) load();
  }, [user?.broker_id]);

  const typeOptions = ["รายต้น", "ทั้งสวน"];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const text = (r.note_broker || "").toLowerCase();
      const hitQ = q ? text.includes(q.toLowerCase()) : true;
      const hitType = type ? r.type === type : true;
      return hitQ && hitType;
    });
  }, [rows, q, type]);

  async function submit() {
    if (!type || !note) return;

    // ตัวอย่างเรียบง่าย: ถ้าเป็น "รายต้น" จะผูกกับต้นแรกในลิสต์ (เหมือนเดิม)
    const treeId = type === "รายต้น" ? trees[0]?.tree_id : null;

    await createProblem({
      broker_id: user?.broker_id,
      tree_id: treeId,
      type,
      note_broker: note,
    });

    // รีโหลดแบบเดิม: list ทั้งหมดแล้วกรอง
    const all = await listProblems();
    const mine = (all || []).filter(p => p.broker_id === user?.broker_id);
    setRows(mine);

    setType("");
    setNote("");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderWrapper title="รายงานปัญหา" subtitle="สร้างรายการปัญหาและติดตามสถานะ" />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 pt-28 px-4 md:px-6">
          <Card className="mb-4">
            <div className="grid md:grid-cols-3 gap-4">
              <SelectField
                label="ประเภทปัญหา"
                placeholder="เลือกประเภท"
                options={typeOptions}
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
              <div className="md:col-span-2">
                <TextArea
                  label="รายละเอียด"
                  placeholder="อธิบายปัญหา"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-end">
                <PrimaryButton title="ส่งปัญหา" onClick={submit} disabled={!type || !note} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <InputField
                label="ค้นหา"
                placeholder="พิมพ์คำค้น"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <SelectField
                label="กรองประเภท"
                placeholder="ทั้งหมด"
                options={typeOptions}
                value={type || ""}
                onChange={(e) => setType(e.target.value)}
              />
            </div>

            <DataTable
              columns={[
                { key: "created_at", header: "วันที่" },
                { key: "type", header: "ประเภท" },
                { key: "status", header: "สถานะ" },
                { key: "note_broker", header: "รายละเอียด" },
              ]}
              data={filtered}
              emptyText="ยังไม่มีรายการปัญหา"
            />
          </Card>
        </main>
      </div>
    </div>
  );
}
