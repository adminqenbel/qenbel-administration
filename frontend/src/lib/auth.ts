import { createServerSupabaseClient, createServiceSupabaseClient } from "./supabase.server";
import { redirect } from "next/navigation";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  globalRoles: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
};

export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  // Read admin role from qenbel_users table using service client
  const adminClient = createServiceSupabaseClient();
  const { data: qenbelUser, error: dbError } = await adminClient
    .from("qenbel_users")
    .select("id, email, full_name, global_roles, status")
    .eq("id", user.id)
    .maybeSingle();

  if (dbError || !qenbelUser) {
    redirect("/login?error=not_found");
  }

  if (qenbelUser.status !== "active") {
    redirect("/login?error=unauthorized");
  }

  const roles: string[] = qenbelUser.global_roles ?? [];
  const isAdmin = roles.includes("admin");
  const isSuperAdmin = roles.includes("superadmin");

  if (!isAdmin && !isSuperAdmin) {
    redirect("/login?error=unauthorized");
  }

  return {
    id: qenbelUser.id,
    email: qenbelUser.email,
    fullName: qenbelUser.full_name ?? "",
    globalRoles: roles,
    isSuperAdmin,
    isAdmin: true,
  };
}

export async function getAdminUser(): Promise<AdminUser | null> {
  try { 
    return await requireAdmin(); 
  } catch { 
    return null; 
  }
}
