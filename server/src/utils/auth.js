import crypto from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "montongmoon-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const PBKDF2_DIGEST = process.env.PBKDF2_DIGEST || "sha512";
const PBKDF2_ITERATIONS = parseInt(process.env.PBKDF2_ITERATIONS || "120000", 10);
const PBKDF2_KEYLEN = parseInt(process.env.PBKDF2_KEY_LENGTH || "64", 10);
const HASH_PREFIX = "pbkdf2";

function deriveKey(password, salt, iterations = PBKDF2_ITERATIONS, digest = PBKDF2_DIGEST) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, PBKDF2_KEYLEN, digest, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey.toString("hex"));
    });
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await deriveKey(password, salt);
  return `${HASH_PREFIX}$${PBKDF2_DIGEST}$${PBKDF2_ITERATIONS}$${salt}$${derived}`;
}

export async function comparePassword(password, storedHash) {
  if (!storedHash) return false;

  const parts = storedHash.split("$");
  if (parts.length !== 5 || parts[0] !== HASH_PREFIX) {
    return storedHash === password;
  }

  const [, digest, iterationsRaw, salt, expectedHash] = parts;
  const iterations = parseInt(iterationsRaw, 10);
  if (!digest || !salt || !expectedHash || Number.isNaN(iterations)) {
    return false;
  }

  try {
    const actualHash = await deriveKey(password, salt, iterations, digest);
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    const actualBuffer = Buffer.from(actualHash, "hex");
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    console.error("comparePassword error", err);
    return false;
  }
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
