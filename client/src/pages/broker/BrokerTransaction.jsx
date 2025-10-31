import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  createTransaction,
  listBrokerTransactions,
} from "../../api/accounts";

export default function BrokerTransaction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  const disabled = user?.approvalStatus !== "approved";

  // โหลดรายการของฉัน
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const reload = async () => {
    try {
      const me = await listBrokerTransactions(user?.broker_id);
      setRows(me.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      setErr("");
    } catch (e) {
      setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.broker_id == null) return;
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.broker_id]);

  // ฟอร์ม
  const [form, setForm] = useState({
    type: "รายจ่าย",
    amount: "",
    payment_method: "เงินสด", // เงินสด | โอนเงิน | ผ่อนชำระ
    note: "",
    receipt: null, // {name, mime, dataUrl}
  });

  const update = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  const onPickReceipt = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return setForm((p) => ({ ...p, receipt: null }));
    try {
      const dataUrl = await readFileAsDataUrl(f);
      setForm((p) => ({
        ...p,
        receipt: { name: f.name, mime: f.type || "application/octet-stream", dataUrl },
      }));
    } catch {
      alert("อ่านไฟล์ใบเสร็จไม่สำเร็จ");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (disabled) return;

    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) return alert("กรุณากรอกจำนวนเงินให้ถูกต้อง");

    try {
      await createTransaction(user?.broker_id, {
        type: form.type,
        amount: amt,
        payment_method: form.payment_method, // มี “ผ่อนชำระ”
        note: form.note?.trim() || "",
        receipt: form.receipt || null,       // แนบไฟล์ไปด้วย
      });
      setForm({
        type: form.type,
        amount: "",
        payment_method: "เงินสด",
        note: "",
        receipt: null,
      });
      await reload();
      alert("บันทึกธุรกรรมสำเร็จ");
    } catch (e2) {
      alert(e2?.message || "บันทึกไม่สำเร็จ");
    }
  };

  const fmt = (iso) =>
    new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

  // ค้นหา/กรองเบื้องต้น
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ทั้งหมด");
  const [methodFilter, setMethodFilter] = useState("ทั้งหมด");

  const filtered = useMemo(() => {
    let list = rows;
    if (typeFilter !== "ทั้งหมด") list = list.filter((x) => x.type === typeFilter);
    if (methodFilter !== "ทั้งหมด") list = list.filter((x) => x.payment_method === methodFilter);
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter((x) =>
      `${x.id} ${x.type} ${x.payment_method} ${x.amount} ${x.note} ${x.status}`
        .toLowerCase()
        .includes(k)
    );
  }, [rows, q, typeFilter, methodFilter]);

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="ธุรกรรมของฉัน"
          subtitle="บันทึกค่าใช้จ่าย/รายรับ และแนบใบเสร็จ"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {disabled && (
              <Card>
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  บัญชีของคุณยัง <b>รอการอนุมัติ</b> — ฟอร์มนี้ถูกปิดการใช้งานชั่วคราว
                </div>
              </Card>
            )}

            <Card>
              <h3 className="font-semibold mb-2">เพิ่มธุรกรรมใหม่</h3>
              <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">ประเภท</label>
                  <select
                    value={form.type}
                    onChange={update("type")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                  >
                    <option>รายรับ</option>
                    <option>รายจ่าย</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={update("amount")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                    placeholder="เช่น 25000"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">วิธีการชำระเงิน</label>
                  <select
                    value={form.payment_method}
                    onChange={update("payment_method")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                  >
                    <option>เงินสด</option>
                    <option>โอนเงิน</option>
                    <option>ผ่อนชำระ</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm text-slate-600 mb-1">หมายเหตุ</label>
                  <input
                    value={form.note}
                    onChange={update("note")}
                    disabled={disabled}
                    className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-slate-100"
                    placeholder="รายละเอียดเพิ่มเติม"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm text-slate-600 mb-1">อัปโหลดใบเสร็จ (ภาพ/PDF)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={onPickReceipt}
                    disabled={disabled}
                    className="block w-full text-sm"
                  />
                  {form.receipt && (
                    <div className="text-xs text-slate-600 mt-1">
                      แนบแล้ว: <b>{form.receipt.name}</b>
                    </div>
                  )}
                </div>

                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={disabled}
                    className={`px-4 py-2 rounded-lg text-white text-sm ${
                      disabled ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-700 hover:bg-emerald-800"
                    }`}
                  >
                    บันทึกธุรกรรม
                  </button>
                </div>
              </form>
            </Card>

            {/* แผงค้นหา/กรอง */}
            <Card>
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div className="text-sm text-slate-600">ทั้งหมด {rows.length} รายการ</div>
                <div className="flex items-center gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 bg-white"
                  >
                    <option>ทั้งหมด</option>
                    <option>รายรับ</option>
                    <option>รายจ่าย</option>
                  </select>
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 bg-white"
                  >
                    <option>ทั้งหมด</option>
                    <option>เงินสด</option>
                    <option>โอนเงิน</option>
                    <option>ผ่อนชำระ</option>
                  </select>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหา ประเภท/วิธีจ่าย/หมายเหตุ/สถานะ"
                    className="border rounded-lg px-3 py-2 bg-white w-64"
                  />
                </div>
              </div>
            </Card>

            {/* ตารางรายการ */}
            <Card>
              {loading ? (
                <div className="text-sm text-slate-500">กำลังโหลด…</div>
              ) : err ? (
                <div className="text-sm text-rose-600">{err}</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-slate-600">ยังไม่มีรายการ</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-slate-50 text-slate-600">
                        <th className="py-2 px-3">เวลา</th>
                        <th className="py-2 px-3">ประเภท</th>
                        <th className="py-2 px-3">วิธีจ่าย</th>
                        <th className="py-2 px-3">จำนวนเงิน</th>
                        <th className="py-2 px-3">สถานะ</th>
                        <th className="py-2 px-3">ใบเสร็จ</th>
                        <th className="py-2 px-3">หมายเหตุ</th>
                        <th className="py-2 px-3">#ไอดี</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="py-2 px-3">{fmt(r.created_at)}</td>
                          <td className="py-2 px-3">{r.type}</td>
                          <td className="py-2 px-3">{r.payment_method}</td>
                          <td className="py-2 px-3">{r.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-lg text-xs ${
                              r.status === "รอการตรวจสอบ"
                                ? "bg-amber-100 text-amber-700"
                                : r.status === "อนุมัติ"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {r.receipt?.dataUrl ? (
                              <a
                                href={r.receipt.dataUrl}
                                download={r.receipt.name || "receipt"}
                                className="text-emerald-700 underline"
                              >
                                ดาวน์โหลด
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-2 px-3">{r.note || "-"}</td>
                          <td className="py-2 px-3 text-slate-500">{r.id.slice(0, 8)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
