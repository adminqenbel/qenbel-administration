import { requireAdmin } from "@/lib/auth";
import { createServiceSupabaseClient } from "@/lib/supabase.server";

export const revalidate = 30;

async function getModerationQueue() {
  try {
    const supabase = createServiceSupabaseClient();
    // MyHarur moderation queue — fetched via service role cross-DB access
    // The service key must be for the MyHarur Supabase project (not QenBel)
    // TODO: Add MYHARUR_SERVICE_KEY env var and a second supabase client for cross-DB
    return [];
  } catch { return []; }
}

async function getModerationStats() {
  try {
    const supabase = createServiceSupabaseClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, approvedToday, rejectedToday, emergency] = await Promise.allSettled([
      supabase.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("action", "MODERATION_APPROVE"),
      supabase.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("action", "MODERATION_APPROVE").gte("created_at", today.toISOString()),
      supabase.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("action", "MODERATION_REJECT").gte("created_at", today.toISOString()),
      supabase.from("admin_audit_log").select("id", { count: "exact", head: true }).eq("action", "MODERATION_EMERGENCY_FLAG"),
    ]);

    return {
      pending: 0,
      approvedToday: approvedToday.status === "fulfilled" ? (approvedToday.value.count ?? 0) : 0,
      rejectedToday: rejectedToday.status === "fulfilled" ? (rejectedToday.value.count ?? 0) : 0,
      emergencyFlags: 0,
    };
  } catch {
    return { pending: 0, approvedToday: 0, rejectedToday: 0, emergencyFlags: 0 };
  }
}

export default async function ModerationPage() {
  const [admin, queue, stats] = await Promise.all([requireAdmin(), getModerationQueue(), getModerationStats()]);
  void admin;

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Moderation</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>
          Review community-submitted alerts from MyHarur before they are published.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Pending Review", value: stats.pending, color: "var(--amber)" },
          { label: "Approved Today", value: stats.approvedToday, color: "var(--green)" },
          { label: "Rejected Today", value: stats.rejectedToday, color: "var(--red)" },
          { label: "Emergency Flags", value: stats.emergencyFlags, color: "var(--red)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 6 }}>{value}</div>
          </div>
        ))}
      </div>

      {queue.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>&#x2705;</div>
          <h3 style={{ color: "var(--text-primary)", margin: "0 0 8px" }}>Queue is Clear</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 400, margin: "0 auto" }}>
            Community alerts from MyHarur will appear here for review. All clear right now.
          </p>
          <div style={{ marginTop: 20, padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 10, display: "inline-block", fontSize: 12, color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
            &#x1F4CC; Add <code>MYHARUR_SERVICE_KEY</code> env var to enable live cross-DB queue
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Title</th>
                <th>Ward</th>
                <th>Emergency</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item: Record<string, unknown>) => (
                <tr key={item.id as string}>
                  <td><span className="badge badge-blue">{item.category as string}</span></td>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{item.title as string}</td>
                  <td style={{ fontSize: 12 }}>{(item.ward_id as number) ?? "All"}</td>
                  <td>{item.emergency_tagged ? <span className="badge badge-red">Emergency</span> : <span className="badge badge-white">Normal</span>}</td>
                  <td style={{ fontSize: 11 }}>{new Date(item.created_at as string).toLocaleString("en-IN")}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button style={{ padding: "4px 12px", background: "var(--green)", color: "white", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Approve</button>
                    <button style={{ padding: "4px 12px", background: "var(--red)", color: "white", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
