"use client";
import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_QENBEL_SUPABASE_URL || "https://dtkclyrypucngoenwncj.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_QENBEL_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0a2NseXJ5cHVjbmdvZW53bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzYxMzUsImV4cCI6MjEwMzI1MjEzNX0.nqmOnFb_J-4Eqpj-tzXSVqsOCHQmZcdpOF8W9Bzgn7I";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

