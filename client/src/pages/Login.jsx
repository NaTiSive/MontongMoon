// src/pages/Login.jsx
import React, { useState } from "react";
import InputField from "../components/InputField";
import PageHeader from "../components/PageHeader";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../contexts/AuthContext";
// ❌ ลบ import ที่ไม่มีจริงออก
// import { getBrokerApproval } from "../api/contracts";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("owner");
  const navigate = useNavigate();
  const { login, user } = useAuth();

  // Redirect ถ้า login อยู่แล้ว
  if (user) {
    if (user.role === "owner") navigate("/owner/dashboard");
    else if (user.role === "broker") navigate("/broker/dashboard");
  }

  // Mock Users
  const mockUsers = [
    {
      email: "owner@durianfarm.com",
      password: "123456",
      role: "owner",
      name: "เจ้าของสวนหลัก",
      phone: "099-000-0000",
      address: "123 หมู่บ้านทุเรียน ต.ผลไม้ อ.เมือง จ.จันทบุรี",
    },
    {
      email: "broker@durianlink.com",
      password: "123456",
      role: "broker",
      name: "นายหน้าทุเรียน",
      phone: "088-111-2222",
      address: "45/6 ต.ทุเรียนทอง อ.บ้านสวน จ.ระยอง",
      approvalStatus: "approved",
      broker_id: 2,
    },
    {
      email: "pending@durianlink.com",
      password: "123456",
      role: "broker",
      name: "นายหน้ารออนุมัติ",
      phone: "099-555-5555",
      address: "44 หมู่ 3 อ.ทุ่งผลไม้ จ.จันทบุรี",
      approvalStatus: "pending",
      broker_id: 3,
    },
  ];

  // helper: อ่านสถานะล่าสุดของ broker จาก LocalStorage (ถ้ามี)
  const getBrokerApprovalFromLS = (broker_id, fallback = "pending") => {
    try {
      const arr = JSON.parse(localStorage.getItem("mm:brokers@v1") || "[]");
      const found = arr.find((b) => b.broker_id === broker_id);
      return found?.approvalStatus || fallback;
    } catch {
      return fallback;
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();

    const foundUser = mockUsers.find(
      (u) => u.email === email && u.password === password && u.role === role
    );

    if (!foundUser) {
      alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    // ถ้าเป็น broker → อัปเดต approvalStatus จาก LocalStorage ถ้ามี
    if (foundUser.role === "broker" && foundUser.broker_id != null) {
      const latest = getBrokerApprovalFromLS(
        foundUser.broker_id,
        foundUser.approvalStatus || "pending"
      );
      foundUser.approvalStatus = latest;
    }

    login(foundUser);

    if (foundUser.role === "owner") {
      navigate("/owner/dashboard");
    } else {
      navigate("/broker/dashboard");
    }
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
          title="เข้าสู่ระบบ"
          subtitle="กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบจัดการสวนทุเรียน"
        />

        {/* --- เลือกบทบาท --- */}
        <div className="flex justify-center mb-4 gap-2">
          <button
            onClick={() => setRole("owner")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              role === "owner"
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            เจ้าของสวน
          </button>
          <button
            onClick={() => setRole("broker")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              role === "broker"
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            ผู้รับเหมา
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <InputField
            label="อีเมล"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <InputField
            label="รหัสผ่าน"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <PrimaryButton
            title="เข้าสู่ระบบ"
            type="submit"
            className="w-full mt-4"
          />
        </form>

        {/* ลิงก์ลงทะเบียน */}
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
      </div>
    </div>
  );
}
