// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { getBrokerApproval } from "../api/contracts";
import {
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
} from "../api/auth";
import {
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
} from "../api/http";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🧠 โหลด token จาก localStorage ตอนเริ่มต้น
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const auth = getStoredAuth();
        if (auth?.user) {
          setUser(auth.user);
        } else {
          const current = await fetchCurrentUser();
          if (!alive) return;
          if (current) {
            setUser(current);
            setStoredAuth({ user: current });
          }
        }
      } catch {
        // ถ้า token หมดอายุ ล้างทิ้ง
        clearStoredAuth();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ login: บันทึก token + user ลง localStorage
  const login = async (credentials) => {
    const data = await apiLogin(credentials);
    if (data?.token && data?.user) {
      setStoredAuth({ user: data.user, token: data.token });
      setUser(data.user);
    }
    return data?.user;
  };

  // ✅ logout: ล้างทุกอย่าง
  const logout = () => {
    setUser(null);
    clearStoredAuth();
    apiLogout();
  };

  // ✅ update user profile (เช่น เปลี่ยนชื่อ/รูป)
  const updateUser = (newData) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...newData };
      const auth = getStoredAuth();
      if (auth) setStoredAuth({ ...auth, user: updated });
      return updated;
    });
  };

  // ✅ auto-sync broker approvalStatus
  useEffect(() => {
    if (user?.role !== "broker" || user?.broker_id == null) return;
    const sync = () => {
      (async () => {
        try {
          const latest = await getBrokerApproval(user.broker_id);
          if (latest && latest !== user.approvalStatus) {
            updateUser({ approvalStatus: latest });
          }
        } catch {}
      })();
    };
    window.addEventListener("focus", sync);
    const t = setInterval(sync, 2000);
    sync();
    return () => {
      window.removeEventListener("focus", sync);
      clearInterval(t);
    };
  }, [user?.role, user?.broker_id, user?.approvalStatus]);

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
      }}
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
