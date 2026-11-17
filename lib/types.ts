export type Grade = "excellent" | "good" | "flat" | "reduced" | "dnr";
export type Intent =
  | "very_easy" | "easy" | "easy_mod" | "strides" | "hills"
  | "tempo" | "threshold" | "race" | "long";
export type Mode = "recreational" | "performance";
export type Units = "mi" | "km";
export type LeverKind = "hold" | "volume" | "intensity";

export interface RunActivity {
  id: string;
  user_id: string;
  source: "manual" | "garmin" | "coros";
  external_id: string | null;
  started_at: string | null;
  run_date: string; // YYYY-MM-DD
  title: string | null;
  distance_m: number | null;
  duration_s: number | null;
  moving_s: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  elev_gain_m: number | null;
  temp_c: number | null;
  zone_s: Record<string, number> | null;
  under_cap_s: number | null;
  run_s: number | null;
  walk_s: number | null;
  fit_path: string | null;
  grade: Grade | null;
  rpe: number | null;
  intent: Intent | null;
  notes: string | null;
}

export interface Supplements {
  user_id?: string;
  day: string;
  core: boolean;
  legs: boolean;
  mobility: boolean;
  roll: boolean;
  upper: boolean;
}

export interface Lever {
  id: string;
  start_date: string;
  lever: LeverKind;
  hold_weeks: number;
  note: string | null;
}

export interface Settings {
  accent: string;
  default_mode: Mode;
  hr_cap: number;
  units: Units;
  show_bjj: boolean;
}

export interface BjjSession {
  session_date: string;
  session_type: string;
  mat_hours: number;
}

export const DEFAULT_SETTINGS: Settings = {
  accent: "volt",
  default_mode: "recreational",
  hr_cap: 140,
  units: "mi",
  show_bjj: true,
};

export const GRADES: { id: Grade; label: string; short: string }[] = [
  { id: "excellent", label: "Excellent", short: "E" },
  { id: "good", label: "Good", short: "G" },
  { id: "flat", label: "Flat", short: "F" },
  { id: "reduced", label: "Reduced", short: "R" },
  { id: "dnr", label: "Didn't run", short: "—" },
];

export const INTENTS: { id: Intent; label: string; easy: boolean }[] = [
  { id: "very_easy", label: "Very easy", easy: true },
  { id: "easy", label: "Easy · Z2", easy: true },
  { id: "long", label: "Long easy", easy: true },
  { id: "easy_mod", label: "Easy/mod", easy: true },
  { id: "strides", label: "Strides", easy: true },
  { id: "hills", label: "Hills", easy: false },
  { id: "tempo", label: "Tempo", easy: false },
  { id: "threshold", label: "Threshold", easy: false },
  { id: "race", label: "Race", easy: false },
];

export const SUPPLEMENT_KEYS = ["core", "legs", "mobility", "roll", "upper"] as const;
export const SUPPLEMENT_LABELS: Record<(typeof SUPPLEMENT_KEYS)[number], string> = {
  core: "Core",
  legs: "Legs",
  mobility: "Mobility",
  roll: "Roll",
  upper: "Upper",
};
