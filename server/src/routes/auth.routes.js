// server/src/routes/auth.routes.js
import { Router } from "express";
import { z } from "zod";
import prisma from "../config/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { hashPassword, comparePassword, signToken } from "../utils/auth.js";
import { normalizeUserRecord } from "../utils/formatters.js";
import { getBrokerApprovalStatus } from "../utils/brokers.js";

const router = Router();

/* -------------------------------------------------------------------------- */
/*                                SCHEMAS                                     */
/* -------------------------------------------------------------------------- */

const LoginSchema = z.object({
  role: z.enum(["owner", "broker"]),
  email: z.string().email(),
  password: z.string().min(6),
});

const SignupBrokerSchema = z.object({
  brokerName: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().length(10),
  address: z.string().optional(),
  password: z.string().min(6),
});

const UpdateMeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().length(10).optional(),
  address: z.string().max(500).optional(),
  password: z.string().min(6).optional(),
});

/* -------------------------------------------------------------------------- */
/*                                LOGIN                                       */
/* -------------------------------------------------------------------------- */

router.post("/login", async (req, res) => {
  try {
    const { role, email, password } = LoginSchema.parse(req.body);

    if (role === "owner") {
      const owner = await prisma.owner.findUnique({ where: { email } });
      if (!owner) return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

      const valid = await comparePassword(password, owner.password);
      if (!valid) return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

      const token = signToken({ sub: owner.ownerId, role: "owner" });
      const user = normalizeUserRecord(owner, "owner");
      return res.json({ token, user });
    }

    // Broker
    const broker = await prisma.broker.findUnique({ where: { email } });
    if (!broker) return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

    const valid = await comparePassword(password, broker.password);
    if (!valid) return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

    const approvalStatus = await getBrokerApprovalStatus(broker.brokerId);
    const token = signToken({ sub: broker.brokerId, role: "broker" });
    const user = normalizeUserRecord(broker, "broker", approvalStatus);
    return res.json({ token, user });
  } catch (err) {
    console.error("POST /auth/login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
});

/* -------------------------------------------------------------------------- */
/*                              SIGNUP (BROKER)                               */
/* -------------------------------------------------------------------------- */

router.post("/signupBroker", async (req, res) => {
  try {
    const data = SignupBrokerSchema.parse(req.body);
    const dup = await prisma.broker.findUnique({ where: { email: data.email } });
    if (dup) return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });

    const created = await prisma.broker.create({
      data: {
        brokerId: `B${Date.now()}`, // สร้าง ID ชั่วคราว (เช่น B1730830000000)
        brokerName: data.brokerName,
        phone: data.phone,
        address: data.address,
        email: data.email,
        password: await hashPassword(data.password),
        registrationDate: new Date(),  
      },
    });

    const approvalStatus = await getBrokerApprovalStatus(created.brokerId);
    const token = signToken({ sub: created.brokerId, role: "broker" });
    const user = normalizeUserRecord(created, "broker", approvalStatus);
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("POST /auth/signupBroker error:", err);
    return res.status(500).json({ message: "Signup failed" });
  }
});

/* -------------------------------------------------------------------------- */
/*                              PROFILE (GET/PATCH)                           */
/* -------------------------------------------------------------------------- */

// helper
function getTokenId(user) {
  return user?.sub ?? user?.id ?? user?.userId ?? null;
}

// GET /auth/me
router.get("/me", authenticate(), async (req, res) => {
  try {
    const { role } = req.user;
    const rawId = getTokenId(req.user);

    if (!role || rawId == null) {
      return res.status(401).json({ message: "Session invalid. Please log in again." });
    }

    if (role === "owner") {
      const me = await prisma.owner.findUnique({ where: { ownerId: Number(rawId) } });
      if (!me) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      return res.json({ user: normalizeUserRecord(me, "owner") });
    }

    const me = await prisma.broker.findUnique({ where: { brokerId: String(rawId) } });
    if (!me) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    const approvalStatus = await getBrokerApprovalStatus(me.brokerId);
    return res.json({ user: normalizeUserRecord(me, "broker", approvalStatus) });
  } catch (err) {
    console.error("GET /auth/me error:", err);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// PATCH /auth/me
router.patch("/me", authenticate(), async (req, res) => {
  try {
    const parsed = UpdateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", issues: parsed.error.flatten() });
    }

    const { role } = req.user;
    const rawId = getTokenId(req.user);
    if (!role || rawId == null) {
      return res.status(401).json({ message: "Session invalid. Please log in again." });
    }

    const payload = parsed.data;
    const data = {};
    if (payload.name) data[role === "owner" ? "ownerName" : "brokerName"] = payload.name;
    if (payload.phone) data.phone = payload.phone;
    if (payload.address !== undefined) data.address = payload.address ?? null;
    if (payload.password) data.password = await hashPassword(payload.password);

    if (role === "owner") {
      const me = await prisma.owner.findUnique({ where: { ownerId: Number(rawId) } });
      if (!me) return res.status(401).json({ message: "Session out of date. Please log in again." });

      const updated = await prisma.owner.update({
        where: { ownerId: me.ownerId },
        data,
      });
      return res.json({ user: normalizeUserRecord(updated, "owner") });
    } else {
      const me = await prisma.broker.findUnique({ where: { brokerId: String(rawId) } });
      if (!me) return res.status(401).json({ message: "Session out of date. Please log in again." });

      // updateMany fallback กันกรณี schema mismatch
      const result = await prisma.broker.updateMany({
        where: { brokerId: me.brokerId },
        data,
      });

      if (result.count === 0) {
        return res.status(404).json({ message: "Broker not found" });
      }

      const updated = await prisma.broker.findUnique({ where: { brokerId: me.brokerId } });
      const approvalStatus = await getBrokerApprovalStatus(updated.brokerId);
      return res.json({ user: normalizeUserRecord(updated, "broker", approvalStatus) });
    }
  } catch (err) {
    console.error("PATCH /auth/me error:", err);
    if (err?.code === "P2002") {
      return res.status(409).json({ message: "Password already used by another account." });
    }
    return res.status(500).json({ message: "Failed to update profile" });
  }
});

/* -------------------------------------------------------------------------- */
/*                                EXPORT DEFAULT                              */
/* -------------------------------------------------------------------------- */
export default router;
