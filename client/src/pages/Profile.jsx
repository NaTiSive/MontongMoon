// web/src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import HeaderWrapper from "../components/HeaderWrapper";
import Card from "../components/Card";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// ใช้ auth เดิม (ไม่เปลี่ยน UI/โครงเดิม) — แค่เติมฟังก์ชันอัปเดต
import { fetchCurrentUser, updateProfile } from "../api/auth";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ฟอร์ม: ให้คีย์เป็น name/phone/address/email/password ตรงกับที่ PATCH /auth/me รับ
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    password: "", // เว้นว่าง = ไม่เปลี่ยนรหัส
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    // Prefill จาก user ที่โหลดไว้แล้ว (ไม่เปลี่ยน UI/โครงสร้าง)
    // owner ใช้ owner_name, broker ใช้ broker_name — map มาเป็น name ให้ฟอร์ม
    setForm((f) => ({
      ...f,
      name: user.owner_name || user.broker_name || "",
      phone: user.phone || "",
      address: user.address || "",
      email: user.email || "",
      password: "",
    }));
    setLoading(false);
  }, [user, navigate]);

  // ✅ แก้บั๊กเดิม (ห้ามใช้ { .form, ... }): ใช้ ...spread ให้ถูกต้อง
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  // กดบันทึก: เรียก PATCH /auth/me แล้ว refresh user ผ่าน /auth/me (fetchCurrentUser)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // ส่งเฉพาะฟิลด์ที่แก้จริง—password เว้นว่างจะไม่เปลี่ยน
      const payload = {
        name: form.name?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address: form.address?.trim() || undefined,
        email: form.email?.trim() || undefined,
        password: form.password?.trim() || undefined,
      };
      await updateProfile(payload);
      await fetchCurrentUser(); // sync user ใน storage/context ให้ตรงหลังอัปเดต
      alert("บันทึกข้อมูลสำเร็จ!");
      setForm((p) => ({ ...p, password: "" }));
    } catch (err) {
      alert(err?.message || "บันทึกไม่สำเร็จ");
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
          title="โปรไฟล์ของฉัน"
          subtitle="แก้ไขข้อมูลติดต่อและรหัสผ่าน"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-3xl mx-auto space-y-4">
            <Card>
              {loading ? (
                <div className="p-3 text-sm text-slate-500">กำลังโหลด…</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">
                        ชื่อ-นามสกุล
                      </label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-600 mb-1">
                        เบอร์โทร
                      </label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm text-slate-600 mb-1">
                        ที่อยู่
                      </label>
                      <input
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm text-slate-600 mb-1">
                        อีเมล
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        * หากระบบของคุณไม่รองรับการแก้อีเมล ให้คงค่าปัจจุบันไว้
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-sm text-slate-600 mb-1">
                        รหัสผ่านใหม่ (ถ้าเปลี่ยน)
                      </label>
                      <input
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="ปล่อยว่างหากไม่ต้องการเปลี่ยน"
                        className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-white text-sm bg-emerald-700 hover:bg-emerald-800"
                    >
                      บันทึกการเปลี่ยนแปลง
                    </button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
