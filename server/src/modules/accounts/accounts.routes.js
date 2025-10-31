import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  res.json({ module: "accounts", message: "Accountsr routes ready" });
});

export default router;
