import { request, setStoredAuth, clearStoredAuth, getStoredAuth } from "./http";

export async function login({ email, password, role }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: { email, password, role },
  });
  setStoredAuth({ token: data.token, user: data.user });
  return data;
}

// ✅ สมัครแบบเวอร์ชันก่อนหน้า: POST /auth/signup + body { name, phone, email, address, password }
export async function signupBroker({ name, phone, email, address, password }) {
  return request("/auth/signup", {
    method: "POST",
    body: { name, phone, email, address, password },
  });
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

export async function updateProfile(payload) {
  // payload: { name?, phone?, address?, password? }
  const data = await request("/auth/me", {
    method: "PATCH",
    body: payload,
  });
  const auth = getStoredAuth();
  setStoredAuth({ token: auth?.token, user: data.user });
  return data.user;
}

export async function fetchOwnerContact() {
  // response: { contact: { name, phone, address, email } }
  return request("/auth/owner-contact");
}

export function logout() {
  clearStoredAuth();
}
