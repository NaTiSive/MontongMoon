import prisma from "../config/prisma.js";

const ACCEPTED_STATUS = "ยอมรับ";
const REJECTED_STATUS = "ปฏิเสธ";

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
