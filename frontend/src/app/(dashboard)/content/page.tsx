import { requireAdmin } from "@/lib/auth";
import { createServiceSupabaseClient } from "@/lib/supabase.server";
import { CreateAnnouncementModal } from "@/components/content/CreateAnnouncementModal";

export const revalidate = 30;

async function getAnnouncements() {
  try {
    const supabase = createServiceSupabaseClient();
    const { data } = await supabase
      .from("announcements")
      .select("id, title, content, application_id, status, created_at, publish_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  } catch { return []; }
}

export default async function ContentPage() {
  const [admin, announcements] = await Promise.all([requireAdmin(), getAnnouncements()]);

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Content & Broadcasts</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>Global announcements and civic notices across QenBel products</p>
        </div>
        <CreateAnnouncementModal />
      </div>

      {announcements.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📢</div>
          <h3 style={{ color: "var(--text-primary)", margin: "0 0 8px" }}>No announcements yet</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Create announcements to broadcast to MyHarur and other QenBel apps.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {announcements.map(a => (
            <div key={a.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{a.title}</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {a.application_id && <span className="badge badge-blue">{a.application_id}</span>}
                  <span className={`badge ${a.status === "published" ? "badge-green" : a.status === "draft" ? "badge-white" : "badge-amber"}`}>{a.status}</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{a.content}</p>
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
                Created {new Date(a.created_at).toLocaleString("en-IN")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}