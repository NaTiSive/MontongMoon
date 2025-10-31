import React, { createContext, useContext, useEffect, useState } from "react";
import { getBrokerApproval } from "../api/contracts";
import { fetchCurrentUser, login as apiLogin, logout as apiLogout } from "../api/auth";
import { getStoredAuth, setStoredAuth } from "../api/http";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ รอโหลดข้อมูลก่อน

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const current = await fetchCurrentUser();
        if (!alive) return;
        setUser(current);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ login & save user/token
  const login = async (credentials) => {
    const data = await apiLogin(credentials);
    setUser(data.user);
    return data.user;
  };

  // ✅ update user profile
  const updateUser = (newData) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...newData };
      const auth = getStoredAuth();
      if (auth) {
        setStoredAuth({ ...auth, user: updated });
      }
      return updated;
    });
  };


  // ✅ auto-sync broker approvalStatus (เมื่อโฟกัสหน้าต่าง หรือเป็นระยะ)
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
      const auth = getStoredAuth();
      if (auth) {
        setStoredAuth({ ...auth, user: updated });
      }
      return updated;
    });
  };

  // ✅ logout
  const logout = () => {
    setUser(null);
    apiLogout();
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
