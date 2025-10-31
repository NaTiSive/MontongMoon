// src/pages/owner/OwnerProcessing.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import InputField from "../../components/InputField";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { createProcessingRecord, getDowngradedStock } from "../../api/processing";
import { listProcessedFruits } from "../../api/fruits";

export default function OwnerProcessing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  const [err, setErr] = useState("");
  const [downgradedStock, setDowngradedStock] = useState(0);
  const [loadingStock, setLoadingStock] = useState(true);
  const [processedRows, setProcessedRows] = useState([]);
  const [loadingProcessed, setLoadingProcessed] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingStock(true);
        setLoadingProcessed(true);
        const [stock, processed] = await Promise.all([
          getDowngradedStock(),
          listProcessedFruits(),
        ]);
        if (!alive) return;
        setDowngradedStock(stock);
        setProcessedRows(processed);
        setErr("");
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!alive) return;
        setLoadingStock(false);
        setLoadingProcessed(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ฟอร์ม UC11
  const [form, setForm] = useState({
    method: "", // วิธีแปรรูป (ทอด/แช่แข็ง/กวน/อบแห้ง/อื่นๆ)
    amountKg: "", // ปริมาณที่จะใช้แปรรูป (kg)
    note: "",
  });

  const onChange = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const reloadData = async () => {
    try {
      setLoadingStock(true);
      setLoadingProcessed(true);
      const [stock, processed] = await Promise.all([
        getDowngradedStock(),
        listProcessedFruits(),
      ]);
      setDowngradedStock(stock);
      setProcessedRows(processed);
    } catch (e) {
      setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoadingStock(false);
      setLoadingProcessed(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const method = (form.method || "").trim();
    const amount = Number(form.amountKg);

    // ตรวจสอบตาม UC11 ข้อ 7
    if (!method) return alert("กรุณาเลือกวิธีการแปรรูป");
    if (!amount || Number.isNaN(amount))
      return alert("กรุณาระบุปริมาณให้ถูกต้อง");
    if (amount <= 0) return alert("ปริมาณต้องมากกว่า 0");
    if (amount > downgradedStock)
      return alert("ปริมาณเกินกว่าทุเรียนตกเกรดคงเหลือ");

    try {
      await createProcessingRecord({
        method,
        amountKg: amount,
        note: form.note?.trim() || "",
      });
      setForm({ method: "", amountKg: "", note: "" });
      await reloadData();
      alert("บันทึกการแปรรูปสำเร็จ");
      // กลับ Dashboard ตาม UC11 ข้อ 15 (ถ้ายังไม่ต้อง redirect ให้คอมเมนต์บรรทัดล่างไว้ได้)
      // navigate("/owner/dashboard");
    } catch (e2) {
      alert(e2?.message || "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div
      className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
        isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
      }`}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="แปรรูปทุเรียน"
          subtitle="เลือกวิธีแปรรูปและกำหนดปริมาณจากทุเรียนเกรดตก"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* ปริมาณตกเกรดคงเหลือ */}
            <Card>
              {err ? (
                <div className="text-rose-600 text-sm">{err}</div>
              ) : loadingStock ? (
                <div className="text-sm text-slate-500">กำลังโหลดข้อมูล…</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-slate-500 text-sm">
                      ทุเรียนตกเกรดคงเหลือ (กก.)
                    </div>
                    <div className="text-2xl font-semibold">
                      {downgradedStock.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* ฟอร์ม UC11 */}
            <Card>
              <form
                onSubmit={submit}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-600 mb-1">
                    วิธีการแปรรูป
                  </label>
                  <select
                    value={form.method}
                    onChange={onChange("method")}
                    className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">— เลือกวิธี —</option>
                    <option value="ทอด">ทอด</option>
                    <option value="แช่แข็ง">แช่แข็ง</option>
                    <option value="กวน">กวน</option>
                    <option value="อบแห้ง">อบแห้ง</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                <div className="md:col-span-1">
                  <InputField
                    label="ปริมาณที่จะแปรรูป (กก.)"
                    type="number"
                    value={form.amountKg}
                    onChange={onChange("amountKg")}
                    placeholder="เช่น 50"
                  />
                </div>

                <div className="md:col-span-2">
                  <InputField
                    label="หมายเหตุ"
                    value={form.note}
                    onChange={onChange("note")}
                    placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <PrimaryButton title="ยืนยันการแปรรูป" type="submit" />
                </div>
              </form>
            </Card>

            {/* บันทึกล่าสุด (ตัวอย่างตารางสั้น ๆ เพื่อความโปร่งใส) */}
            <Card>
              <div className="text-sm text-slate-600 mb-2">
                รายการแปรรูปล่าสุด
              </div>
              {loadingProcessed ? (
                <div className="text-sm text-slate-500">กำลังโหลดข้อมูล…</div>
              ) : processedRows.length === 0 ? (
                <div className="text-sm text-slate-500">ยังไม่มีรายการแปรรูป</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left bg-slate-50 text-slate-600">
                        <th className="py-2 px-3">วันที่</th>
                        <th className="py-2 px-3">วิธี</th>
                        <th className="py-2 px-3">ปริมาณ (กก.)</th>
                        <th className="py-2 px-3">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedRows
                        .filter((r) => r?.type === "แปรรูป")
                        .sort(
                          (a, b) =>
                            new Date(b.harvest_at) - new Date(a.harvest_at)
                        )
                        .slice(0, 10)
                        .map((r, i) => (
                          <tr
                            key={r.id}
                            className={
                              i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                            }
                          >
                            <td className="py-2 px-3">
                              {new Date(r.harvest_at).toLocaleString("th-TH", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="py-2 px-3">
                              {r.process_method || "-"}
                            </td>
                            <td className="py-2 px-3">
                              {Number(r.weight_kg || 0).toLocaleString()}
                            </td>
                            <td className="py-2 px-3">{r.note || "-"}</td>
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
