/**
 * auth.js — password hashing (scrypt), JWT issue/verify, role gating.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-only-change-me";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}
export function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(test, "hex"), Buffer.from(hash, "hex"));
}

export function genUserCode() { return "SW-" + Math.floor(100000 + Math.random() * 900000); }
export function genOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }
export function hashOtp(otp) { return crypto.createHash("sha256").update(otp).digest("hex"); }

export function signToken(payload, expiresIn = "12h") {
  return jwt.sign(payload, SECRET, { expiresIn });
}
export function verifyToken(token) {
  try { return jwt.verify(token, SECRET); } catch { return null; }
}

function bearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}
export function requireAuth(req, res, next) {
  const claims = verifyToken(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  req.user = claims;
  next();
}
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: "forbidden", need: roles });
    next();
  };
}
