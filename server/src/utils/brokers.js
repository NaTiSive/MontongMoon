import prisma from "../config/prisma.js";

const ACCEPTED_STATUS = "ยอมรับ";
const REJECTED_STATUS = "ปฏิเสธ";

function parseOwnerId(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function mapThaiStatusToApproval(status) {
  if (!status) return "pending";
  if (status === ACCEPTED_STATUS) return "approved";
  if (status === REJECTED_STATUS) return "rejected";
  return "pending";
}

export async function getBrokerApprovalStatus(brokerId) {
  if (!brokerId) return "pending";

  try {
    const [accepted] = await prisma.$queryRaw`
      SELECT contract_id
      FROM contract
      WHERE broker_id = ${brokerId} AND status = ${ACCEPTED_STATUS}
      LIMIT 1
    `;
    if (accepted) {
      return "approved";
    }

    const [latest] = await prisma.$queryRaw`
      SELECT status
      FROM contract
      WHERE broker_id = ${brokerId}
      ORDER BY contract_date DESC
      LIMIT 1
    `;
    return mapThaiStatusToApproval(latest?.status);
  } catch (error) {
    const message = error?.message ?? "";
    if (error?.code === "P2021" || message.includes("broker_approval")) {
      return "pending";
    }
    throw error;
  }
}

export async function getActiveOwnerIdForBroker(brokerId) {
  if (!brokerId) return null;

  const [accepted] = await prisma.$queryRaw`
    SELECT owner_id
    FROM contract
    WHERE broker_id = ${brokerId} AND status = ${ACCEPTED_STATUS}
    ORDER BY contract_date DESC
    LIMIT 1
  `;
  if (accepted?.owner_id !== undefined && accepted?.owner_id !== null) {
    return parseOwnerId(accepted.owner_id);
  }

  const tree = await prisma.durianTree.findFirst({
    where: { brokerId },
    select: { ownerId: true },
    orderBy: { treeId: "asc" },
  });
  if (tree?.ownerId !== undefined && tree?.ownerId !== null) {
    return parseOwnerId(tree.ownerId);
  }

  const fruit = await prisma.durianFruit.findFirst({
    where: { brokerId },
    select: { ownerId: true },
    orderBy: { date: "desc" },
  });
  if (fruit?.ownerId !== undefined && fruit?.ownerId !== null) {
    return parseOwnerId(fruit.ownerId);
  }

  return null;
}

export async function resolveOwnerIdForRequest(user, ownerIdParam = null) {
  const requested = parseOwnerId(ownerIdParam);
  if (requested !== null) {
    return requested;
  }

  if (user?.role === "owner") {
    return parseOwnerId(user.id);
  }

  if (user?.role === "broker") {
    return getActiveOwnerIdForBroker(user.id);
  }

  return null;
}
