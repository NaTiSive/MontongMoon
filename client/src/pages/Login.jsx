// src/pages/Login.jsx
import React, { useState } from "react";
import InputField from "../components/InputField";
import PageHeader from "../components/PageHeader";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [role, setRole] = useState("owner"); // ✅ ปุ่มเลือกบทบาท
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const mockUsers = [
    {
      email: "owner@durianfarm.com",
      password: "123456",
      role: "owner",
      name: "เจ้าของสวนหลัก",
      approvalStatus: "approved",
    },
    {
      email: "broker@durianlink.com",
      password: "123456",
      role: "broker",
      name: "นายหน้าทุเรียน",
      approvalStatus: "pending", // หรือ "approved"
    },
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    const foundUser = mockUsers.find(
      (u) => u.email === email && u.password === password && u.role === role // ✅ match ตามบทบาทที่เลือก
    );
    if (!foundUser) {
      alert("อีเมล/รหัสผ่าน หรือบทบาทไม่ถูกต้อง");
      return;
    }
    login(foundUser);
    navigate(`/${foundUser.role}/dashboard`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <img src="/Logo.png" alt="Durian Farm" className="w-36 h-36 mb-4" />

      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <PageHeader 
          title="เข้าสู่ระบบ"
          subtitle="เข้าสู่ระบบเพื่อบริหารจัดการสวนและทีมผู้รับเหมา"
        />

        {/* ✅ ปุ่มเลือกบทบาท */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setRole("owner")}
            className={`py-2 rounded-md border ${
              role === "owner"
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-green-700 border-green-700"
            }`}
          >
            เจ้าของสวน
          </button>
          <button
            type="button"
            onClick={() => setRole("broker")}
            className={`py-2 rounded-md border ${
              role === "broker"
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-green-700 border-green-700"
            }`}
          >
            ผู้รับเหมา
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <InputField
            label="อีเมล"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputField
            label="รหัสผ่าน"
            type="password"
            placeholder="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PrimaryButton
            title="เข้าสู่ระบบ"
            type="submit"
            className="w-full mt-2"
          />
        </form>

        {/* ✅ CTA ลงทะเบียน: แสดงเมื่อเลือกบทบาท 'ผู้รับเหมา' */}
        {role === "broker" && (
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              ผู้รับเหมาหน้าใหม่จำเป็นต้องลงทะเบียนเพื่อใช้งานระบบ
            </p>
            <span
              onClick={() => navigate("/signup")}
              className="text-green-700 hover:underline cursor-pointer font-medium text-sm mt-1 inline-block"
            >
              ลงทะเบียนผู้รับเหมาใหม่
            </span>
          </div>
        )}

        {/* ข้อมูลติดต่อ (คงไว้ตามดีไซน์เดิม) */}
        <div className="mt-6 text-sm text-gray-600 space-y-1">
          <p className="font-medium">ข้อมูลการติดต่อเจ้าของสวน</p>
          <ul className="list-disc list-inside">
            <li>ชื่อ: เจ้าของสวนหลัก</li>
            <li>เบอร์โทร: 099-000-0000</li>
            <li>ที่อยู่: 123 หมู่บ้านทุเรียน ต.ผลไม้ อ.เมือง จ.จันทบุรี</li>
            <li>อีเมล: owner@durianfarm.com</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
