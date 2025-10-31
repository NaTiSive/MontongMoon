import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  res.json({ module: "activities", message: "Activities routes ready" });
});

export default router;
