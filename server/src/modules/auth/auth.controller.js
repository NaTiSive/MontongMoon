// server/src/modules/auth/auth.controller.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../prisma.js";
import dotenv from "dotenv";
dotenv.config();

function generateToken(user, role) {
  return jwt.sign(
    { id: user.id, email: user.email, role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// 🟢 Login Owner
export async function loginOwner(req, res) {
  try {
    const { email, password } = req.body;
    const owner = await prisma.owner.findUnique({ where: { email } });
    if (!owner) return res.status(400).json({ error: "Owner not found" });

    const match = await bcrypt.compare(password, owner.passwordHash);
    if (!match) return res.status(400).json({ error: "Invalid password" });

    const token = generateToken(owner, "owner");
    res.json({
      token,
      user: {
        id: owner.id,
        name: owner.ownerName,
        email: owner.email,
        role: "owner",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 🟣 Register Broker
export async function registerBroker(req, res) {
  try {
    const { brokerName, email, password, phone } = req.body;
    const existing = await prisma.broker.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const broker = await prisma.broker.create({
      data: {
        brokerName,
        email,
        phone,
        passwordHash: hash,
        approvalStatus: "pending",
      },
    });

    const token = generateToken(broker, "broker");
    res.json({
      token,
      user: {
        id: broker.id,
        name: broker.brokerName,
        email: broker.email,
        role: "broker",
        approvalStatus: broker.approvalStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 🟢 Login Broker
export async function loginBroker(req, res) {
  try {
    const { email, password } = req.body;
    const broker = await prisma.broker.findUnique({ where: { email } });
    if (!broker) return res.status(400).json({ error: "Broker not found" });

    const match = await bcrypt.compare(password, broker.passwordHash);
    if (!match) return res.status(400).json({ error: "Invalid password" });

    if (broker.approvalStatus !== "approved")
      return res.status(403).json({ error: "Account not yet approved" });

    const token = generateToken(broker, "broker");
    res.json({
      token,
      user: {
        id: broker.id,
        name: broker.brokerName,
        email: broker.email,
        phone: broker.phone,
        role: "broker",
        approvalStatus: broker.approvalStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
