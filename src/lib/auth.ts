import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const IS_PROD = process.env.NODE_ENV === "production";
const DEV_JWT_SECRET = "dev-only-secret-not-for-production";

// In production a missing JWT_SECRET must never fall back to a value that is
// published in this repository — that would let anyone mint an admin session.
function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (IS_PROD) {
    console.error("[auth] JWT_SECRET is missing or shorter than 16 characters — admin login is disabled.");
    return null;
  }
  return DEV_JWT_SECRET;
}

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

export function signToken(user: AdminUser): string {
  const secret = getJwtSecret();
  if (!secret) throw new Error("Admin login is not configured (JWT_SECRET missing).");
  return jwt.sign(user, secret, { expiresIn: SESSION_MAX_AGE });
}

export function verifyToken(token: string): AdminUser | null {
  const secret = getJwtSecret();
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret);
    if (!decoded || typeof decoded !== "object") return null;
    const { id, email, name } = decoded as Record<string, unknown>;
    if (typeof id !== "string" || typeof email !== "string") return null;
    return { id, email, name: typeof name === "string" ? name : "Admin" };
  } catch {
    return null;
  }
}

export function getAdminUser(req: NextRequest): AdminUser | null {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
