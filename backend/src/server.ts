import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { healthRouter } from "./routes/health.routes";

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.corsOrigin.split(",").map((item) => item.trim()) }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_request, response) => {
  response.json({ name: "GARMENTOS API", version: "0.1.0" });
});

app.use("/api/health", healthRouter);

const server = app.listen(env.port, () => {
  console.log(`GARMENTOS API listening on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
