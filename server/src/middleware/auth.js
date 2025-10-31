import { verifyToken } from "../utils/auth.js";
import prisma from "../config/prisma.js";

export function authenticate(required = true) {
  return async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      if (required) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      req.user = null;
      return next();
    }

    try {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) {
        if (required) return res.status(401).json({ message: "Unauthorized" });
        req.user = null;
        return next();
      }
      req.user = user;
      req.tokenPayload = decoded;
      return next();
    } catch (err) {
      console.error("JWT verify error", err);
      if (required) return res.status(401).json({ message: "Unauthorized" });
      req.user = null;
      return next();
    }
  };
}

export function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
