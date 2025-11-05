import { request, setStoredAuth, clearStoredAuth, getStoredAuth } from "./http";

export async function login({ email, password, role }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: { email, password, role },
  });
  setStoredAuth({ token: data.token, user: data.user });
  return data;
}

export async function signupBroker(payload) {
  return request("/auth/signup", { method: "POST", body: payload });
}

export async function fetchCurrentUser() {
  const auth = getStoredAuth();
  if (!auth?.token) return null;
  try {
    const data = await request("/auth/me");
    setStoredAuth({ token: auth.token, user: data.user });
    return data.user;
  } catch (err) {
    console.warn("fetchCurrentUser failed", err);
    clearStoredAuth();
    return null;
  }
}

export function logout() {
  clearStoredAuth();
}

export async function updateProfile(payload) {
  // payload: { name?, phone?, address?, email?, password? }
  const data = await request("/auth/me", { method: "PATCH", body: payload });

  const auth = getStoredAuth();
  // อัปเดตข้อมูล user ใน localStorage หลังแก้ไขสำเร็จ
  setStoredAuth({ token: auth?.token ?? null, user: data.user });

  return data.user;
}
