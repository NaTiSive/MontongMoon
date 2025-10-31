// server/src/modules/users/users.routes.js
import { Router } from "express";
import {
  getMyProfile,
  updateProfile,
  updatePassword,
  updateProfilePicture,
} from "./users.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = Router();

// ✅ ดึงข้อมูลโปรไฟล์ของ user (owner/broker)
router.get("/me", verifyToken, getMyProfile);

// ✅ แก้ไขชื่อหรืออีเมล
router.patch("/me", verifyToken, updateProfile);

// ✅ เปลี่ยนรหัสผ่าน
router.patch("/me/password", verifyToken, updatePassword);


export default router;
