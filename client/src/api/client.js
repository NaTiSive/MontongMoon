// src/api/client.js
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function authHeaders(extra = {}) {
  const token = localStorage.getItem("mm:token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function apiGet(path) {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPatch(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDelete(path) {
  const res = await fetch(`${API}${path}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// สำหรับอัปโหลดไฟล์ใบเสร็จ (multipart)
export async function apiUpload(path, file, fields = {}) {
  const token = localStorage.getItem("mm:token");
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  if (file) form.append("file", file);

  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// src/api/client.js

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("mm:token", token);
  } else {
    localStorage.removeItem("mm:token");
  }
}

