// All week math is Monday-start, in local time, on YYYY-MM-DD strings.

export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parse(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(isoDate: string, n: number): string {
  const d = parse(isoDate);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function today(): string {
  return iso(new Date());
}

export function weekStart(isoDate: string): string {
  const d = parse(isoDate);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return iso(d);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
}

export function fmtRange(start: string): string {
  const s = parse(start);
  const e = parse(addDays(start, 6));
  const mon = (d: Date) => d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return s.getMonth() === e.getMonth()
    ? `${mon(s)} ${s.getDate()}–${e.getDate()}`
    : `${mon(s)} ${s.getDate()} – ${mon(e)} ${e.getDate()}`;
}

export function fmtDay(isoDate: string): string {
  return parse(isoDate).toLocaleString("en-US", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
}

export function weekdayShort(isoDate: string): string {
  return parse(isoDate).toLocaleString("en-US", { weekday: "short" });
}
