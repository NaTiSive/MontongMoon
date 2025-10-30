// src/pages/owner/OwnerProcessing.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import InputField from "../../components/InputField";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// ใช้ตรง LocalStorage เพื่อไม่แตะ fruits.js เดิม (แนวทาง B)
const KEY = "mm:fruits@v1";

function loadFruits() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function saveFruits(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr));
}
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function OwnerProcessing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      setRows(loadFruits());
    } catch (e) {
      setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  // ประมาณ “ตกเกรดคงเหลือ” = (sum grade=ตกเกรด) - (sum type=แปรรูป)
  // ประมาณ “ตกเกรดคงเหลือ” = (sum grade=ตกเกรด เฉพาะที่ยังเป็นเก็บเกี่ยว) - (sum type=แปรรูป)
  const downgradedStock = useMemo(() => {
    // ฝั่ง "เก็บเกี่ยว" (ยังอยู่ในคลัง): กรองเฉพาะที่ไม่ใช่แปรรูป/ส่งออก
    const totalDowngradedHarvest = rows
      .filter(
        (r) =>
          r?.grade === "ตกเกรด" && r?.type !== "แปรรูป" && r?.type !== "ส่งออก"
      )
      .reduce((s, r) => s + Number(r?.weight_kg || 0), 0);

    // ฝั่ง "ถูกใช้แปรรูปไปแล้ว"
    const processed = rows
      .filter((r) => r?.type === "แปรรูป")
      .reduce((s, r) => s + Number(r?.weight_kg || 0), 0);

    return Math.max(0, totalDowngradedHarvest - processed);
  }, [rows]);

  // ฟอร์ม UC11
  const [form, setForm] = useState({
    method: "", // วิธีแปรรูป (ทอด/แช่แข็ง/กวน/อบแห้ง/อื่นๆ)
    amountKg: "", // ปริมาณที่จะใช้แปรรูป (kg)
    note: "",
  });

  const onChange = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e) => {
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

    // บันทึกตาม UC11 ข้อ 8–12: fruit_id ใหม่, date ปัจจุบัน, grade=ตกเกรด, type=แปรรูป
    const rec = {
      id: uuid(), // fruit_id
      grade: "ตกเกรด", // คงตาม UC11 ข้อ 10
      type: "แปรรูป", // ตาม UC11 ข้อ 11
      process_method: method, // เก็บ method เพิ่มเติม
      weight_kg: amount, // ใช้ field เดียวกับระบบเดิม
      count: null, // ไม่เกี่ยวกับจำนวนผลในกรณีแปรรูป
      note: form.note?.trim() || "",
      harvest_at: new Date().toISOString(), // ใช้เป็น date ปัจจุบัน (UC11 ข้อ 9)
    };

    try {
      const all = loadFruits();
      all.push(rec);
      saveFruits(all);
      setRows(all);
      setForm({ method: "", amountKg: "", note: "" });
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
                    {rows
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
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
