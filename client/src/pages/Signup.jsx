// src/pages/Signup.jsx
import React, { useState } from "react";
import InputField from "../components/InputField";
import PageHeader from "../components/PageHeader";
import PrimaryButton from "../components/PrimaryButton";
import { useNavigate } from "react-router-dom";

const LS_BROKERS_KEY = "mm:brokers@v1";

function loadBrokers() {
  try {
    return JSON.parse(localStorage.getItem(LS_BROKERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBrokers(arr) {
  localStorage.setItem(LS_BROKERS_KEY, JSON.stringify(arr));
}

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("กรุณากรอกชื่อ");
    if (!form.phone.trim()) return alert("กรุณากรอกเบอร์โทรศัพท์");
    if (!form.email.trim()) return alert("กรุณากรอกอีเมล");
    if (!form.password) return alert("กรุณากรอกรหัสผ่าน");
    if (form.password !== form.confirm) return alert("รหัสผ่านไม่ตรงกัน");

    const brokers = loadBrokers();
    if (brokers.some((b) => b.email === form.email.toLowerCase())) {
      return alert("อีเมลนี้ถูกใช้งานแล้ว");
    }

    const nextId =
      (brokers.reduce((mx, b) => Math.max(mx, Number(b.broker_id || 0)), 0) || 0) + 1;

    const newBroker = {
      broker_id: nextId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.toLowerCase(),
      password: form.password,
      address: form.address.trim(),
      role: "broker",
      approvalStatus: "pending",
      created_at: new Date().toISOString(),
    };

    brokers.push(newBroker);
    saveBrokers(brokers);

    alert("สมัครสำเร็จ! โปรดเข้าสู่ระบบ (สถานะ: รออนุมัติ)");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      {/* ✅ คงโลโก้ของคุณไว้ */}
      <img src="/Logo.png" alt="Durian Farm" className="rounded-lg w-40 h-40 mb-4" />

      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <PageHeader
          title="ลงทะเบียนผู้รับเหมา"
          subtitle="กรอกข้อมูลเพื่อสมัครใช้งานระบบจัดการสวนทุเรียน"
        />

        <form onSubmit={handleSubmit}>
          <InputField label="ชื่อ-นามสกุล" name="name" value={form.name} onChange={handleChange} />
          <InputField label="เบอร์โทรศัพท์" name="phone" value={form.phone} onChange={handleChange} />
          <InputField label="อีเมล" type="email" name="email" value={form.email} onChange={handleChange} />
          <InputField label="ที่อยู่" name="address" value={form.address} onChange={handleChange} />
          <InputField label="รหัสผ่าน" type="password" name="password" value={form.password} onChange={handleChange} />
          <InputField label="ยืนยันรหัสผ่าน" type="password" name="confirm" value={form.confirm} onChange={handleChange} />

          <PrimaryButton title="ลงทะเบียน" type="submit" className="w-full mt-3" />
        </form>

        <p className="text-sm text-gray-600 text-center mt-4">
          มีบัญชีอยู่แล้ว?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-green-700 hover:underline cursor-pointer font-medium"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </span>
        </p>
      </div>
    </div>
  );
}
