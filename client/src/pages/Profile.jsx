import React, { useState } from "react";
import InputField from "../components/InputField";
import TextArea from "../components/TextArea";
import PrimaryButton from "../components/PrimaryButton";
import PageHeader from "../components/pageHeader";
import Card from "../components/Card";

export default function EditProfile() {
  const [form, setForm] = useState({
    name: "สมชาย ใจดี",
    phone: "099-000-0000",
    email: "broker@durianmail.com",
    address: "123 หมู่บ้านผลไม้เมืองแหล่งทุเรียน",
    password: "",
  });

  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("ข้อมูลที่อัปเดต:", form);
    alert("บันทึกข้อมูลสำเร็จ (mockup)");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      {/* โลโก้ด้านบน */}
      <img
        src="/Logo.png"
        alt="Logo"
        className="w-50 h-50 animate-fade-in"
      />
        
      <Card>
        <PageHeader
          title="แก้ไขข้อมูลโปรไฟล์"
          subtitle="ปรับปรุงข้อมูลการติดต่อและรหัสผ่านของคุณได้ที่นี่"
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="ชื่อ"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="สมชาย ใจดี"
            />
            <InputField
              label="เบอร์โทร"
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="099-000-0000"
            />
          </div>

          <InputField
            label="อีเมล"
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="broker@durianmail.com"
          />

          <TextArea
            label="ที่อยู่"
            rows={3}
            value={form.address}
            onChange={handleChange("address")}
            placeholder="123 หมู่บ้านผลไม้เมืองแหล่งทุเรียน"
          />

          <InputField
            label="รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)"
            type="password"
            value={form.password}
            onChange={handleChange("password")}
            placeholder="กรอกรหัสผ่านใหม่"
          />

          <div className="flex justify-start mt-6">
            <PrimaryButton title="บันทึก" className="" />
          </div>
        </form>
      </Card>
    </div>
  );
}
