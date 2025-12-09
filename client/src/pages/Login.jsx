// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { fetchOwnerContact } from "../api/auth";
import InputField from "../components/InputField";
import PageHeader from "../components/PageHeader";
import PrimaryButton from "../components/PrimaryButton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("owner");
  const [contact, setContact] = useState(null);

  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [loadingLogin, setLoadingLogin] = useState(false);

  // redirect เมื่อ login แล้ว
  useEffect(() => {
    if (!user) return;
    if (user.role === "owner") navigate("/owner/dashboard");
    else if (user.role === "broker") navigate("/broker/dashboard");
  }, [user, navigate]);

  // โหลดข้อมูลการติดต่อเจ้าของสวน
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetchOwnerContact();
        if (!alive) return;
        setContact(res?.contact ?? null);
      } catch {
        setContact(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoadingLogin(true);
      await login({ email, password, role });
      navigate(role === "owner" ? "/owner/dashboard" : "/broker/dashboard");
    } catch (err) {
      alert(err?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      {/* โลโก้ */}
      <img src="/Logo.png" alt="Durian Farm" className="rounded-lg w-40 h-40 mb-4" />

      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <PageHeader
          title="เข้าสู่ระบบ"
          subtitle="กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบจัดการสวนทุเรียน"
        />

        {/* เลือกบทบาท */}
        <div className="flex justify-center mb-4 gap-2">
          <button
            onClick={() => setRole("owner")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              role === "owner" ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            เจ้าของสวน
          </button>
          <button
            onClick={() => setRole("broker")}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              role === "broker" ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700"
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
            <p className="text-sm text-gray-600">ผู้รับเหมาหน้าใหม่จำเป็นต้องลงทะเบียนเพื่อใช้งานระบบ</p>
            <span
              onClick={() => navigate("/signup")}
              className="text-green-700 hover:underline cursor-pointer font-medium text-sm mt-1 inline-block"
            >
              ลงทะเบียนผู้รับเหมาใหม่
            </span>
          </div>
        )}

        {/* ───────── ข้อมูลการติดต่อเจ้าของสวน ───────── */}
        <div className="mt-6 border-t pt-4">
          <p className="text-sm text-gray-500 mb-2">ข้อมูลการติดต่อเจ้าของสวน</p>
          {contact ? (
            <div className="text-sm leading-6 text-gray-700 space-y-1">
              <div>ชื่อ: {contact.name || "-"}</div>
              <div>เบอร์โทร: {contact.phone || "-"}</div>
              <div>ที่อยู่: {contact.address || "-"}</div>
              <div>อีเมล: {contact.email || "-"}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">กำลังโหลด...</div>
          )}
        </div>
      </div>
    </div>
  );
}
