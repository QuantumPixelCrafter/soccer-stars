import type { Request, Response, NextFunction } from "express";
import db from "../db/database.js";

export interface AuthRequest extends Request {
  userId?: number;
  username?: string;
}

/**
 * requireAuth middleware
 *
 * Reads the Bearer token from Authorization header, validates it against
 * the sessions table (also checks expiry), and attaches userId + username
 * to the request.
 */
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Token is empty" });
    return;
  }

  const row = db
    .prepare(
      `SELECT s.user_id, u.username
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?
         AND s.expires_at > datetime('now')`,
    )
    .get(token) as { user_id: number; username: string } | undefined;

  if (!row) {
    res.status(401).json({ error: "Invalid or expired session token" });
    return;
  }

  req.userId   = row.user_id;
  req.username = row.username;
  next();
}
