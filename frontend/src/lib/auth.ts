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

// Root admin emails that always have superadmin access
const ROOT_ADMIN_EMAILS = [
  "admin.qenbel@gmail.com",
  "admin@qenbel.com",
  "hemaprakash@gmail.com"
];

export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  const userEmail = (user.email || "").toLowerCase().trim();
  const isRootAdmin = ROOT_ADMIN_EMAILS.includes(userEmail);

  // Use service client to avoid any RLS read blocks on qenbel_users
  const adminClient = createServiceSupabaseClient();
  
  let qenbelUser: any = null;

  try {
    const { data: byId } = await adminClient
      .from("qenbel_users")
      .select("id, email, full_name, global_roles")
      .eq("id", user.id)
      .maybeSingle();
    qenbelUser = byId;
  } catch (e) {
    console.error("Error fetching qenbel_user by ID:", e);
  }

  if (!qenbelUser && userEmail) {
    try {
      const { data: byEmail } = await adminClient
        .from("qenbel_users")
        .select("id, email, full_name, global_roles")
        .ilike("email", userEmail)
        .maybeSingle();
      qenbelUser = byEmail;
    } catch (e) {
      console.error("Error fetching qenbel_user by Email:", e);
    }
  }

  // If root admin, automatically ensure their record is active and superadmin
  if (isRootAdmin) {
    try {
      await adminClient
        .from("qenbel_users")
        .upsert({
          id: user.id,
          email: userEmail,
          full_name: user.user_metadata?.full_name || "QenBel Root Admin",
          global_roles: ["superadmin", "admin"],
          status: "active",
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
    } catch (upsertErr) {
      console.warn("Could not upsert root admin record:", upsertErr);
    }

    return {
      id: user.id,
      email: userEmail,
      fullName: user.user_metadata?.full_name || "QenBel Root Admin",
      globalRoles: ["superadmin", "admin"],
      isSuperAdmin: true,
      isAdmin: true,
    };
  }

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
