import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { comparePassword, hashPassword, signToken } from "../utils/auth.js";
import { mapUser } from "../utils/formatters.js";

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
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== role) {
    return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: mapUser(user) });
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
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
  }

  const passwordHash = await hashPassword(password);
  const broker = await prisma.user.create({
    data: {
      name,
      phone,
      email,
      address,
      passwordHash,
      role: "broker",
      approvalStatus: "pending",
    },
  });

  res.status(201).json({
    message: "สมัครสำเร็จ",
    user: mapUser(broker),
  });
});

router.get("/me", authenticate(), (req, res) => {
  res.json({ user: mapUser(req.user) });
});

export default router;
