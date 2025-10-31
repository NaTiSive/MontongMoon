import { request } from "./http";

export async function listTrees({ broker_id } = {}) {
  const params = new URLSearchParams();
  if (broker_id) params.append("broker_id", broker_id);
  const query = params.toString();
  const res = await request(`/trees${query ? `?${query}` : ""}`);
  return (res?.data ?? []).map((t) => ({ ...t, tree_id: t.tree_id || t.id }));
}

export async function seedTreesIfEmpty() {
  // handled on backend
  return listTrees();
}

export async function updateTreeStatus(tree_id, status) {
  const res = await request(`/trees/${tree_id}/status`, { method: "PATCH", body: { status } });
  return res?.data;
}
