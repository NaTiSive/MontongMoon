// src/pages/Signup.jsx
import React, { useState } from "react";
import InputField from "../components/InputField";
import PageHeader from "../components/PageHeader";
import PrimaryButton from "../components/PrimaryButton";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    password: "",
    confirm: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim().toLowerCase();
    const address = form.address.trim();
    const password = form.password;
    const confirm = form.confirm;

    if (!name) return alert("กรุณากรอกชื่อ");
    if (!phone) return alert("กรุณากรอกเบอร์โทรศัพท์");
    if (!email) return alert("กรุณากรอกอีเมล");
    if (!password) return alert("กรุณากรอกรหัสผ่าน");
    if (password.length < 6) return alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    if (password !== confirm) return alert("รหัสผ่านไม่ตรงกัน");

    try {
      const res = await fetch(`${API}/auth/register-broker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brokerName: name,
          email,
          phone,
          password,
          address,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "สมัครไม่สำเร็จ");
      }
      alert("สมัครสำเร็จ! โปรดเข้าสู่ระบบ (สถานะ: รออนุมัติ)");
      navigate("/login");
    } catch (err) {
      alert(err.message || "เกิดข้อผิดพลาดในการสมัคร");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <img src="/Logo.png" alt="Durian Farm" className="rounded-lg w-40 h-40 mb-4" />
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <PageHeader title="ลงทะเบียนผู้รับเหมา" subtitle="กรอกข้อมูลเพื่อสมัครใช้งานระบบจัดการสวนทุเรียน" />
        <form onSubmit={handleSubmit}>
          <InputField label="ชื่อ-นามสกุล" name="name" value={form.name} onChange={handleChange} />
          <InputField label="เบอร์โทรศัพท์" name="phone" value={form.phone} onChange={handleChange} />
          <InputField label="อีเมล" type="email" name="email" value={form.email} onChange={handleChange} />
          <InputField label="ที่อยู่" name="address" value={form.address} onChange={handleChange} />
          <div className="mb-4">
            <InputField label="รหัสผ่าน" type="password" name="password" value={form.password} onChange={handleChange} />
            <p className="text-xs text-gray-500 mt-1 ml-1">* ต้องมีอย่างน้อย 6 ตัวอักษร</p>
          </div>
          <InputField label="ยืนยันรหัสผ่าน" type="password" name="confirm" value={form.confirm} onChange={handleChange} />
          <PrimaryButton title="ลงทะเบียน" type="submit" className="w-full mt-3" />
        </form>
        <p className="text-sm text-gray-600 text-center mt-4">
          มีบัญชีอยู่แล้ว?{" "}
          <span onClick={() => navigate("/login")} className="text-green-700 hover:underline cursor-pointer font-medium">
            กลับไปหน้าเข้าสู่ระบบ
          </span>
        </p>
      </div>
    </div>
  );
}
