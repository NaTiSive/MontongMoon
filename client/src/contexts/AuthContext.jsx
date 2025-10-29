import React, { createContext, useContext, useEffect, useState } from "react";
import { getBrokerApproval } from "../api/contracts";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ รอโหลดข้อมูลก่อน

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email) setUser(parsed);
      }
    } catch (err) {
      console.error("Error reading user:", err);
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ login & save user
  const login = async (userObj) => {
    setUser(userObj);
    localStorage.setItem("user", JSON.stringify(userObj));
  };

  // ✅ update user profile
// src/contexts/AuthContext.jsx (เฉพาะส่วนฟังก์ชัน updateUser)
const updateUser = (newData) => {
  setUser((prev) => {
    if (!prev) return prev;
    const updated = { ...prev, ...newData };

    // ✅ เขียนกลับ localStorage user ปัจจุบัน
    localStorage.setItem("mm:user@v1", JSON.stringify(updated));

    // ✅ ถ้าเป็น broker → อัปเดตใน mm:brokers@v1 ด้วย
    if (updated.role === "broker" && updated.broker_id != null) {
      try {
        const arr = JSON.parse(localStorage.getItem("mm:brokers@v1") || "[]");
        const i = arr.findIndex((b) => b.broker_id === updated.broker_id);
        if (i !== -1) {
          arr[i] = { ...arr[i], ...newData };
          localStorage.setItem("mm:brokers@v1", JSON.stringify(arr));
        }
      } catch (e) {
        console.warn("updateUser broker save failed:", e);
      }
    }

    return updated;
  });
};


  // ✅ auto-sync broker approvalStatus (เมื่อโฟกัสหน้าต่าง หรือเป็นระยะ)
  useEffect(() => {
    if (user?.role !== "broker" || user?.broker_id == null) return;
    const sync = () => {
      try {
        const latest = getBrokerApproval(user.broker_id);
        if (latest && latest !== user.approvalStatus) {
          updateUser({ approvalStatus: latest });
        }
      } catch {}
    };
    // sync เมื่อกลับมาโฟกัส + interval สั้น ๆ
    window.addEventListener("focus", sync);
    const t = setInterval(sync, 2000);
    sync(); // เรียกทันทีรอบหนึ่ง
    return () => {
      window.removeEventListener("focus", sync);
      clearInterval(t);
    };
  }, [user?.role, user?.broker_id, user?.approvalStatus]);

  // ✅ update approval status (owner→broker)
  const updateApproval = (status) => {
    setUser((prev) => {
      const updated = { ...prev, approvalStatus: status };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  // ✅ logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthCtx.Provider
      value={{ user, loading, login, logout, updateUser, updateApproval }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
