import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  res.json({ module: "owner", message: "Owner routes ready" });
});

export default router;
