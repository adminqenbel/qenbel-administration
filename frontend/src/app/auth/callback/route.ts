import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  // Determine external origin safely behind reverse proxies (like Render)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  let origin = process.env.NEXT_PUBLIC_SITE_URL || "";

  if (!origin) {
    if (forwardedHost) {
      origin = `${forwardedProto}://${forwardedHost}`;
    } else {
      origin = requestUrl.origin;
    }
  }

  // Ensure origin is clean without trailing slash
  origin = origin.replace(/\/$/, "");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_QENBEL_SUPABASE_URL || "https://dtkclyrypucngoenwncj.supabase.co",
      process.env.NEXT_PUBLIC_QENBEL_SUPABASE_ANON_KEY || "placeholder-anon-key",
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
