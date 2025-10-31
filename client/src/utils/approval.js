export function normalizeApprovalStatus(status) {
  if (status == null) return "";
  return String(status)
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isApprovedStatus(status) {
  const normalized = normalizeApprovalStatus(status);
  if (!normalized) return false;
  const whitelist = ["approved", "อนุมัติ", "อนุมัติแล้ว", "ยอมรับ"];
  if (whitelist.includes(normalized)) return true;
  if (normalized.includes("อนุมัติ")) return true;
  if (normalized.includes("approve")) return true;
  if (normalized.includes("accept")) return true;
  return false;
}
