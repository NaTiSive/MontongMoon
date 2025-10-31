// server/src/modules/auth/auth.routes.js
import { Router } from "express";
import {
  registerBroker,
  loginOwner,
  loginBroker,
} from "./auth.controller.js";

const router = Router();

// สมัคร broker
router.post("/register-broker", registerBroker);

// ล็อกอิน owner
router.post("/login-owner", loginOwner);

// ล็อกอิน broker
router.post("/login-broker", loginBroker);

export default router;
