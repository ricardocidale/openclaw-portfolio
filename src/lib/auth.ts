import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-me";

export interface AdminUser {
  username: string;
}

export function verifyCredentials(username: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "changeme123";
  return username === adminUser && password === adminPass;
}

export function generateToken(user: AdminUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): AdminUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminUser;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookie = req.cookies.get("admin_token");
  return cookie?.value || null;
}

export function requireAuth(req: NextRequest): AdminUser {
  const token = getTokenFromRequest(req);
  if (!token) throw new Error("No authentication token");
  const user = verifyToken(token);
  if (!user) throw new Error("Invalid or expired token");
  return user;
}
