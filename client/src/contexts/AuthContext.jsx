// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthToken } from "../api/client";

const LS_USER_KEY = "user";       // เก็บ user object
const LS_TOKEN_KEY = "mm:token";  // เก็บ JWT

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // โหลด user + token จาก localStorage เมื่อเริ่มแอป
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_USER_KEY);
      const token = localStorage.getItem(LS_TOKEN_KEY);

      if (token) setAuthToken(token); // ติด Authorization header ให้ client

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email) setUser(parsed);
      }
    } catch (err) {
      console.error("Error reading user:", err);
      localStorage.removeItem(LS_USER_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // login: รับ user object จากหน้า Login.jsx แล้วเซฟ
  const login = (userObj) => {
    setUser(userObj);
    localStorage.setItem(LS_USER_KEY, JSON.stringify(userObj));

    // หน้า Login.jsx เป็นคน set token ลง LS แล้ว
    const token = localStorage.getItem(LS_TOKEN_KEY);
    if (token) setAuthToken(token);
  };

  // อัปเดตข้อมูล user ในแอป + localStorage
  const updateUser = (newData) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...newData };
      localStorage.setItem(LS_USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // อัปเดตเฉพาะ approvalStatus (owner อนุมัติ/ปฏิเสธ broker)
  const updateApproval = (status) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, approvalStatus: status };
      localStorage.setItem(LS_USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem(LS_USER_KEY);
    localStorage.removeItem(LS_TOKEN_KEY);
    setAuthToken(null);
  };

  // หากเป็น broker ให้รีเฟรช approvalStatus จาก backend เป็นระยะ
  useEffect(() => {
    if (!user || user.role !== "broker") return;

    let stop = false;

    const sync = async () => {
      try {
        const api = import.meta.env.VITE_API_URL || "http://localhost:4000";
        const token = localStorage.getItem(LS_TOKEN_KEY);
        if (!token) return;

        const res = await fetch(`${api}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const payload = await res.json();
        const latest = payload?.user?.approvalStatus;

        if (!stop && latest && latest !== user.approvalStatus) {
          updateUser({ approvalStatus: latest });
        }
      } catch (e) {
        // เงียบไว้ก็ได้ ไม่ต้อง alert
      }
    };

    // sync ทันที + เมื่อโฟกัส + interval
    sync();
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    const t = setInterval(sync, 3000);

    return () => {
      stop = true;
      window.removeEventListener("focus", onFocus);
      clearInterval(t);
    };
  }, [user?.role, user?.approvalStatus]);

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
