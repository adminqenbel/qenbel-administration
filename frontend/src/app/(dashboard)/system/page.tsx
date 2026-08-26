import { requireAdmin } from "@/lib/auth";
import { createServiceSupabaseClient } from "@/lib/supabase.server";

export const revalidate = 60;

async function getSystemData() {
  try {
    const supabase = createServiceSupabaseClient();
    const [apps, events] = await Promise.allSettled([
      supabase.from("applications").select("*").order("name"),
      supabase.from("system_events").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    return {
      applications: apps.status === "fulfilled" ? (apps.value.data ?? []) : [],
      events: events.status === "fulfilled" ? (events.value.data ?? []) : [],
    };
  } catch { return { applications: [], events: [] }; }
}

export default async function SystemPage() {
  const [admin, data] = await Promise.all([requireAdmin(), getSystemData()]);
  void admin;

  const operational = data.applications.filter((a) => a.status === "operational").length;
  const degraded = data.applications.filter((a) => a.status !== "operational" && a.status !== "offline").length;
  const offline = data.applications.filter((a) => a.status === "offline").length;

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>System Health</h1>
        <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>Real-time status of all QenBel products and services</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Operational", value: operational, color: "var(--green)" },
          { label: "Degraded", value: degraded, color: "var(--amber)" },
          { label: "Offline", value: offline, color: "var(--red)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 6 }}>{value}</div>
          </div>
        ))}
      </div>

      <section className="card" style={{ padding: 20, overflow: "hidden" }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 16 }}>Applications</h2>
        {data.applications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>No applications registered</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.applications.map((app) => (
              <div key={app.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                <span className={`dot ${app.status === "operational" ? "dot-green" : app.status === "degraded" ? "dot-amber" : "dot-red"} pulse`} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{app.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>v{app.version ?? "1.0"} &middot; {app.supabase_url ?? "no DB"}</div>
                </div>
                <span className={`badge ${app.status === "operational" ? "badge-green" : app.status === "degraded" ? "badge-amber" : "badge-red"}`}>{app.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {data.events.length > 0 && (
        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 16 }}>Recent Events</h2>
          <table className="data-table">
            <thead><tr><th>Severity</th><th>Title</th><th>App</th><th>Status</th><th>Time</th></tr></thead>
            <tbody>
              {data.events.map((ev) => (
                <tr key={ev.id}>
                  <td><span className={`badge ${ev.severity === "critical" || ev.severity === "high" ? "badge-red" : ev.severity === "medium" ? "badge-amber" : "badge-blue"}`}>{ev.severity}</span></td>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{ev.title}</td>
                  <td style={{ fontSize: 12 }}>{ev.application_id ?? "global"}</td>
                  <td>{ev.resolved ? <span className="badge badge-green">resolved</span> : <span className="badge badge-amber">open</span>}</td>
                  <td style={{ fontSize: 11 }}>{new Date(ev.created_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
