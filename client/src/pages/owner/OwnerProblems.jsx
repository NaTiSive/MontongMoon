// src/pages/owner/OwnerProblemsCards.jsx
import React, { useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";
import { FaMagnifyingGlass } from "react-icons/fa6";

export default function OwnerProblems() {
  // ── ตัวอย่างหลายปัญหา ───────────────────────────────
  const sampleIssues = [
    {
      id: 1,
      type: "overall", // overall = ปัญหาภาพรวม, byTree = ปัญหารายต้น
      title: "แรงดันน้ำตก",
      reportedAt: "2025-09-20T09:30:00",
      treeId: "-",
      email: "workerA@email.com",
      phone: "081-234-5678",
      address: "โซน C - ระบบน้ำกลางสวน",
      detail: "สปริงเกอร์ปลายแถวไม่ออกน้ำ ต้องตรวจแรงดันปั๊มหลัก",
    },
    {
      id: 2,
      type: "byTree",
      title: "ใบไหม้จากแสงแดด",
      reportedAt: "2025-09-21T13:15:00",
      treeId: "T-032",
      email: "workerB@email.com",
      phone: "081-111-2222",
      address: "โซน B",
      detail: "ใบไหม้บริเวณยอด คาดว่าโดนแดดแรงจัดในช่วงเที่ยง",
    },
    {
      id: 3,
      type: "byTree",
      title: "รากเน่า",
      reportedAt: "2025-09-23T16:05:00",
      treeId: "T-041",
      email: "workerC@email.com",
      phone: "081-333-4444",
      address: "โซน D",
      detail: "โคนต้นชื้นตลอด มีคราบและกลิ่นเน่า ควรขุดตรวจราก",
    },
    {
      id: 4,
      type: "overall",
      title: "ไฟส่องสว่างทางเดินเสีย",
      reportedAt: "2025-10-02T19:40:00",
      treeId: "-",
      email: "maint@email.com",
      phone: "081-000-9999",
      address: "ทางเดินกลางสวน",
      detail: "ไฟทางช่วง A-B ไม่ติดหลายดวง ต้องตรวจสายไฟ",
    },
  ];

  // ── ค้นหา ────────────────────────────────────────────
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return sampleIssues;
    return sampleIssues.filter((x) => {
      const hay =
        `${x.title} ${x.treeId} ${x.address} ${x.email} ${x.phone} ${x.detail} ${x.type}`.toLowerCase();
      return hay.includes(query);
    });
  }, [q]);

  // ── เก็บข้อความคำแนะนำแยกตามการ์ด ───────────────────
  const [adviceMap, setAdviceMap] = useState({});
  const setAdvice = (id, val) =>
    setAdviceMap((prev) => ({ ...prev, [id]: val }));

  // ── helpers ───────────────────────────────────────────
  const fmt = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const TypeBadge = ({ type }) => (
    <span
      className={
        "px-3 py-1 rounded-full text-xs font-medium " +
        (type === "overall"
          ? "bg-rose-100 text-rose-700"
          : "bg-emerald-100 text-emerald-700")
      }
    >
      {type === "overall" ? "ปัญหาภาพรวม" : "ปัญหารายต้น"}
    </span>
  );

  const InfoRow = ({ label, value }) => (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="font-medium">{value || "-"}</div>
    </div>
  );

  const sendAdvice = (issue) => {
    const text = adviceMap[issue.id]?.trim();
    if (!text) {
      alert("โปรดพิมพ์คำแนะนำก่อนส่ง");
      return;
    }
    // TODO: เรียก API ส่งคำแนะนำจริงได้ที่นี่
    console.log("ส่งคำแนะนำให้ issue:", issue.id, "ข้อความ:", text);
    alert(`ส่งคำแนะนำให้เรื่อง "${issue.title}" เรียบร้อย`);
    setAdvice(issue.id, ""); // ล้างช่องหลังส่ง
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
          title="ปัญหาที่ผู้รับเหมารายงาน"
          subtitle="ติดตามสถานการณ์ในสวนและให้คำแนะนำกลับไปยังผู้รับเหมา"
          name="สมชาย เข้มแข็ง"
          role="เจ้าของสวน"
        />

        <main className="p-4 sm:p-6 space-y-4">
          {/* ค้นหา */}
          <div className="flex justify-end">
            <div className="relative w-full sm:w-80">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา หัวข้อ/Tree/โซน/ผู้แจ้ง/รายละเอียด…"
                className="w-full rounded-lg border px-3 py-2 pl-9 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <FaMagnifyingGlass />
              </span>
            </div>
          </div>

          {/* การ์ดหลายใบเรียงกัน */}
          <div className="max-w-4xl mx-auto space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center text-slate-500 py-8 bg-white rounded-lg border shadow-sm">
                ไม่พบปัญหาที่ตรงกับคำค้นหา
              </div>
            ) : (
              filtered
                .sort((a, b) => (a.reportedAt < b.reportedAt ? 1 : -1))
                .map((issue) => (
                  <Card key={issue.id}>
                    {/* หัวเรื่อง + badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                          {issue.title}
                        </h2>
                        <p className="text-sm text-slate-600">
                          รายงานเมื่อ {fmt(issue.reportedAt)}
                        </p>
                      </div>
                      <TypeBadge type={issue.type} />
                    </div>

                    {/* สองคอลัมน์ข้อมูล */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-sm">
                      <div className="space-y-4">
                        <InfoRow label="Tree ID" value={issue.treeId} />
                        <InfoRow label="อีเมล" value={issue.email} />
                        <InfoRow label="ที่อยู่ / โซน" value={issue.address} />
                      </div>
                      <div className="space-y-4">
                        <InfoRow label="เบอร์ติดต่อ" value={issue.phone} />
                      </div>
                    </div>

                    {/* รายละเอียดปัญหา */}
                    <div className="mt-5">
                      <label className="block text-sm text-slate-600 mb-1">
                        รายละเอียดปัญหา
                      </label>
                      <div className="bg-slate-100 rounded-lg px-3 py-3 min-h-[80px] text-sm text-slate-800">
                        {issue.detail || "—"}
                      </div>
                    </div>

                    {/* คำแนะนำรายเรื่อง */}
                    <div className="mt-5">
                      <label className="block text-sm text-slate-600 mb-1">
                        ให้คำแนะนำหรือวิธีแก้ไขไปยังผู้รับเหมา
                      </label>
                      <textarea
                        rows={3}
                        value={adviceMap[issue.id] ?? ""}
                        onChange={(e) => setAdvice(issue.id, e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800 outline-none bg-slate-100 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="mt-3">
                        <button
                          onClick={() => sendAdvice(issue)}
                          className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm hover:bg-emerald-800"
                        >
                          ส่งคำแนะนำ
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
