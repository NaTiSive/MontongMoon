import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  res.json({ module: "problems", message: "Problems routes ready" });
});

export default router;
