import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await checkDatabaseConnection();
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    return NextResponse.json(
      { status: "error", database: "unavailable" },
      { status: 503 }
    );
  }
}
