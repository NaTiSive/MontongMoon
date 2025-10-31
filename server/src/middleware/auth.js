import { verifyToken } from "../utils/auth.js";
import prisma from "../config/prisma.js";
import { getBrokerApprovalStatus } from "../utils/brokers.js";
import { normalizeUserRecord } from "../utils/formatters.js";

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
      const role = decoded.role;
      let userRecord = null;
      if (role === "owner") {
        userRecord = await prisma.owner.findUnique({ where: { ownerId: Number(decoded.sub) || 1 } });
        if (userRecord) {
          req.user = normalizeUserRecord(userRecord, "owner", "approved");
        }
      } else if (role === "broker") {
        userRecord = await prisma.broker.findUnique({ where: { brokerId: decoded.sub } });
        if (userRecord) {
          const approvalStatus = await getBrokerApprovalStatus(userRecord.brokerId);
          req.user = normalizeUserRecord(userRecord, "broker", approvalStatus);
        }
      }

      if (!userRecord) {
        if (required) return res.status(401).json({ message: "Unauthorized" });
        req.user = null;
        return next();
      }

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
