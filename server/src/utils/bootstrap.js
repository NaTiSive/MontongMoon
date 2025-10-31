import prisma from "../config/prisma.js";
import { hashPassword } from "./auth.js";

const DEFAULT_OWNER_EMAIL = process.env.DEFAULT_OWNER_EMAIL || "owner@durianfarm.com";
const DEFAULT_OWNER_PASSWORD = process.env.DEFAULT_OWNER_PASSWORD || "123456";

const SAMPLE_TREES = [
  { id: "T001", name: "ต้นทุเรียน 1", status: "ปกติ" },
  { id: "T002", name: "ต้นทุเรียน 2", status: "ออกดอก" },
  { id: "T003", name: "ต้นทุเรียน 3", status: "ออกผล" },
  { id: "T004", name: "ต้นทุเรียน 4", status: "ปกติ" },
];

export default async function bootstrap() {
  await ensureOwnerAccount();
  await ensureTrees();
  await ensureDeadline();
}

async function ensureOwnerAccount() {
  const existing = await prisma.user.findFirst({ where: { role: "owner" } });
  if (existing) return existing;

  const passwordHash = await hashPassword(DEFAULT_OWNER_PASSWORD);
  return prisma.user.create({
    data: {
      email: DEFAULT_OWNER_EMAIL,
      passwordHash,
      role: "owner",
      name: "เจ้าของสวนหลัก",
      phone: "099-000-0000",
      address: "123 หมู่บ้านทุเรียน ต.ผลไม้ อ.เมือง จ.จันทบุรี",
      approvalStatus: "approved",
    },
  });
}

async function ensureTrees() {
  const count = await prisma.tree.count();
  if (count > 0) return;
  await prisma.tree.createMany({ data: SAMPLE_TREES });
}

async function ensureDeadline() {
  const existing = await prisma.ownerSetting.findUnique({ where: { id: 1 } });
  if (existing) return;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  await prisma.ownerSetting.create({
    data: {
      id: 1,
      submissionDeadline: new Date(Date.now() + sevenDays),
    },
  });
}
