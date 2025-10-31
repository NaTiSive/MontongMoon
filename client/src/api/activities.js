import { request } from "./http";

export async function listActivitiesByBroker(broker_id) {
  const res = await request(`/activities?broker_id=${broker_id ?? ""}`);
  return res?.data ?? [];
}

export async function listActivitiesForOwner() {
  const res = await request("/activities");
  return res?.data ?? [];
}

export async function createActivity({ broker_id, tree_id, type, note }) {
  const res = await request("/activities", {
    method: "POST",
    body: { broker_id, tree_id, type, note },
  });
  return res?.data;
}
