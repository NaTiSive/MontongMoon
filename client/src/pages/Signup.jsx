import React, { useState } from "react";
import InputField from "../components/InputField";
import PageHeader from "../components/PageHeader";
import PrimaryButton from "../components/PrimaryButton";
import { useNavigate } from "react-router-dom";
import { signupBroker } from "../api/auth";

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

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
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
      setSubmitting(true);
      await signupBroker({ name, phone, email, address, password });
      alert("สมัครสำเร็จ! โปรดเข้าสู่ระบบ (สถานะ: รออนุมัติ)");
      navigate("/login");
    } catch (err) {
      alert(err?.message || "สมัครไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
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

          {/* ✅ ช่องรหัสผ่านพร้อม helper text */}
          <div className="mb-4">
            <InputField
              label="รหัสผ่าน"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1 ml-1">
              * ต้องมีอย่างน้อย 6 ตัวอักษร
            </p>
          </div>

          <InputField
            label="ยืนยันรหัสผ่าน"
            type="password"
            name="confirm"
            value={form.confirm}
            onChange={handleChange}
          />

          <PrimaryButton
            title={submitting ? "กำลังบันทึก..." : "ลงทะเบียน"}
            type="submit"
            className="w-full mt-3"
            disabled={submitting}
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
