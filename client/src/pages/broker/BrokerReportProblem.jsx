// src/pages/broker/BrokerProblems.jsx
import React, { useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";

export default function BrokerProblems() {
  // ตัวอย่างรายการต้น (ของจริงเปลี่ยนเป็นดึงจาก API)
  const treeOptions = useMemo(
    () => ["T-001", "T-012", "T-108", "T-205", "T-242", "T-315"],
    []
  );

  // ประเภทปัญหา
  const problemTypes = [
    "ราขาว",
    "ใบไหม้",
    "โรคเน่าคอดิน",
    "แมลงศัตรูพืช",
    "ขาดน้ำ/ระบบน้ำมีปัญหา",
    "ลมแรง/กิ่งหัก",
    "ดิน/ปุ๋ยไม่เหมาะสม",
    "อื่น ๆ",
  ];

  // ฟอร์ม
  const [form, setForm] = useState({
    treeId: "",
    type: problemTypes[0],
    detail: "",
  });
  const onChange = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // รายการปัญหาที่ส่ง (mock เริ่มต้น 3 รายการ)
  const [items, setItems] = useState([
    {
      id: "PB-003",
      treeId: "T-108",
      type: "ราขาว",
      detail: "พบคราบเชื้อราใบด้านล่างกระจายเป็นจุด",
      createdAt: "2025-10-03T09:30:00",
      status: "ส่งแล้ว",
    },
    {
      id: "PB-002",
      treeId: "T-205",
      type: "แมลงศัตรูพืช",
      detail: "เจอตัวหนอนชอนใบหลายจุด",
      createdAt: "2025-10-02T16:20:00",
      status: "ส่งแล้ว",
    },
    {
      id: "PB-001",
      treeId: "T-012",
      type: "ใบไหม้",
      detail: "ใบไหม้กระจายบริเวณปลายยอด",
      createdAt: "2025-10-01T11:05:00",
      status: "ส่งแล้ว",
    },
  ]);

  // ฟิลเตอร์/ค้นหา
  const [q, setQ] = useState(""); // ค้นหา
  const [ftype, setFtype] = useState("ทั้งหมด"); // กรองประเภท

  const filtered = items.filter((it) => {
    const hitText =
      `${it.id} ${it.treeId} ${it.type} ${it.detail}`
        .toLowerCase()
        .includes(q.trim().toLowerCase());
    const hitType = ftype === "ทั้งหมด" ? true : it.type === ftype;
    return hitText && hitType;
  });

  // Helpers
  const fmtDT = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const StatusBadge = ({ s }) => (
    <span className="px-2 py-0.5 rounded-full text-xs border bg-emerald-50 text-emerald-700 border-emerald-300">
      {s}
    </span>
  );

  // Submit
  const submit = (e) => {
    e.preventDefault();
    if (!form.treeId.trim()) return alert("กรุณาระบุหมายเลขต้นทุเรียน (Tree ID)");
    if (!form.detail.trim()) return alert("กรุณากรอกรายละเอียดปัญหา");

    const rec = {
      id: `PB-${String(items.length + 1).padStart(3, "0")}`,
      treeId: form.treeId.trim(),
      type: form.type,
      detail: form.detail.trim(),
      createdAt: new Date().toISOString(),
      status: "ส่งแล้ว",
    };
    setItems((prev) => [rec, ...prev]);       // เพิ่มไปที่ตารางด้านล่างทันที
    setForm({ treeId: "", type: problemTypes[0], detail: "" });
    alert("ส่งรายงานปัญหาเรียบร้อย");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <div className="hidden md:block w-56 lg:w-64 shrink-0 sticky top-0 h-screen bg-white shadow-md">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          title="รายงานปัญหาที่เกิดขึ้นในสวน"
          subtitle="แจ้งรายละเอียดปัญหาเพื่อให้เจ้าของสวนให้คำแนะนำและแก้ไขได้อย่างรวดเร็ว"
          name="สมชาย เข้มแข็ง"
          role="เจ้าของสวน"
        />

        <main className="p-4 sm:p-6 pt-28 space-y-6">
          {/* ฟอร์มส่งปัญหา */}
          <div className="max-w-3xl mx-auto">
            <Card>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">
                      หมายเลขต้นทุเรียน (Tree ID)
                    </label>
                    <input
                      list="tree-list"
                      value={form.treeId}
                      onChange={onChange("treeId")}
                      placeholder="เช่น T-108"
                      className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <datalist id="tree-list">
                      {treeOptions.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-600 mb-1">
                      ประเภทปัญหา
                    </label>
                    <select
                      value={form.type}
                      onChange={onChange("type")}
                      className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {problemTypes.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    รายละเอียดปัญหาอาการ
                  </label>
                  <textarea
                    rows={6}
                    value={form.detail}
                    onChange={onChange("detail")}
                    placeholder="ตัวอย่าง: ใบเหลือง, มีแมลงกัดกิน, ต้นเหี่ยว ฯลฯ"
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm hover:bg-emerald-800"
                >
                  ส่งรายงานปัญหา
                </button>
              </form>
            </Card>
          </div>

          {/* ตารางปัญหาที่เพิ่งส่งล่าสุด + search/filter */}
          <div className="max-w-5xl mx-auto">
            <Card>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-2">
                <h3 className="font-semibold text-slate-800">ปัญหาที่ส่งล่าสุด</h3>

                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="ค้นหา: รหัส/TreeID/ประเภท/รายละเอียด"
                      className="w-64 border rounded-lg px-3 py-2 pl-9 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                  </div>
                  <select
                    value={ftype}
                    onChange={(e) => setFtype(e.target.value)}
                    className="border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option>ทั้งหมด</option>
                    {problemTypes.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 text-slate-600">
                      <th className="py-2 px-3">รหัส</th>
                      <th className="py-2 px-3">เวลา</th>
                      <th className="py-2 px-3">Tree ID</th>
                      <th className="py-2 px-3">ประเภทปัญหา</th>
                      <th className="py-2 px-3">รายละเอียด</th>
                      <th className="py-2 px-3">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r.id} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
                        <td className="py-2 px-3">{r.id}</td>
                        <td className="py-2 px-3">{fmtDT(r.createdAt)}</td>
                        <td className="py-2 px-3">{r.treeId}</td>
                        <td className="py-2 px-3">{r.type}</td>
                        <td className="py-2 px-3">{r.detail}</td>
                        <td className="py-2 px-3"><StatusBadge s={r.status} /></td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td className="py-6 px-3 text-center text-slate-500" colSpan={6}>
                          ไม่พบรายการตรงกับเงื่อนไข
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
