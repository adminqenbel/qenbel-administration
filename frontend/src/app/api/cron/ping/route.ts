import { NextRequest, NextResponse } from "next/server";

// Self-ping cron for Render free tier — keeps both services alive.
// Triggered by Render Cron Job or external UptimeRobot.
// Pings: QenBel Admin /api/health + MyHarur /healthz
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  
  // Validate secret to prevent abuse
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const targets = [
    process.env.QENBEL_ADMIN_URL
      ? `${process.env.QENBEL_ADMIN_URL}/api/health`
      : null,
    process.env.MYHARUR_URL
      ? `${process.env.MYHARUR_URL}/healthz`
      : null,
  ].filter(Boolean) as string[];

  const results = await Promise.allSettled(
    targets.map((url) =>
      fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "QenBel-KeepAlive/1.0" },
      })
        .then((r) => ({ url, status: r.status, ok: r.ok }))
        .catch((e) => ({ url, error: String(e), ok: false }))
    )
  );

  const pings = results.map((r) => (r.status === "fulfilled" ? r.value : { error: "rejected" }));
  const allOk = pings.every((p) => (p as { ok?: boolean }).ok);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    pings,
    allOk,
  });
}
