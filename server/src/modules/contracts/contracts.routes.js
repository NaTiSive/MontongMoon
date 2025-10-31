// server/src/modules/contracts/contracts.routes.js
import { Router } from "express";
import {
  listContracts,
  createContract,
  approveContract,
  rejectContract,
} from "./contracts.controller.js";
import { verifyToken, requireOwner, requireBroker } from "../auth/auth.middleware.js";

const router = Router();

// Owner: เห็นทั้งหมด / Broker: ใช้ query ?brokerId= ของตัวเอง
router.get("/", verifyToken, listContracts);

// Broker: ส่งข้อเสนอใหม่
router.post("/", verifyToken, requireBroker, createContract);

// Owner: อนุมัติข้อเสนอ
router.post("/:id/approve", verifyToken, requireOwner, approveContract);

// Owner: ปฏิเสธข้อเสนอ
router.post("/:id/reject", verifyToken, requireOwner, rejectContract);

export default router;
