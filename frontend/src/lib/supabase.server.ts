import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_QENBEL_SUPABASE_URL || "https://dtkclyrypucngoenwncj.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_QENBEL_SUPABASE_ANON_KEY || "placeholder-anon-key";
const SUPABASE_SERVICE_KEY = process.env.QENBEL_SUPABASE_SERVICE_ROLE_KEY || "";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server component read-only cookie access ignore
        }
      },
    },
  });
}

export function createServiceSupabaseClient() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
