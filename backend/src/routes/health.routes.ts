import { Router } from "express";
import { pool } from "../db/pool";

export const healthRouter = Router();

healthRouter.get("/", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({
      status: "ok",
      service: "garmentos-api",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    response.status(503).json({
      status: "error",
      service: "garmentos-api",
      database: "unavailable",
    });
  }
});
