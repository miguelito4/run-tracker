"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("run-tracker-email");
    if (saved && emailRef.current) emailRef.current.value = saved;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailRef.current?.value.trim() ?? "";
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    localStorage.setItem("run-tracker-email", email);
    setEmail(email);
    setSent(true);
  };

  return (
    <main className="app" style={{ justifyContent: "center", padding: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 14 }}>
          <div className="mono muted" style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <span className="dot" /> RUN TRACKER
          </div>
          <h1 className="h1" style={{ marginTop: 8 }}>Your logbook</h1>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          Private. Your data is isolated at the database level. No tracking, no analytics, no ads.
        </p>
        {sent ? (
          <div className="card" style={{ margin: 0 }}>
            <strong>Check your email</strong>
            <span className="muted" style={{ fontSize: 14 }}>We sent a magic link to {email}.</span>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="flabel" htmlFor="email" style={{ margin: 0 }}>Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              ref={emailRef}
              required
              style={{ height: 48, border: "1.5px solid var(--ink)", padding: "0 12px", fontSize: 16, borderRadius: 0 }}
            />
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send magic link"}
            </button>
            {error && <p className="err" style={{ margin: 0 }}>{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
