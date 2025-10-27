// src/pages/Signup.jsx
import React, { useState } from "react";
import InputField from "../components/InputField";
import PageHeader from "../components/PageHeader";
import PrimaryButton from "../components/PrimaryButton";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    address: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isValid =
    form.name &&
    form.phone &&
    form.email &&
    form.password &&
    form.password === form.confirm;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) {
      alert("กรุณากรอกข้อมูลให้ครบ และตรวจสอบว่ารหัสผ่านตรงกัน");
      return;
    }

    const newBroker = {
      ...form,
      role: "broker",
      approvalStatus: "pending",
    };

    console.log("Signup Data:", newBroker);
    alert("สมัครสำเร็จ! โปรดรอเจ้าของสวนอนุมัติบัญชีของคุณ");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <img
        src="/Logo.png"
        alt="Durian Farm"
        className="rounded-lg w-40 h-40 mb-4"
      />
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <PageHeader
          title="ลงทะเบียนผู้รับเหมาใหม่"
          subtitle="กรอกข้อมูลให้ครบเพื่อสร้างบัญชีของคุณ"
        />

        <form onSubmit={handleSubmit}>
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
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
          <InputField
            label="ที่อยู่"
            name="address"
            value={form.address}
            onChange={handleChange}
          />
          <InputField
            label="รหัสผ่าน"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          <InputField
            label="ยืนยันรหัสผ่าน"
            type="password"
            name="confirm"
            value={form.confirm}
            onChange={handleChange}
          />

          <PrimaryButton
            title="ลงทะเบียน"
            type="submit"
            className="w-full mt-4"
          />
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
