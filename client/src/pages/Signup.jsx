import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import PageHeader from "../components/PageHeader";
import InputField from "../components/InputField";
import TextArea from "../components/TextArea";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";

export default function Signup() {
  const navigate = useNavigate();

  // เก็บค่าจากฟอร์ม
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // ตรวจสอบข้อมูลเบื้องต้นก่อนส่ง
  const isValid =
    form.name.trim() &&
    form.phone.trim() &&
    form.address.trim() &&
    form.email.trim() &&
    form.password.length >= 6 &&
    form.password === form.confirmPassword;

  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isValid) {
      alert("กรุณากรอกข้อมูลให้ครบ และตรวจสอบว่ารหัสผ่านตรงกัน");
      return;
    }

    // mock การสมัคร
    console.log("Signup Data:", form);
    navigate("/login"); // เสร็จแล้วกลับไปหน้า login ชั่วคราว
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      {/* โลโก้ (อยู่ใน public/) */}
      <img src="/Logo.png" alt="MontongMoon Logo" className="w-50 h-50 " />

      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-lg">
        <PageHeader
          title="ลงทะเบียนผู้รับเหมาใหม่"
          subtitle="กรุณากรอกข้อมูลให้ครบถ้วนเพื่อให้เจ้าของสวนพิจารณา"
        />

        <form onSubmit={handleSubmit}>
          <InputField
            label="ชื่อ-นามสกุล"
            placeholder="ชื่อ-นามสกุล"
            value={form.name}
            onChange={handleChange("name")}
          />

          <InputField
            label="เบอร์โทรศัพท์"
            type="tel"
            placeholder="กรุณากรอกเบอร์โทรของคุณ"
            value={form.phone}
            onChange={handleChange("phone")}
          />

          <TextArea
            label="ที่อยู่"
            placeholder="กรุณากรอกที่อยู่ของคุณ"
            rows={3}
            value={form.address}
            onChange={handleChange("address")}
          />

          <InputField
            label="อีเมล"
            type="email"
            placeholder="name@example.com"
            value={form.email}
            onChange={handleChange("email")}
          />

          <InputField
            label="รหัสผ่าน"
            type="password"
            placeholder="อย่างน้อย 6 ตัวอักษร"
            value={form.password}
            onChange={handleChange("password")}
          />

          <InputField
            label="ยืนยันรหัสผ่าน"
            type="password"
            placeholder="พิมพ์รหัสผ่านอีกครั้ง"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
          />

          {!isValid && (
            <p className="text-xs text-red-500 mt-1 mb-3">
              *กรุณากรอกข้อมูลให้ครบ และตรวจสอบว่ารหัสผ่านตรงกัน
            </p>
          )}

          <div>
            <PrimaryButton
              type="submit"
              title="ลงทะเบียน"
              className="w-full mt-2 bg-yellow-500 hover:bg-yellow-600"
              disabled={!isValid}
            />

            <div className="flex  flex-col justify-center items-center gap-2 mt-4 text-sm text-gray-700">
              <span
                onClick={() => navigate("/login")}
                className="font-bold hover:underline cursor-pointer"
              >
                เข้าสู่ระบบ
              </span>
              <span>มีบัญชีอยู่แล้ว?</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
