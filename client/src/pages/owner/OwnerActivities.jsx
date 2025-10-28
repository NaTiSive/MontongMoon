// src/pages/owner/OwnerActivities.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { listAllContracts } from "../../api/contracts";

export default function OwnerActivities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [contracts, setContracts] = useState([]);

  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const all = await listAllContracts();
        if (!alive) return;
        setContracts(all ?? []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดกิจกรรมไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // สร้าง "กิจกรรม" จากสถานะของสัญญา (mock):
  // - ทุกสัญญามีเหตุการณ์ "ยื่นข้อเสนอ" (ใช้ contract_date)
  // - สถานะปัจจุบันเป็น "ยอมรับ" หรือ "ปฏิเสธ" จะแสดงเป็น label; (หากต้องเวลาอนุมัติจริงให้เพิ่ม timestamp ใน backend)
  const events = useMemo(() => {
    const list = (contracts || []).map((c) => ({
      id: c.contract_id,
      broker: c.broker_id ?? "-",
      when: c.contract_date,
      status: c.status, // "รอการพิจารณา" | "ยอมรับ" | "ปฏิเสธ"
      title:
        c.status === "ยอมรับ"
          ? "อนุมัติข้อเสนอ"
          : c.status === "ปฏิเสธ"
          ? "ปฏิเสธข้อเสนอ"
          : "ยื่นข้อเสนอ",
      subtitle: `ปริมาณ ${Number(c.qtt_estimate || 0).toLocaleString("th-TH")} กก. • ราคา ${Number(
        c.offerprice || 0
      ).toLocaleString("th-TH")} บาท/กก. • ชำระเงิน: ${c.payment_term}`,
      note: c.note || "",
    }));
    return list.sort((a, b) => new Date(b.when) - new Date(a.when));
  }, [contracts]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return events;
    return events.filter((e) =>
      `${e.id} ${e.broker} ${e.title} ${e.subtitle} ${e.note} ${e.status}`
        .toLowerCase()
        .includes(k)
    );
  }, [events, q]);

  const fmtDT = (iso) =>
    iso
      ? new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
      : "-";

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
      isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
    }`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="กิจกรรมล่าสุด"
          subtitle="ไทม์ไลน์การยื่นข้อเสนอและการตัดสินใจ"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex justify-end">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา #สัญญา / ชื่อ broker / สถานะ / รายละเอียด…"
                className="w-full sm:w-96 border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {loading ? (
              <Card>กำลังโหลดกิจกรรม…</Card>
            ) : err ? (
              <Card className="text-rose-600">{err}</Card>
            ) : filtered.length === 0 ? (
              <Card className="text-sm text-slate-600">ไม่มีกิจกรรม</Card>
            ) : (
              filtered.map((ev) => (
                <Card key={ev.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">
                        #{ev.id.slice(0, 8)} — {ev.title}
                      </div>
                      <div className="text-sm text-slate-600">
                        ผู้รับเหมา: {ev.broker} • {fmtDT(ev.when)}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        ev.status === "รอการพิจารณา"
                          ? "bg-amber-100 text-amber-700"
                          : ev.status === "ยอมรับ"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {ev.status}
                    </span>
                  </div>
                  <div className="text-sm">{ev.subtitle}</div>
                  {ev.note && (
                    <div className="text-xs text-slate-500">หมายเหตุ: {ev.note}</div>
                  )}
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
