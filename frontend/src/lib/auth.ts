import { createServerSupabaseClient } from "./supabase.server";
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

  const { data: qenbelUser } = await supabase
    .from("qenbel_users")
    .select("id, email, full_name, global_roles")
    .eq("id", user.id)
    .single();

  if (!qenbelUser) redirect("/login?error=not_found");

  const roles: string[] = qenbelUser.global_roles ?? [];
  if (!roles.includes("admin") && !roles.includes("superadmin")) {
    redirect("/login?error=unauthorized");
  }

  return {
    id: qenbelUser.id,
    email: qenbelUser.email,
    fullName: qenbelUser.full_name ?? "",
    globalRoles: roles,
    isSuperAdmin: roles.includes("superadmin"),
    isAdmin: true,
  };
}

export async function getAdminUser(): Promise<AdminUser | null> {
  try { return await requireAdmin(); } catch { return null; }
}
