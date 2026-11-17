// Accent palette. `hex` fills shapes (text on it is ink-black);
// `ink` is the darker shade used for colored text on white (≥4.5:1).
export const ACCENTS = [
  { id: "volt", name: "Volt", hex: "#8CFF3A", ink: "#2F7A00" },
  { id: "pink", name: "Hot pink", hex: "#FF2D87", ink: "#C8005A" },
  { id: "cyan", name: "Electric cyan", hex: "#22E4FF", ink: "#00708A" },
  { id: "yellow", name: "Neon yellow", hex: "#FFEA00", ink: "#7A6A00" },
  { id: "violet", name: "Neon violet", hex: "#C04DFF", ink: "#8A00D4" },
  { id: "orange", name: "Neon orange", hex: "#FF6A00", ink: "#C24E00" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export function accentById(id: string | null | undefined) {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

export function applyAccent(id: string | null | undefined) {
  if (typeof document === "undefined") return;
  const a = accentById(id);
  document.documentElement.style.setProperty("--accent", a.hex);
  document.documentElement.style.setProperty("--accent-ink", a.ink);
  try {
    localStorage.setItem("run-tracker-accent", a.id);
  } catch {}
}
