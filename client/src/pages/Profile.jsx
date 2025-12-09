import React, { useState, useEffect } from "react";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { fetchCurrentUser, updateProfile } from "../api/auth"; // ✅ เพิ่มบรรทัดนี้

export default function Profile() {
  const { user, updateUser } = useAuth(); // สมมติ context ยังมีไว้ sync UI
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // โหลดค่าจาก current user หรือจะ fetch สดอีกรอบก็ได้
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        address: user.address || "",
        password: "",
      });
    } else {
      // ถ้ากลัว context ไม่ sync ลองดึงจาก server
      (async () => {
        const me = await fetchCurrentUser();
        if (me) {
          setForm({
            name: me.name || "",
            phone: me.phone || "",
            email: me.email || "",
            address: me.address || "",
            password: "",
          });
          updateUser?.(me);
        }
      })();
    }
  }, [user, updateUser]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password && form.password.length < 6) {
      alert("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        password: form.password || undefined,
      };
      const updated = await updateProfile(payload);      // ✅ ยิง API จริง
      updateUser?.(updated);                              // sync context/UI
      alert("บันทึกข้อมูลสำเร็จ!");
      setForm((f) => ({ ...f, password: "" }));          // เคลียร์ช่องรหัสผ่าน
    } catch (err) {
      alert(err?.message || "อัปเดตข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 relative">
      <img src="/Logo.png" alt="Durian Farm" className="rounded-lg w-40 h-40 mb-4" />

      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-emerald-700 border border-emerald-700 text-xs rounded-lg px-3 py-1.5 hover:bg-emerald-700 hover:text-white transition-all"
        >
          <FiArrowLeft size={14} />
          กลับสู่หน้าก่อนหน้า
        </button>

        <PageHeader title="โปรไฟล์ของฉัน" subtitle="แก้ไขข้อมูลส่วนตัวของคุณ" />

        <form onSubmit={handleSubmit} className="mt-6">
          <InputField label="ชื่อ - สกุล" name="name" value={form.name} onChange={handleChange} />
          <InputField label="เบอร์โทรศัพท์" name="phone" value={form.phone} onChange={handleChange} />
          <InputField label="อีเมล" name="email" value={form.email} onChange={handleChange} disabled />
          <InputField label="ที่อยู่" name="address" value={form.address} onChange={handleChange} />
          <div className="mb-4">
            <InputField label="รหัสผ่านใหม่ (ถ้ามี)" name="password" type="password" value={form.password} onChange={handleChange} />
            <p className="text-xs text-gray-500 mt-1 ml-1">* ต้องมีอย่างน้อย 6 ตัวอักษร หากต้องการเปลี่ยนรหัสผ่าน</p>
          </div>
          <PrimaryButton title={saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"} type="submit" className="w-full mt-4" disabled={saving} />
        </form>
      </div>
    </div>
  );
}
