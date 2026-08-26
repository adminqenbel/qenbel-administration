import { NextResponse } from "next/server";

// Health check endpoint for Render keep-alive ping
// Responds to GET /api/health
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "qenbel-administration",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: 200 }
  );
}
