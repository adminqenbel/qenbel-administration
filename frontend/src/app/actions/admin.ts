"use server";
import { createServiceSupabaseClient } from "@/lib/supabase.server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── 1. User Governance Actions ───────────────────────────────────────────────────────────────
export async function toggleUserStatus(userId: string, newStatus: "active" | "suspended" | "deactivated") {
  const admin = await requireAdmin();
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase
    .from("qenbel_users")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  await supabase.from("admin_audit_log").insert({
    admin_uid: admin.id,
    admin_email: admin.email,
    action: `USER_STATUS_${newStatus.toUpperCase()}`,
    target_type: "user",
    target_id: userId,
    metadata: { previousStatus: "active", newStatus },
  });

  revalidatePath("/users");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateUserRole(userId: string, newRoles: string[]) {
  const admin = await requireAdmin();
  if (!admin.isSuperAdmin) throw new Error("Only SuperAdmins can modify roles");

  const supabase = createServiceSupabaseClient();

  const { error } = await supabase
    .from("qenbel_users")
    .update({ global_roles: newRoles, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  await supabase.from("admin_audit_log").insert({
    admin_uid: admin.id,
    admin_email: admin.email,
    action: "UPDATE_USER_ROLES",
    target_type: "user",
    target_id: userId,
    metadata: { assignedRoles: newRoles },
  });

  revalidatePath("/users");
  return { success: true };
}

// ── 2. Content & Announcements ───────────────────────────────────────────────────────────────
export async function createAnnouncement(formData: FormData) {
  const admin = await requireAdmin();
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  const applicationId = (formData.get("applicationId") as string) || null;
  const status = (formData.get("status") as string) || "published";

  if (!title || !content) throw new Error("Title and content are required");

  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.from("announcements").insert({
    title,
    content,
    application_id: applicationId === "all" ? null : applicationId,
    status,
    created_by: admin.id,
    publish_at: status === "published" ? new Date().toISOString() : null,
  });

  if (error) throw new Error(error.message);

  await supabase.from("admin_audit_log").insert({
    admin_uid: admin.id,
    admin_email: admin.email,
    action: "CREATE_ANNOUNCEMENT",
    target_type: "content",
    metadata: { title, applicationId, status },
  });

  revalidatePath("/content");
  return { success: true };
}

// ── 3. Moderation Actions ────────────────────────────────────────────────────────────────────
export async function moderateReport(
  reportId: string,
  action: "approve" | "reject",
  reason?: string
) {
  const admin = await requireAdmin();
  const supabase = createServiceSupabaseClient();

  await supabase.from("admin_audit_log").insert({
    admin_uid: admin.id,
    admin_email: admin.email,
    action: action === "approve" ? "MODERATION_APPROVE" : "MODERATION_REJECT",
    target_type: "content",
    target_id: reportId,
    metadata: { decision: action, reason: reason ?? "Admin reviewed" },
  });

  revalidatePath("/moderation");
  revalidatePath("/dashboard");
  return { success: true };
}
