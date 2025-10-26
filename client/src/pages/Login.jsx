import React, { useState } from "react";
import InputField from "../components/InputField";
import PageHeader from "../components/PageHeader";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const owner = {
    name: "เจ้าของสวนหลัก",
    phone: "099-000-0000",
    address: "123 หมู่บ้านทุเรียน ต.ผลไม้ อ.เมือง จ.จันทบุรี",
    email: "owner@durianfarm.com",
  };

  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Login clicked:", email, password);
    // ตอนนี้แค่จำลองการเข้าสู่ระบบ
    navigate("/owner/dashboard"); // เปลี่ยนไปหน้า owner dashboard ชั่วคราว
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <img
        src="./public/Logo.png"
        alt="Durian Farm"
        className="rounded-lg  w-50 h-50"
      />
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <PageHeader
          title="เข้าสู่ระบบ"
          subtitle="กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบจัดการสวนทุเรียน"
        />

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
        <div className="p-4 bg-white rounded-lg text-gray-800 leading-relaxed text-left">
          <p>
            <span className="font-semibold">ชื่อ:</span> {owner.name}
            <br />
            <span className="font-semibold">เบอร์โทร:</span> {owner.phone}
            <br />
            <span className="font-semibold">ที่อยู่:</span> {owner.address}
            <br />
            <span className="font-semibold">อีเมล:</span> {owner.email}
          </p>
        </div>

        <p className="text-sm text-gray-600 text-center mt-4">
          ยังไม่มีบัญชีผู้รับเหมา?{" "}
          <span
            onClick={() => navigate("/signup")}
            className="text-green-600 hover:underline cursor-pointer"
          >
            ลงทะเบียน
          </span>
        </p>
      </div>
    </div>
  );
}
