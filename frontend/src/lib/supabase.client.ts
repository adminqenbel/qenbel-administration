"use client";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_QENBEL_SUPABASE_URL || "https://dtkclyrypucngoenwncj.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_QENBEL_SUPABASE_ANON_KEY || "placeholder-anon-key";

let _client: ReturnType<typeof createClient> | null = null;

export function createBrowserSupabaseClient() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}
