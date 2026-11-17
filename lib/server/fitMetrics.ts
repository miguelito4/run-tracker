import "server-only";
import FitParser from "fit-file-parser";

export interface FitMetrics {
  timerS: number | null;
  distanceM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  ascentM: number | null;
  underCapS: number | null;
  runS: number | null;
  walkS: number | null;
  zoneS: Record<string, number> | null;
}

// Classification thresholds. FIT running cadence is per leg (steps/min ÷ 2):
// running sits around 80–90, walking around 55–65.
const RUN_CADENCE = 70;
const RUN_SPEED = 1.85; // m/s (~14:30/mi), used only when cadence is missing
const STOPPED_SPEED = 0.4; // m/s
const MAX_GAP_S = 10; // larger gaps between records are pauses, not time on feet

export async function fitMetrics(fit: Uint8Array, hrCap: number): Promise<FitMetrics> {
  const parser = new FitParser({ force: true, speedUnit: "m/s", lengthUnit: "m", mode: "list" });
  const data = await parser.parseAsync(Buffer.from(fit.buffer, fit.byteOffset, fit.byteLength) as Buffer<ArrayBuffer>);
  const records = (data.records ?? []).filter((r) => r.timestamp);
  const session = data.sessions?.[0];

  let underCap = 0;
  let hrCovered = 0;
  let run = 0;
  let walk = 0;
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1];
    const r = records[i];
    const dt = (new Date(r.timestamp!).getTime() - new Date(prev.timestamp!).getTime()) / 1000;
    if (!(dt > 0) || dt > MAX_GAP_S) continue;

    if (typeof r.heart_rate === "number" && r.heart_rate > 0) {
      hrCovered += dt;
      if (r.heart_rate <= hrCap) underCap += dt;
    }

    const speed = r.enhanced_speed ?? r.speed;
    const cadence = typeof r.cadence === "number" ? r.cadence + (r.fractional_cadence ?? 0) : null;
    if ((speed ?? 0) < STOPPED_SPEED && (cadence ?? 0) < 10) continue; // standing still
    const running = cadence != null && cadence > 0 ? cadence >= RUN_CADENCE : (speed ?? 0) >= RUN_SPEED;
    if (running) run += dt;
    else walk += dt;
  }

  const timer = session?.total_timer_time ?? null;
  // Only trust under-cap if HR covered most of the run; otherwise leave it blank.
  const underCapS = hrCovered > 0 && timer && hrCovered >= 0.5 * timer ? Math.round((underCap * timer) / hrCovered) : null;

  const zones = session?.time_in_hr_zone?.filter((z): z is number => typeof z === "number");
  const zoneS = zones && zones.some((z) => z > 0)
    ? Object.fromEntries(zones.map((z, i) => [`z${i}`, Math.round(z)]))
    : null;

  return {
    timerS: timer != null ? Math.round(timer) : null,
    distanceM: session?.total_distance ?? null,
    avgHr: session?.avg_heart_rate ?? null,
    maxHr: session?.max_heart_rate ?? null,
    ascentM: session?.total_ascent ?? null,
    underCapS,
    runS: run + walk > 0 ? Math.round(run) : null,
    walkS: run + walk > 0 ? Math.round(walk) : null,
    zoneS,
  };
}
