// src/api/activities.js
import { apiGet, apiPost } from "./client";

export async function listActivitiesByBroker(broker_id) {
  const rows = await apiGet(`/activities?brokerId=${broker_id}`);
  return rows.map((a) => ({
    id: a.id,
    broker_id: a.brokerId,
    tree_id: a.treeId,
    type: a.type, // "ดูแลรักษา" | "ออกดอก" | "ออกผล" | ...
    note: a.note || "",
    created_at: a.createdAt,
  }));
}

export async function createActivity({ broker_id, tree_id, type, note }) {
  const rec = await apiPost("/activities", {
    brokerId: String(broker_id),
    treeId: String(tree_id),
    type,
    note: note || "",
  });
  return {
    id: rec.id,
    broker_id,
    tree_id,
    type: rec.type,
    note: rec.note || "",
    created_at: rec.createdAt,
  };
}
