import type { Units } from "./types";

const M_PER_MI = 1609.344;

export function distance(m: number | null | undefined, units: Units, digits = 1): string {
  if (m == null) return "—";
  const v = units === "mi" ? m / M_PER_MI : m / 1000;
  return v.toFixed(digits);
}

export function toMeters(value: number, units: Units): number {
  return units === "mi" ? value * M_PER_MI : value * 1000;
}

/** 2h 05m, or 42m */
export function hoursMinutes(s: number | null | undefined): string {
  if (!s) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/** 42:16 or 1:16:05 */
export function clock(s: number | null | undefined): string {
  if (s == null) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Parses "42:16", "1:16:05" or "42" (minutes) into seconds. */
export function parseClock(input: string): number | null {
  const parts = input.trim().split(":").map((p) => Number(p));
  if (!parts.length || parts.some((p) => Number.isNaN(p) || p < 0)) return null;
  if (parts.length === 1) return Math.round(parts[0] * 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

/** pace per unit, e.g. 12:26 */
export function pace(m: number | null | undefined, s: number | null | undefined, units: Units): string {
  if (!m || !s) return "—";
  const perUnit = s / (units === "mi" ? m / M_PER_MI : m / 1000);
  const mm = Math.floor(perUnit / 60);
  const ss = Math.round(perUnit % 60);
  return ss === 60 ? `${mm + 1}:00` : `${mm}:${String(ss).padStart(2, "0")}`;
}

export function feet(m: number | null | undefined): string {
  return m == null ? "—" : String(Math.round(m * 3.28084));
}

export function ratio(run: number | null, walk: number | null): string {
  if (!run) return "—";
  if (!walk) return "no walks";
  const r = run / walk;
  return `${r >= 10 ? Math.round(r) : r.toFixed(1).replace(/\.0$/, "")}:1`;
}
