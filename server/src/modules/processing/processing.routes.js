import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  res.json({ module: "processing", message: "Processing routes ready" });
});

export default router;
