import { requireAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{
        flex: 1,
        overflowY: "auto",
        background: "var(--bg-root)",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Top bar */}
        <header style={{
          padding: "16px 28px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-surface)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <div />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{admin.email}</span>
            <span className="badge badge-white">{admin.isSuperAdmin ? "SuperAdmin" : "Admin"}</span>
          </div>
        </header>

        <div style={{ padding: "28px", flex: 1, maxWidth: 1400 }}>
          {children}
        </div>
      </main>
    </div>
  );
}

