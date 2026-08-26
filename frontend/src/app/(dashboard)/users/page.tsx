import { requireAdmin } from "@/lib/auth";
import { createServiceSupabaseClient } from "@/lib/supabase.server";
import { UserRowActions } from "@/components/users/UserRowActions";

export const revalidate = 30;

async function getUsers() {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("qenbel_users")
      .select("id, email, full_name, global_roles, status, created_at, last_login_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return [];
    return data ?? [];
  } catch { return []; }
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function UsersPage() {
  const [admin, users] = await Promise.all([requireAdmin(), getUsers()]);

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Users</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>{users.length} registered accounts across QenBel</p>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No users found</td></tr>
            ) : users.map(user => {
              const roles: string[] = user.global_roles ?? [];
              const isSuperAdmin = roles.includes("superadmin");
              const isAdmin = roles.includes("admin");
              return (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{user.full_name || "—"}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${isSuperAdmin ? "badge-purple" : isAdmin ? "badge-blue" : "badge-white"}`}>
                      {isSuperAdmin ? "SuperAdmin" : isAdmin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className={`dot ${user.status === "active" ? "dot-green" : user.status === "suspended" ? "dot-red" : "dot-amber"}`} />
                      <span style={{ fontSize: 12, textTransform: "capitalize" }}>{user.status}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{timeAgo(user.last_login_at)}</td>
                  <td style={{ fontSize: 12 }}>{new Date(user.created_at).toLocaleDateString("en-IN")}</td>
                  <td>
                    <UserRowActions user={user} isSuperAdmin={admin.isSuperAdmin} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}