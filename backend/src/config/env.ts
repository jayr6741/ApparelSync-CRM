import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL,
  dbPoolMax: Number(process.env.DB_POOL_MAX ?? 10),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required. Copy backend/.env.example to backend/.env and configure PostgreSQL.");
}
