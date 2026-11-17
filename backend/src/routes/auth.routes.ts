import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool";
import { env } from "../config/env";

export const authRouter = Router();
const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  shopName: z.string().trim().min(2).max(120),
});
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) });
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "shop";
function issueToken(userId: string, shopId: string, role: string) {
  return jwt.sign({ shopId, role }, env.authSecret, { subject: userId, expiresIn: "12h", issuer: "garmentos-api", audience: "garmentos-app" });
}

authRouter.post("/register", async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid registration details", details: parsed.error.flatten() });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { fullName, email, password, shopName } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await client.query(
      "INSERT INTO app_users(email,password_hash,full_name) VALUES(lower($1),$2,$3) RETURNING id,email,full_name",
      [email, passwordHash, fullName]
    );
    const baseSlug = slugify(shopName);
    const shop = await client.query(
      "INSERT INTO shops(name,slug) VALUES($1,$2 || '-' || substr(gen_random_uuid()::text,1,8)) RETURNING id,name,slug,currency_code,timezone",
      [shopName, baseSlug]
    );
    await client.query("INSERT INTO shop_members(shop_id,user_id,role) VALUES($1,$2,'owner')", [shop.rows[0].id, user.rows[0].id]);
    await client.query("COMMIT");
    const token = issueToken(user.rows[0].id, shop.rows[0].id, "owner");
    return res.status(201).json({ token, user: user.rows[0], shop: shop.rows[0] });
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error?.code === "23505") return res.status(409).json({ error: "An account with this email already exists" });
    return next(error);
  } finally { client.release(); }
});

authRouter.post("/login", async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid login details" });
  try {
    const result = await pool.query(
      `SELECT u.id,u.email,u.full_name,u.password_hash,m.shop_id,m.role,s.name AS shop_name,s.slug
       FROM app_users u JOIN shop_members m ON m.user_id=u.id JOIN shops s ON s.id=m.shop_id
       WHERE lower(u.email)=lower($1) AND u.is_active=true ORDER BY m.created_at LIMIT 1`,
      [parsed.data.email]
    );
    if (!result.rowCount || !(await bcrypt.compare(parsed.data.password, result.rows[0].password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect" });
    }
    const row = result.rows[0];
    return res.json({ token: issueToken(row.id, row.shop_id, row.role), user: { id: row.id, email: row.email, fullName: row.full_name }, shop: { id: row.shop_id, name: row.shop_name, slug: row.slug }, role: row.role });
  } catch (error) { return next(error); }
});
