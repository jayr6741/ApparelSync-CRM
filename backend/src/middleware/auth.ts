import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";
import { env } from "../config/env";

type TokenPayload = { sub: string; shopId: string; role: string; iss?: string; aud?: string };

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const payload = jwt.verify(token, env.authSecret, {
      issuer: "garmentos-api",
      audience: "garmentos-app",
    }) as TokenPayload;
    if (!payload.sub || !payload.shopId) return res.status(401).json({ error: "Invalid session token" });
    const membership = await pool.query(
      "SELECT role FROM shop_members WHERE shop_id = $1 AND user_id = $2",
      [payload.shopId, payload.sub]
    );
    if (!membership.rowCount) return res.status(403).json({ error: "Shop membership is no longer active" });
    req.auth = { userId: payload.sub, shopId: payload.shopId, role: membership.rows[0].role };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
