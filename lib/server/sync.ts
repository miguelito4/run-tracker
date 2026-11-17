import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";
import { downloadFit, searchRuns, type GarminActivity } from "./garmin";
import { fitMetrics } from "./fitMetrics";

const BUCKET = "run-fit";
const FIRST_SYNC_DAYS = 120; // backfill window on the very first sync
const OVERLAP_DAYS = 3; // re-scan recent days so late uploads are caught
const MAX_FILES_PER_RUN = 12; // keep each invocation well inside the function time limit

export interface SyncResult {
  scanned: number;
  added: number;
  updated: number;
  merged: number;
  pending: number; // runs still waiting for their .FIT (picked up on the next sync)
  errors: string[];
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function gmtToIso(s?: string) {
  if (!s) return null;
  const t = new Date(s.replace(" ", "T") + "Z");
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

function summaryZones(a: GarminActivity): Record<string, number> | null {
  const z: Record<string, number> = {};
  for (let i = 1; i <= 5; i++) {
    const v = a[`hrTimeInZone_${i}`];
    if (typeof v === "number") z[`z${i}`] = Math.round(v);
  }
  return Object.keys(z).length ? z : null;
}

/** Pulls new Garmin runs for one user and writes them to run_activities. */
export async function syncGarmin(userId: string, opts: { days?: number } = {}): Promise<SyncResult> {
  const db = supabaseAdmin();
  const result: SyncResult = { scanned: 0, added: 0, updated: 0, merged: 0, pending: 0, errors: [] };

  const { data: settings } = await db.from("run_settings").select("hr_cap, garmin_synced_at").eq("user_id", userId).maybeSingle();
  const hrCap: number = settings?.hr_cap ?? 140;

  // Window: explicit days, else since the last sync (with overlap), else a backfill.
  const now = new Date();
  let from: Date;
  if (opts.days) from = new Date(now.getTime() - opts.days * 86400000);
  else if (settings?.garmin_synced_at) from = new Date(new Date(settings.garmin_synced_at).getTime() - OVERLAP_DAYS * 86400000);
  else from = new Date(now.getTime() - FIRST_SYNC_DAYS * 86400000);

  const runs = await searchRuns(isoDay(from), isoDay(new Date(now.getTime() + 86400000)));
  result.scanned = runs.length;

  const { data: existingRows } = await db
    .from("run_activities")
    .select("id, external_id, fit_path, run_date, source")
    .eq("user_id", userId)
    .gte("run_date", isoDay(new Date(from.getTime() - 86400000)));
  const existing = new Map((existingRows ?? []).filter((r) => r.external_id).map((r) => [r.external_id as string, r]));
  const manualByDate = new Map<string, { id: string }[]>();
  (existingRows ?? [])
    .filter((r) => r.source === "manual")
    .forEach((r) => manualByDate.set(r.run_date, [...(manualByDate.get(r.run_date) ?? []), { id: r.id }]));

  let filesFetched = 0;
  // Oldest first, so a capped run makes steady progress through a backfill.
  for (const a of [...runs].reverse()) {
    const externalId = String(a.activityId);
    const prior = existing.get(externalId);
    const runDate = a.startTimeLocal?.slice(0, 10) ?? isoDay(now);

    const watch: Record<string, unknown> = {
      started_at: gmtToIso(a.startTimeGMT),
      run_date: runDate,
      distance_m: a.distance ?? null,
      duration_s: a.duration != null ? Math.round(a.duration) : null,
      moving_s: a.movingDuration != null ? Math.round(a.movingDuration) : null,
      avg_hr: a.averageHR != null ? Math.round(a.averageHR) : null,
      max_hr: a.maxHR != null ? Math.round(a.maxHR) : null,
      elev_gain_m: a.elevationGain ?? null,
      zone_s: summaryZones(a),
    };

    // Detailed metrics need the .FIT. Fetch it for new runs (and any missing one), within the per-call cap.
    if (!prior?.fit_path) {
      if (filesFetched >= MAX_FILES_PER_RUN) {
        result.pending++;
        if (prior) continue; // nothing new to write yet
      } else {
        filesFetched++;
        try {
          const fit = await downloadFit(a.activityId);
          const m = await fitMetrics(fit, hrCap);
          const path = `${userId}/${externalId}.fit`;
          const up = await db.storage.from(BUCKET).upload(path, fit, { contentType: "application/octet-stream", upsert: true });
          Object.assign(watch, {
            under_cap_s: m.underCapS,
            run_s: m.runS,
            walk_s: m.walkS,
            fit_path: up.error ? null : path,
            distance_m: watch.distance_m ?? m.distanceM,
            duration_s: watch.duration_s ?? m.timerS,
            avg_hr: watch.avg_hr ?? m.avgHr,
            max_hr: watch.max_hr ?? m.maxHr,
            elev_gain_m: watch.elev_gain_m ?? m.ascentM,
            zone_s: watch.zone_s ?? m.zoneS,
          });
          if (up.error) result.errors.push(`Storage upload for ${externalId}: ${up.error.message}`);
        } catch (e) {
          result.errors.push(`FIT for ${externalId}: ${(e as Error).message}`);
        }
      }
    }

    // Never send nulls over data we already have from an earlier sync.
    for (const k of Object.keys(watch)) if (watch[k] == null && prior) delete watch[k];

    if (prior) {
      const { error } = await db.from("run_activities").update(watch).eq("id", prior.id).eq("user_id", userId);
      if (error) result.errors.push(`Update ${externalId}: ${error.message}`);
      else result.updated++;
      continue;
    }

    // A manual entry on the same day becomes this Garmin run, keeping your grade, notes and so on.
    const manual = manualByDate.get(runDate)?.shift();
    if (manual) {
      const { error } = await db
        .from("run_activities")
        .update({ ...watch, source: "garmin", external_id: externalId })
        .eq("id", manual.id)
        .eq("user_id", userId);
      if (error) result.errors.push(`Merge ${externalId}: ${error.message}`);
      else result.merged++;
      continue;
    }

    const { error } = await db.from("run_activities").insert({
      ...watch,
      user_id: userId,
      source: "garmin",
      external_id: externalId,
      title: a.activityName ?? null,
    });
    if (error) result.errors.push(`Insert ${externalId}: ${error.message}`);
    else result.added++;
  }

  // Only advance the sync marker once nothing is left waiting.
  if (result.pending === 0) {
    await db.from("run_settings").update({ garmin_synced_at: now.toISOString() }).eq("user_id", userId);
  }
  await db
    .from("run_settings")
    .update({ garmin_last_result: { ...result, at: now.toISOString() } })
    .eq("user_id", userId);

  return result;
}
