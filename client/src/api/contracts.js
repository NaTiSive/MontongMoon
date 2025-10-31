import { request } from "./http";

export async function getOwnerDeadline() {
  return request("/contracts/deadline");
}

export async function setOwnerDeadline(newISO) {
  return request("/contracts/deadline", { method: "PUT", body: { deadline: newISO } });
}

export async function getBrokerSubmissionContext({ broker_id }) {
  return request(`/contracts/submission-context?broker_id=${broker_id ?? ""}`);
}

export async function createContract({ broker_id, qtt_estimate, offerprice_by_grade, payment_term, note }) {
  const res = await request("/contracts", {
    method: "POST",
    body: { broker_id, qtt_estimate, offerprice_by_grade, payment_term, note },
  });
  return res?.data;
}

export async function listAllContracts() {
  const res = await request("/contracts");
  return res?.data ?? [];
}

export async function listBrokerContracts(broker_id) {
  const res = await request(`/contracts?broker_id=${broker_id ?? ""}`);
  return res?.data ?? [];
}

export async function approveContract(contract_id) {
  const res = await request(`/contracts/${contract_id}/approve`, { method: "POST" });
  return res?.data;
}

export async function rejectContract(contract_id) {
  const res = await request(`/contracts/${contract_id}/reject`, { method: "POST" });
  return res?.data;
}

export async function hasActiveOfferForCycle() {
  const res = await request("/contracts/has-active-offer");
  return res?.hasActive ?? false;
}

export async function getBrokerApproval(broker_id) {
  const res = await request(`/contracts/approvals/${broker_id}`);
  return res?.approvalStatus ?? "pending";
}

export const getBrokerApprovalStatus = getBrokerApproval;
