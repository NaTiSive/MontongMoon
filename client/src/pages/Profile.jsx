// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi"; // ✅ เพิ่มไอคอนลูกศรย้อนกลับ

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    password: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        address: user.address || "",
        password: "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(form);
    alert("บันทึกข้อมูลสำเร็จ!");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 relative">
      <img
        src="/Logo.png"
        alt="Durian Farm"
        className="rounded-lg w-40 h-40 mb-4"
      />

      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md relative">
        {/* 🔙 ปุ่มย้อนกลับ */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-1.5 
                     text-emerald-700 border border-emerald-700 text-xs rounded-lg px-3 py-1.5
                     hover:bg-emerald-700 hover:text-white transition-all"
        >
          <FiArrowLeft size={14} />
          กลับสู่หน้าก่อนหน้า
        </button>

        <PageHeader title="โปรไฟล์ของฉัน" subtitle="แก้ไขข้อมูลส่วนตัวของคุณ" />

        <form onSubmit={handleSubmit} className="mt-6">
          <InputField
            label="ชื่อ - สกุล"
            name="name"
            value={form.name}
            onChange={handleChange}
          />
          <InputField
            label="เบอร์โทรศัพท์"
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />
          <InputField
            label="อีเมล"
            name="email"
            value={form.email}
            onChange={handleChange}
            disabled
          />
          <InputField
            label="ที่อยู่"
            name="address"
            value={form.address}
            onChange={handleChange}
          />
          <InputField
            label="รหัสผ่านใหม่ (ถ้ามี)"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
          />

          <PrimaryButton
            title="บันทึกการเปลี่ยนแปลง"
            type="submit"
            className="w-full mt-4"
          />
        </form>
      </div>
    </div>
  );
}
