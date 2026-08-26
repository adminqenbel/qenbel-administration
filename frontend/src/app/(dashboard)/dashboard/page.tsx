import { requireAdmin } from "@/lib/auth";
import { createServiceSupabaseClient } from "@/lib/supabase";

export const revalidate = 60; // Revalidate every minute

async function getStats() {
  try {
    const supabase = createServiceSupabaseClient();

    const [usersRes, appsRes, eventsRes, auditRes] = await Promise.allSettled([
      supabase.from("qenbel_users").select("id, status, created_at, global_roles", { count: "exact" }),
      supabase.from("applications").select("id, name, status, user_count"),
      supabase.from("system_events").select("id, severity, title, created_at, resolved, application_id").eq("resolved", false).order("created_at", { ascending: false }).limit(5),
      supabase.from("admin_audit_log").select("id, action, admin_email, target_type, created_at").order("created_at", { ascending: false }).limit(8),
    ]);

    return {
      totalUsers: usersRes.status === "fulfilled" ? (usersRes.value.count ?? 0) : 0,
      activeUsers: usersRes.status === "fulfilled"
        ? (usersRes.value.data?.filter(u => u.status === "active").length ?? 0)
        : 0,
      applications: appsRes.status === "fulfilled" ? (appsRes.value.data ?? []) : [],
      openEvents: eventsRes.status === "fulfilled" ? (eventsRes.value.data ?? []) : [],
      recentAudit: auditRes.status === "fulfilled" ? (auditRes.value.data ?? []) : [],
    };
  } catch {
    return { totalUsers: 0, activeUsers: 0, applications: [], openEvents: [], recentAudit: [] };
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function DashboardPage() {
  const [admin, stats] = await Promise.all([requireAdmin(), getStats()]);

  const myharurApp = stats.applications.find(a => a.id === "myharur");

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 14 }}>
          QenBel control plane — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} sub="across all apps" color="white" />
        <StatCard label="Active Users" value={stats.activeUsers.toLocaleString()} sub="non-suspended" color="green" />
        <StatCard label="Open Incidents" value={stats.openEvents.length} sub="unresolved events" color={stats.openEvents.length > 0 ? "red" : "green"} />
        <StatCard label="Applications" value={stats.applications.length} sub="registered products" color="blue" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Applications Status */}
        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 16 }}>Applications</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stats.applications.length === 0 ? (
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>No applications registered.</span>
            ) : stats.applications.map(app => (
              <div key={app.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{app.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{(app.user_count ?? 0).toLocaleString()} users</div>
                </div>
                <span className={`badge ${app.status === "operational" ? "badge-green" : app.status === "degraded" ? "badge-amber" : "badge-red"}`}>
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Audit */}
        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 16 }}>Recent Admin Activity</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.recentAudit.length === 0 ? (
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>No admin actions yet.</span>
            ) : stats.recentAudit.map(log => (
              <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)", marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "monospace" }}>{log.action}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{log.admin_email} · {timeAgo(log.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Open incidents */}
      {stats.openEvents.length > 0 && (
        <section className="card" style={{ padding: 20, borderColor: "rgba(239,68,68,0.20)" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 16 }}>
            ⚠ Open Incidents ({stats.openEvents.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.openEvents.map(ev => (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 8 }}>
                <span className={`badge ${ev.severity === "critical" || ev.severity === "high" ? "badge-red" : ev.severity === "medium" ? "badge-amber" : "badge-blue"}`}>
                  {ev.severity}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{ev.title}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(ev.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colorMap: Record<string, string> = { white: "var(--text-primary)", green: "var(--green)", red: "var(--red)", blue: "var(--blue)", amber: "var(--amber)" };
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: colorMap[color] ?? "var(--text-primary)", marginTop: 8, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}
