import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { listAllContracts, getOwnerDeadline, setOwnerDeadline } from "../../api/contracts"; // ✅ นำเข้า setOwnerDeadline

export default function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [contracts, setContracts] = useState([]);
  const [deadline, setDeadline] = useState(null);

  // ฟิลด์กำหนดวันปิดรับข้อเสนอ (แบบ date)
  const [deadlineDate, setDeadlineDate] = useState(""); // yyyy-mm-dd
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [all, dl] = await Promise.all([listAllContracts(), getOwnerDeadline()]);
        if (!alive) return;
        setContracts(all ?? []);
        const iso = dl?.current_deadline_date ?? null;
        setDeadline(iso);

        // แปลง ISO -> yyyy-mm-dd สำหรับ input[type=date]
        if (iso) {
          const d = new Date(iso);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          setDeadlineDate(`${yyyy}-${mm}-${dd}`);
        } else {
          setDeadlineDate("");
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const count = useMemo(() => {
    const p = contracts.filter(c => c.status === "รอการพิจารณา").length;
    const a = contracts.filter(c => c.status === "ยอมรับ").length;
    const r = contracts.filter(c => c.status === "ปฏิเสธ").length;
    return { pending: p, accepted: a, rejected: r, total: contracts.length };
  }, [contracts]);

  const latest = useMemo(
    () => contracts.slice().sort((a, b) => new Date(b.contract_date) - new Date(a.contract_date)).slice(0, 5),
    [contracts]
  );

  const fmtDT = (iso) =>
    iso
      ? new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
      : "-";

  // ✅ บันทึกวันปิดรับข้อเสนอ
  const handleSaveDeadline = async () => {
    try {
      if (!deadlineDate) {
        return alert("กรุณาเลือกวันที่ปิดรับข้อเสนอ");
      }
      // แปลง yyyy-mm-dd -> end of day (23:59:59) แล้วเป็น ISO
      const endOfDayLocal = new Date(`${deadlineDate}T23:59:59`);
      if (isNaN(endOfDayLocal.getTime())) {
        return alert("รูปแบบวันที่ไม่ถูกต้อง");
      }
      setSaving(true);
      const res = await setOwnerDeadline(endOfDayLocal.toISOString());
      setDeadline(res?.current_deadline_date ?? null);
      alert("บันทึกวันปิดรับข้อเสนอเรียบร้อย");
    } catch (e) {
      alert(e?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

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
          title="แดชบอร์ดเจ้าของสวน"
          subtitle="ภาพรวมข้อเสนอและกำหนดการ"
        />
        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-6xl mx-auto space-y-4">
            {loading ? (
              <Card>กำลังโหลดข้อมูล…</Card>
            ) : err ? (
              <Card className="text-rose-600">{err}</Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <div className="text-sm text-slate-500">ข้อเสนอทั้งหมด</div>
                    <div className="mt-1 text-2xl font-semibold">{count.total}</div>
                  </Card>
                  <Card>
                    <div className="text-sm text-slate-500">รอพิจารณา</div>
                    <div className="mt-1 text-2xl font-semibold">{count.pending}</div>
                  </Card>
                  <Card>
                    <div className="text-sm text-slate-500">ยอมรับแล้ว</div>
                    <div className="mt-1 text-2xl font-semibold">{count.accepted}</div>
                  </Card>
                  <Card>
                    <div className="text-sm text-slate-500">ถูกปฏิเสธ</div>
                    <div className="mt-1 text-2xl font-semibold">{count.rejected}</div>
                  </Card>
                </div>

                {/* ✅ การ์ดกำหนดวันปิดรับข้อเสนอ */}
                <Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm text-slate-500">กำหนดปิดรับข้อเสนอ (รอบปัจจุบัน)</div>
                      <div className="text-lg font-semibold">{fmtDT(deadline)}</div>
                      <p className="text-xs text-slate-500 mt-1">
                        * เมื่อถึงกำหนด ผู้รับหน้าจะไม่สามารถส่งข้อเสนอใหม่ได้
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 mb-1">ตั้งวันปิดรับข้อเสนอ</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={deadlineDate}
                          onChange={(e) => setDeadlineDate(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <button
                          onClick={handleSaveDeadline}
                          disabled={saving}
                          className={`px-3 py-2 rounded-lg text-white text-sm ${
                            saving ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-700 hover:bg-emerald-800"
                          }`}
                        >
                          {saving ? "กำลังบันทึก…" : "บันทึก"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4">
                    <div />
                    <Link
                      to="/owner/offers"
                      className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-white bg-emerald-700 hover:bg-emerald-800 text-sm"
                    >
                      ไปยังหน้าพิจารณาข้อเสนอ
                    </Link>
                  </div>
                </Card>

                {/* ข้อเสนอล่าสุด */}
                <Card>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">ข้อเสนอล่าสุด</h3>
                    <Link to="/owner/offers" className="text-sm underline text-slate-700">
                      ดูทั้งหมด
                    </Link>
                  </div>
                  {latest.length === 0 ? (
                    <div className="text-sm text-slate-600">ยังไม่มีข้อเสนอ</div>
                  ) : (
                    <div className="space-y-2">
                      {latest.map((o) => (
                        <div key={o.contract_id} className="border rounded-lg p-3 bg-white flex items-center justify-between">
                          <div className="text-sm">
                            <div className="font-medium">
                              #{o.contract_id.slice(0, 8)} • {o.broker_id ?? "-"}
                            </div>
                            <div className="text-slate-600">
                              ส่งเมื่อ {fmtDT(o.contract_date)}
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-medium ${
                              o.status === "รอการพิจารณา"
                                ? "bg-amber-100 text-amber-700"
                                : o.status === "ยอมรับ"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
