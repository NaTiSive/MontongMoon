import { request } from "./http";

export async function listProblems() {
  const res = await request("/problems");
  return res?.data ?? [];
}

export async function createProblem({ broker_id, tree_id, type, note_broker }) {
  const res = await request("/problems", {
    method: "POST",
    body: { broker_id, tree_id, type, note_broker },
  });
  return res?.data;
}

export async function ownerAssignNoteAndSetPending(id, note) {
  const res = await request(`/problems/${id}/assign`, { method: "PATCH", body: { note } });
  return res?.data;
}

export async function brokerConfirmFixed(id) {
  const res = await request(`/problems/${id}/resolve`, { method: "PATCH" });
  return res?.data;
}
