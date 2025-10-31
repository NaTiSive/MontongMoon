import prisma from "../config/prisma.js";

export async function getBrokerApprovalStatus(brokerId) {
  if (!brokerId) return "pending";

  const accepted = await prisma.contract.findFirst({
    where: { brokerId, status: "accepted" },
  });
  if (accepted) return "approved";

  const latest = await prisma.contract.findFirst({
    where: { brokerId },
    orderBy: { contractDate: "desc" },
  });

  if (!latest) return "pending";
  return latest.status === "rejected" ? "rejected" : "pending";
}
