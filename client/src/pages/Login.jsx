// src/pages/Login.jsx
import React, { useState } from "react";
import InputField from "../components/InputField";
import PageHeader from "../components/PageHeader";
import PrimaryButton from "../components/PrimaryButton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("owner"); // 'owner' | 'broker'
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLogin(e) {
    e.preventDefault();
    try {
      if (!email || !password) throw new Error("กรอกอีเมลและรหัสผ่านก่อน");

      const url = role === "owner" ? "/auth/login-owner" : "/auth/login-broker";
      const res = await fetch(`${API}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // อ่านข้อความ error จาก backend ให้ชัด
      if (!res.ok) {
        let msg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        try {
          const t = await res.json();
          if (t?.error) msg = t.error;
        } catch {
          const t = await res.text();
          if (t) msg = t;
        }
        throw new Error(msg);
      }

      // backend ส่ง { token, user: { id, name, email, role, approvalStatus? } }
      const data = await res.json();
      const token = data?.token;
      const u = data?.user || {};

      if (!token || !u?.id) throw new Error("รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง");

      // เก็บ token เพื่อใช้กับ API อื่น
      localStorage.setItem("mm:token", token);

      // ประกอบ user object ให้ตรงกับ AuthContext เดิม
      const user = {
        id: u.id,
        name: u.name || "",
        email: u.email || email,
        role: role, // ใช้ role ที่ผู้ใช้เลือก (owner|broker)
        phone: u.phone || "",
        address: u.address || "",
        approvalStatus:
          u.approvalStatus || (role === "broker" ? "pending" : "approved"),
      };

      // เก็บ user ลง context/localStorage
      login(user);

      // นำทางตามบทบาท
      navigate(role === "owner" ? "/owner/dashboard" : "/broker/dashboard");
    } catch (err) {
      alert(err.message || "เข้าสู่ระบบไม่สำเร็จ");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <img src="/Logo.png" alt="Durian Farm" className="rounded-lg w-40 h-40 mb-4" />
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <PageHeader
          title="เข้าสู่ระบบ"
          subtitle="กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบจัดการสวนทุเรียน"
        />
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
          <PrimaryButton title="เข้าสู่ระบบ" type="submit" className="w-full mt-4" />
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
