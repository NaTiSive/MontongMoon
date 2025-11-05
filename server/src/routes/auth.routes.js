import { Router } from "express";
import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticate } from "../middleware/auth.js";

const router = Router();

/* ────────────────────────────────
   ฟังก์ชันช่วยสร้าง JWT Token
──────────────────────────────── */
function createToken(user, role) {
  const payload = { id: user.id, role };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });
}

/* ────────────────────────────────
   LOGIN
──────────────────────────────── */
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (!email || !password || !role) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
    }

    let user;
    if (role === "owner") {
      user = await prisma.owner.findUnique({ where: { email } });
      if (!user) return res.status(400).json({ message: "ไม่พบผู้ใช้" });

      if (user.password !== password) {
        return res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });
      }

      const token = jwt.sign({ id: user.ownerId, role: "owner" }, process.env.JWT_SECRET, { expiresIn: "12h" });
      return res.json({
        token,
        user: {
          role: "owner",
          owner_id: user.ownerId,
          owner_name: user.ownerName,
          phone: user.phone,
          address: user.address,
          email: user.email,
        },
      });
    }

    if (role === "broker") {
      user = await prisma.broker.findUnique({ where: { email } });
      if (!user) return res.status(400).json({ message: "ไม่พบผู้ใช้" });

      if (user.password !== password) {
        return res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });
      }

      const token = jwt.sign({ id: user.brokerId, role: "broker" }, process.env.JWT_SECRET, { expiresIn: "12h" });
      return res.json({
        token,
        user: {
          role: "broker",
          broker_id: user.brokerId,
          broker_name: user.brokerName,
          phone: user.phone,
          address: user.address,
          email: user.email,
        },
      });
    }

    return res.status(400).json({ message: "บทบาทไม่ถูกต้อง" });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
});

/* ────────────────────────────────
   SIGN UP (เฉพาะ broker)
──────────────────────────────── */
router.post("/signupBroker", async (req, res) => {
  const { brokerName, phone, address, email, password } = req.body;

  try {
    if (!brokerName || !phone || !email || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const existingOwner = await prisma.owner.findUnique({ where: { email } });
    const existingBroker = await prisma.broker.findUnique({ where: { email } });
    if (existingOwner || existingBroker) {
      return res.status(400).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const count = await prisma.broker.count();
    const nextId = `B${(count + 1).toString().padStart(3, "0")}`;

    const newBroker = await prisma.broker.create({
      data: {
        brokerId: nextId,
        brokerName,
        phone,
        address: address || "",
        email,
        password,
        registrationDate: new Date(),
      },
    });

    return res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      broker: newBroker,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
});

/* ────────────────────────────────
   GET /auth/me
──────────────────────────────── */
router.get("/me", authenticate(), async (req, res) => {
  try {
    const { role, id } = req.user;

    if (role === "owner") {
      const o = await prisma.owner.findUnique({ where: { ownerId: Number(id) } });
      if (!o) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      return res.json({
        user: {
          role: "owner",
          owner_id: o.ownerId,
          owner_name: o.ownerName,
          phone: o.phone,
          address: o.address,
          email: o.email,
        },
      });
    }

    if (role === "broker") {
      const b = await prisma.broker.findUnique({ where: { brokerId: String(id) } });
      if (!b) return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      return res.json({
        user: {
          role: "broker",
          broker_id: b.brokerId,
          broker_name: b.brokerName,
          phone: b.phone,
          address: b.address,
          email: b.email,
        },
      });
    }

    return res.status(400).json({ message: "บทบาทไม่ถูกต้อง" });
  } catch (err) {
    console.error("auth.me error:", err);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
});

/* ────────────────────────────────
   PATCH /auth/me (อัปเดตโปรไฟล์)
──────────────────────────────── */
router.patch("/me", authenticate(), async (req, res) => {
  try {
    const { role, id } = req.user;
    const { name, phone, address, email, password } = req.body;

    if (role === "owner") {
      const data = {};
      if (name) data.ownerName = name;
      if (phone) data.phone = phone;
      if (address) data.address = address;
      if (email) data.email = email;
      if (password) data.password = password;

      const updated = await prisma.owner.update({
        where: { ownerId: Number(id) },
        data,
      });

      return res.json({
        user: {
          role: "owner",
          owner_id: updated.ownerId,
          owner_name: updated.ownerName,
          phone: updated.phone,
          address: updated.address,
          email: updated.email,
        },
      });
    }

    if (role === "broker") {
      const data = {};
      if (name) data.brokerName = name;
      if (phone) data.phone = phone;
      if (address) data.address = address;
      if (email) data.email = email;
      if (password) data.password = password;

      const updated = await prisma.broker.update({
        where: { brokerId: String(id) },
        data,
      });

      return res.json({
        user: {
          role: "broker",
          broker_id: updated.brokerId,
          broker_name: updated.brokerName,
          phone: updated.phone,
          address: updated.address,
          email: updated.email,
        },
      });
    }

    return res.status(400).json({ message: "บทบาทไม่ถูกต้อง" });
  } catch (err) {
    console.error("auth.me PATCH error:", err);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
});

export default router;
