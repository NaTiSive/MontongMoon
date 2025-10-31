// server/src/modules/auth/auth.middleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// ✅ ตรวจ JWT ว่าถูกต้องไหม
export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
}

// ✅ Owner เท่านั้น
export function requireOwner(req, res, next) {
  if (req.user?.role !== "owner") {
    return res.status(403).json({ error: "Only Owner allowed" });
  }
  next();
}

// ✅ Broker เท่านั้น
export function requireBroker(req, res, next) {
  if (req.user?.role !== "broker") {
    return res.status(403).json({ error: "Only Broker allowed" });
  }
  next();
}
