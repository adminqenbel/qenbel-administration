"use client";
import { useState, useEffect, Suspense } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase.client";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam === "unauthorized") setError("Your account does not have admin privileges.");
    if (errParam === "not_found") setError("Account not found in QenBel identity system.");
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserSupabaseClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (authError) {
      setError("Invalid email or password. Only admin accounts can sign in here.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: "*",
        },
      },
    });
    if (oauthError) {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: "100%",
      maxWidth: 380,
      display: "flex",
      flexDirection: "column",
      gap: 24,
    }}>
      {/* Brand */}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ marginBottom: 12 }}>
          <img 
            src="/logo.png" 
            alt="QenBel Administration" 
            style={{ 
              width: "100%", 
              maxWidth: 240, 
              height: "auto", 
              display: "block",
              objectFit: "contain" 
            }} 
          />
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Internal access only • Admin accounts only</p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.20)",
          borderRadius: 10,
          fontSize: 13,
          color: "var(--red)",
        }}>
          {error}
        </div>
      )}

      {/* Google Sign In */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "12px", borderRadius: 10, background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)", color: "var(--text-primary)",
          fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          transition: "all 0.15s",
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>or email</span>
        <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
      </div>

      {/* Email/Pass form */}
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="admin@qenbel.com"
            className="input"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="input"
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 4, justifyContent: "center", padding: "12px" }}>
          {loading ? "Signing in…" : "Sign In to Admin"}
        </button>
      </form>

      <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
        Access is restricted to QenBel administrators only.<br />
        Unauthorized access attempts are logged.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-root)",
      padding: 20,
    }}>
      <Suspense fallback={
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
