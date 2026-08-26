// Re-exports for server components and route handlers only.
// For client components, import from "@/lib/supabase.client"
export { createServerSupabaseClient, createServiceSupabaseClient } from "./supabase.server";
