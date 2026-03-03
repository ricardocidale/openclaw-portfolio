import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required. Set it to a random string of 32+ characters."
    );
  }
  return secret;
}

export interface AdminUser {
  username: string;
}

export function verifyCredentials(username: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    throw new Error(
      "ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required."
    );
  }

  // Constant-time comparison to prevent timing attacks
  if (username.length !== adminUser.length || password.length !== adminPass.length) {
    return false;
  }

  let usernameMatch = true;
  for (let i = 0; i < username.length; i++) {
    if (username.charCodeAt(i) !== adminUser.charCodeAt(i)) {
      usernameMatch = false;
    }
  }

  let passwordMatch = true;
  for (let i = 0; i < password.length; i++) {
    if (password.charCodeAt(i) !== adminPass.charCodeAt(i)) {
      passwordMatch = false;
    }
  }

  return usernameMatch && passwordMatch;
}

export function generateToken(user: AdminUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: "24h" });
}

export function verifyToken(token: string): AdminUser | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AdminUser;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  // Prefer httpOnly cookie over Authorization header
  const cookie = req.cookies.get("admin_token");
  if (cookie?.value) return cookie.value;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

export function requireAuth(req: NextRequest): AdminUser {
  const token = getTokenFromRequest(req);
  if (!token) throw new Error("No authentication token");
  const user = verifyToken(token);
  if (!user) throw new Error("Invalid or expired token");
  return user;
}
