import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  res.json({ module: "export", message: "Export routes ready" });
});

export default router;
