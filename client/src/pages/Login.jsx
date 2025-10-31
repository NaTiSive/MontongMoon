// src/pages/Login.jsx
import React, { useState } from "react";
import InputField from "../components/InputField";
import PageHeader from "../components/PageHeader";
import PrimaryButton from "../components/PrimaryButton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("owner");
  const navigate = useNavigate();
  const { login, user } = useAuth();

  if (user) {
    if (user.role === "owner") navigate("/owner/dashboard");
    else if (user.role === "broker") navigate("/broker/dashboard");
  }

  const [loadingLogin, setLoadingLogin] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoadingLogin(true);
      await login({ email, password, role });
      navigate(role === "owner" ? "/owner/dashboard" : "/broker/dashboard");
    } catch (err) {
      const message = err?.message || "เข้าสู่ระบบไม่สำเร็จ";
      alert(message);
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      {/* ✅ โลโก้ของคุณยังอยู่เหมือนเดิม */}
      <img src="/Logo.png" alt="Durian Farm" className="rounded-lg w-40 h-40 mb-4" />

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
            title={loadingLogin ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            type="submit"
            className="w-full mt-4"
            disabled={loadingLogin}
          />
        </form>

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
