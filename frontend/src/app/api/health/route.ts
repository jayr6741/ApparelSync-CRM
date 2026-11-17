import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The web application does not connect directly to PostgreSQL.
// Database health is exposed by the Express backend at /api/health.
export async function GET() {
  return NextResponse.json({ status: "ok", service: "garmentos-web" });
}
