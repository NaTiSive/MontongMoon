import React from "react";
import Header from "./Header";
import { useAuth } from "../contexts/AuthContext";

export default function HeaderWrapper({ title, subtitle }) {
  const { user } = useAuth();
  const roleLabel =
    user?.role === "owner"
      ? "เจ้าของสวน"
      : user?.role === "broker"
      ? "ผู้รับเหมา"
      : "ผู้ใช้ทั่วไป";

  return (
    <Header
      title={title}
      subtitle={subtitle}
      name={user?.name || "ไม่ระบุชื่อ"}
      role={roleLabel}
    />
  );
}
