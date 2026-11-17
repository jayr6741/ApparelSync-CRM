import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must contain at least 32 characters"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid backend environment: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
}
const value = parsed.data;

export const env = {
  port: value.PORT,
  nodeEnv: value.NODE_ENV,
  databaseUrl: value.DATABASE_URL,
  dbPoolMax: value.DB_POOL_MAX,
  corsOrigin: value.CORS_ORIGIN,
  authSecret: value.AUTH_SECRET,
};