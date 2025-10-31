// server/src/modules/users/users.routes.js
import { Router } from "express";
import {
  getMyProfile,
  updateProfile,
  updatePassword,
  // ❌ ลบ updateProfilePicture ออก
} from "./users.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";

const router = Router();

// ✅ ดึงข้อมูลโปรไฟล์ของตัวเอง (owner/broker)
router.get("/me", verifyToken, getMyProfile);

// ✅ แก้ชื่อ/อีเมล/โทรศัพท์
router.patch("/me", verifyToken, updateProfile);

// ✅ เปลี่ยนรหัสผ่าน
router.patch("/me/password", verifyToken, updatePassword);

// ❌ ลบ route รูปโปรไฟล์ออก
// router.patch("/me/profile-picture", verifyToken, updateProfilePicture);

export default router;
