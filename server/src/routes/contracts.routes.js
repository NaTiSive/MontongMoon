// server/src/routes/contracts.routes.js
import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

/**
 * ดึงรายการสัญญาทั้งหมด
 */
router.get("/", async (_req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT contract_id, broker_id, owner_id, status, contract_date,
             qtt_estimate, offerprice, payment_term, note
        FROM contract
      ORDER BY contract_date DESC
    `);
    res.json({ data: rows });
  } catch (err) {
    console.error("❌ GET /contracts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ยอมรับสัญญา
 * - แก้สถานะของ owner นั้น ๆ ให้เหลือ "ยอมรับ" ได้แค่ 1 ฉบับ
 * - แก้สถานะสัญญาอื่นกลับไป "รอการพิจารณา"
 */
router.post("/:id/approve", async (req, res) => {
  const id = req.params.id;

  try {
    // ดึงข้อมูลสัญญาที่จะอนุมัติ
    const [c] = await prisma.$queryRawUnsafe(
      `SELECT contract_id, owner_id, broker_id, status
         FROM contract
        WHERE contract_id = ?`,
      id
    );

    if (!c) {
      return res.status(404).json({ message: "ไม่พบสัญญานี้" });
    }

    const ownerId = Number(c.owner_id); // ✅ convert ให้แน่ใจว่าเป็นตัวเลข
    const brokerId = c.broker_id;

    await prisma.$transaction(async (tx) => {
      // reset สัญญาทั้งหมดของ owner นี้ให้ "รอการพิจารณา"
      await tx.$executeRawUnsafe(
        `UPDATE contract
            SET status = 'รอการพิจารณา'
          WHERE owner_id = ?`,
        ownerId
      );

      // set สัญญาที่เลือกเป็น "ยอมรับ"
      await tx.$executeRawUnsafe(
        `UPDATE contract
            SET status = 'ยอมรับ'
          WHERE contract_id = ?`,
        id
      );

      // update broker_id ใน durian_tree และ durian_fruit
      await tx.$executeRawUnsafe(
        `UPDATE durian_tree
            SET broker_id = ?
          WHERE owner_id = ?`,
        brokerId,
        ownerId
      );
      await tx.$executeRawUnsafe(
        `UPDATE durian_fruit
            SET broker_id = ?
          WHERE owner_id = ?`,
        brokerId,
        ownerId
      );
    });

    res.json({ message: "อนุมัติสัญญาสำเร็จ" });
  } catch (err) {
    console.error("❌ approve contract error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ปฏิเสธข้อเสนอ
 */
router.post("/:id/reject", async (req, res) => {
  const id = req.params.id;
  try {
    const affected = await prisma.$executeRawUnsafe(
      `UPDATE contract SET status = 'ปฏิเสธ' WHERE contract_id = ?`,
      id
    );
    if (affected === 0) {
      return res.status(404).json({ message: "ไม่พบสัญญา" });
    }
    res.json({ message: "ปฏิเสธข้อเสนอเรียบร้อย" });
  } catch (err) {
    console.error("❌ reject contract error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
