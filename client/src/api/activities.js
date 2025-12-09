import { request } from "./http";

export async function listActivitiesByBroker(broker_id) {
  const path = broker_id ? `/activities?broker_id=${broker_id}` : `/activities`;
  const res = await request(path);
  return res?.data ?? [];
}

export async function listActivitiesForOwner() {
  const res = await request("/activities");
  return res?.data ?? [];
}

// src/api/activities.js
export async function createActivity({ broker_id, tree_id, type, activity_type, note, date }) {
  const res = await request("/activities", {
    method: "POST",
    body: { broker_id, tree_id, type, activity_type, note, date },
  });
  return res?.data;
}

export async function listActivities() {
  const res = await request("/activities");
  return res?.data ?? [];
}

