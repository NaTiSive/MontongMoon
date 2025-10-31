// server/src/modules/users/users.controller.js
import bcrypt from "bcrypt";
import { prisma } from "../../prisma.js";

// 🧠 ดึงโปรไฟล์จาก role
export async function getMyProfile(req, res) {
  try {
    const { role, id } = req.user;

    let user;
    if (role === "owner") {
      user = await prisma.owner.findUnique({
        where: { id },
        select: {
          id: true,
          ownerName: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else if (role === "broker") {
      user = await prisma.broker.findUnique({
        where: { id },
        select: {
          id: true,
          brokerName: true,
          email: true,
          phone: true,
          approvalStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ role, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ✏️ แก้ไขชื่อ / email / phone
export async function updateProfile(req, res) {
  try {
    const { role, id } = req.user;
    const { name, email, phone } = req.body;

    let updated;
    if (role === "owner") {
      updated = await prisma.owner.update({
        where: { id },
        data: {
          ownerName: name,
          email,
        },
      });
    } else if (role === "broker") {
      updated = await prisma.broker.update({
        where: { id },
        data: {
          brokerName: name,
          email,
          phone,
        },
      });
    }

    res.json({ message: "Profile updated successfully", updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 🔑 เปลี่ยนรหัสผ่าน
export async function updatePassword(req, res) {
  try {
    const { role, id } = req.user;
    const { oldPassword, newPassword } = req.body;

    let user;
    if (role === "owner") {
      user = await prisma.owner.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const match = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!match) return res.status(400).json({ error: "Old password incorrect" });

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.owner.update({
        where: { id },
        data: { passwordHash: newHash },
      });
    } else if (role === "broker") {
      user = await prisma.broker.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const match = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!match) return res.status(400).json({ error: "Old password incorrect" });

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.broker.update({
        where: { id },
        data: { passwordHash: newHash },
      });
    }

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


