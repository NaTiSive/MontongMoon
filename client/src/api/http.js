const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:4000/api";
const AUTH_KEY = "mm:auth@v1";

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse auth storage", err);
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function setStoredAuth(auth) {
  if (!auth) {
    localStorage.removeItem(AUTH_KEY);
    return;
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export async function request(path, { method = "GET", body, headers = {}, rawBody } = {}) {
  const auth = getStoredAuth();
  const finalHeaders = { ...headers };

  if (!rawBody && body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth?.token) {
    finalHeaders.Authorization = `Bearer ${auth.token}`;
  }

  const response = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    method,
    headers: finalHeaders,
    body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse response", err, text);
      throw new Error("ไม่สามารถอ่านข้อมูลจากเซิร์ฟเวอร์ได้");
    }
  }

  if (!response.ok) {
    const message = data?.message || `คำขอไม่สำเร็จ (${response.status})`;
    const error = new Error(message);
    error.details = data?.details;
    error.status = response.status;
    throw error;
  }

  return data;
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export const apiBaseUrl = API_BASE;
