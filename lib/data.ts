import { supabase } from "./supabase";
import {
  DEFAULT_SETTINGS,
  type BjjSession,
  type Lever,
  type RunActivity,
  type Settings,
  type Supplements,
} from "./types";

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

// ---------- settings ----------
export async function loadSettings(): Promise<Settings> {
  const { data, error } = await supabase.from("run_settings").select("*").maybeSingle();
  if (error) throw error;
  if (data) return { ...DEFAULT_SETTINGS, ...data } as Settings;
  const user_id = await uid();
  await supabase.from("run_settings").insert({ user_id, ...DEFAULT_SETTINGS });
  return DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<Settings>) {
  const user_id = await uid();
  const { error } = await supabase.from("run_settings").upsert({ user_id, ...patch });
  if (error) throw error;
}

// ---------- activities ----------
export async function loadActivities(from: string, to: string): Promise<RunActivity[]> {
  const { data, error } = await supabase
    .from("run_activities")
    .select("*")
    .gte("run_date", from)
    .lte("run_date", to)
    .order("run_date", { ascending: false })
    .order("started_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as RunActivity[];
}

export async function saveActivity(a: Partial<RunActivity>): Promise<RunActivity> {
  const user_id = await uid();
  const row = { ...a, user_id };
  const q = a.id
    ? supabase.from("run_activities").update(row).eq("id", a.id).select().single()
    : supabase.from("run_activities").insert(row).select().single();
  const { data, error } = await q;
  if (error) throw error;
  return data as RunActivity;
}

export async function deleteActivity(id: string) {
  const { error } = await supabase.from("run_activities").delete().eq("id", id);
  if (error) throw error;
}

// ---------- supplements ----------
export async function loadSupplements(from: string, to: string): Promise<Supplements[]> {
  const { data, error } = await supabase
    .from("run_supplements")
    .select("day, core, legs, mobility, roll, upper")
    .gte("day", from)
    .lte("day", to);
  if (error) throw error;
  return (data ?? []) as Supplements[];
}

export async function saveSupplements(s: Supplements) {
  const user_id = await uid();
  const { error } = await supabase
    .from("run_supplements")
    .upsert({ ...s, user_id, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---------- BJJ (read-only, from the BJJ Tracker's table) ----------
export async function loadBjj(from: string, to: string): Promise<BjjSession[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("session_date, session_type, mat_hours")
    .gte("session_date", from)
    .lte("session_date", to);
  if (error) {
    // The run app still works if the BJJ table is missing or unreadable.
    console.warn("BJJ sessions unavailable:", error.message);
    return [];
  }
  return (data ?? []) as BjjSession[];
}

// ---------- one-lever blocks ----------
export async function loadCurrentLever(): Promise<Lever | null> {
  const { data, error } = await supabase
    .from("run_levers")
    .select("id, start_date, lever, hold_weeks, note")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Lever) ?? null;
}

export async function startLever(l: Omit<Lever, "id">) {
  const user_id = await uid();
  const { error } = await supabase.from("run_levers").insert({ ...l, user_id });
  if (error) throw error;
}
