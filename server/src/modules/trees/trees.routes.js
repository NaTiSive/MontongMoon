import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  res.json({ module: "trees", message: "Trees routes ready" });
});

export default router;
