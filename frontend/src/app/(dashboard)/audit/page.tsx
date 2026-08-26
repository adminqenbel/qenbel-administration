import { requireAdmin } from "@/lib/auth";
import { createServiceSupabaseClient } from "@/lib/supabase";

export const revalidate = 30;

async function getAuditLogs() {
  try {
    const supabase = createServiceSupabaseClient();
    const { data } = await supabase
      .from("admin_audit_log")
      .select("id, action, admin_email, target_type, target_id, application_id, metadata, ip_address, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  } catch { return []; }
}

export default async function AuditPage() {
  const [admin, logs] = await Promise.all([requireAdmin(), getAuditLogs()]);

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Audit Log</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>Immutable record of all admin actions across QenBel products</p>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Admin</th>
              <th>Target</th>
              <th>Application</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No audit logs yet</td></tr>
            ) : logs.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                  {new Date(log.created_at).toLocaleString("en-IN")}
                </td>
                <td>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>{log.action}</span>
                </td>
                <td style={{ fontSize: 12 }}>{log.admin_email ?? "—"}</td>
                <td style={{ fontSize: 12 }}>
                  {log.target_type && <span className="badge badge-white" style={{ marginRight: 6 }}>{log.target_type}</span>}
                  {log.target_id ? <span style={{ fontFamily: "monospace", fontSize: 11 }}>{log.target_id.slice(0, 12)}…</span> : "—"}
                </td>
                <td style={{ fontSize: 12 }}>{log.application_id ?? "global"}</td>
                <td style={{ fontSize: 11, fontFamily: "monospace" }}>{log.ip_address ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
