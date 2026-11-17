import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "../db/pool";

async function migrate() {
  const directory = path.resolve(__dirname, "../../database/migrations");
  const files = (await fs.readdir(directory)).filter((name) => /^\d+.*\.sql$/i.test(name)).sort();
  const client = await pool.connect();
  try {
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const file of files) {
      const existing = await client.query("SELECT 1 FROM schema_migrations WHERE version=$1", [file]);
      if (existing.rowCount) {
        console.log(`Skipped already applied migration: ${file}`);
        continue;
      }
      const sql = await fs.readFile(path.join(directory, file), "utf8");
      console.log(`Applying migration: ${file}`);
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version) VALUES($1)", [file]);
      console.log(`Applied migration: ${file}`);
    }
    console.log("GARMENTOS database migrations complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("GARMENTOS migration failed:", error);
  process.exitCode = 1;
  void pool.end();
});
