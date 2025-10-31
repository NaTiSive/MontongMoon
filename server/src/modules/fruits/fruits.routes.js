import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  res.json({ module: "fruits", message: "Fruits routes ready" });
});

export default router;