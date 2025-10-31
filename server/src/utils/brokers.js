import prisma from "../config/prisma.js";

const APPROVAL_STATUS_MAP = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
};

export async function getBrokerApprovalStatus(brokerId) {
  if (!brokerId) return "pending";
  const approval = await prisma.brokerApproval.findUnique({ where: { brokerId } });
  if (approval) {
    return APPROVAL_STATUS_MAP[approval.status] || "pending";
  }
  const acceptedContract = await prisma.contract.findFirst({
    where: { brokerId, status: "accepted" },
  });
  if (acceptedContract) return "approved";
  const rejectedContract = await prisma.contract.findFirst({
    where: { brokerId, status: "rejected" },
  });
  if (rejectedContract) return "rejected";
  return "pending";
}

export async function setBrokerApprovalStatus(brokerId, status) {
  if (!brokerId) throw new Error("brokerId is required");
  if (!APPROVAL_STATUS_MAP[status]) {
    throw new Error("invalid status");
  }
  const record = await prisma.brokerApproval.upsert({
    where: { brokerId },
    update: { status },
    create: { brokerId, status },
  });
  return APPROVAL_STATUS_MAP[record.status] || "pending";
}
