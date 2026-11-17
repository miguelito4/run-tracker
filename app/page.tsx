"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import RunJournal from "@/components/RunJournal";

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !session) window.location.replace("/auth");
  }, [loading, session]);

  if (loading) {
    return <div className="app" style={{ alignItems: "center", justifyContent: "center" }}><span className="mono muted">Loading…</span></div>;
  }

  if (!session) return null;

  return <RunJournal />;
}
