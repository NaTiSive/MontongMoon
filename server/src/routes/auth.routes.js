import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { comparePassword, hashPassword, signToken } from "../utils/auth.js";
import { normalizeUserRecord } from "../utils/formatters.js";
import { getBrokerApprovalStatus, setBrokerApprovalStatus } from "../utils/brokers.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["owner", "broker"]),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const { email, password, role } = parsed.data;
  const user =
    role === "owner"
      ? await prisma.owner.findUnique({ where: { email } })
      : await prisma.broker.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  }

  const ok = await comparePassword(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  }

  let approvalStatus = "approved";
  if (role === "broker") {
    approvalStatus = await getBrokerApprovalStatus(user.brokerId);
  }

  const token = signToken({
    sub: role === "owner" ? String(user.ownerId) : user.brokerId,
    role,
  });

  res.json({ token, user: normalizeUserRecord(user, role, approvalStatus) });
});

const signupSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  password: z.string().min(6),
});

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() });
  }

  const { name, phone, email, address, password } = parsed.data;
  const existing = await prisma.broker.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
  }

  const passwordHash = await hashPassword(password);
  const brokerId = await generateBrokerId();
  const broker = await prisma.broker.create({
    data: {
      brokerId,
      brokerName: name,
      phone,
      email,
      address,
      password: passwordHash,
      registrationDate: new Date(),
    },
  });
  await setBrokerApprovalStatus(broker.brokerId, "pending");

  res.status(201).json({
    message: "สมัครสำเร็จ",
    user: normalizeUserRecord(broker, "broker", "pending"),
  });
});

router.get("/me", authenticate(), async (req, res) => {
  res.json({ user: req.user });
});

async function generateBrokerId() {
  const lastBroker = await prisma.broker.findMany({
    orderBy: { brokerId: "desc" },
    take: 1,
  });
  if (!lastBroker.length) {
    return "B001";
  }
  const current = lastBroker[0].brokerId;
  const numeric = parseInt(current.replace(/^B/, ""), 10) || 0;
  const next = numeric + 1;
  return `B${next.toString().padStart(3, "0")}`;
}

export default router;
