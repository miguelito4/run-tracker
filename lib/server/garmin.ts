import "server-only";
import { unzipSync } from "fflate";

// Garmin Connect Personal API. Endpoints and auth flow follow Garmin's
// official client: github.com/garmin/connect-personal-api-python
const BASE = (process.env.GARMIN_PERSONAL_API_BASE_URL ?? "https://personal.connectapi.garmin.com").replace(/\/$/, "");
const TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token";

let cached: { token: string; exp: number } | null = null;

export class GarminError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

function jwtExp(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return Number(payload.exp) * 1000;
  } catch {
    return Date.now() + 30 * 60 * 1000;
  }
}

/** Exchanges the personal API key for a bearer token (cached until an hour before expiry). */
export async function garminToken(): Promise<string> {
  if (cached && cached.exp - Date.now() > 60 * 60 * 1000) return cached.token;
  const key = process.env.GARMIN_PERSONAL_API_KEY?.trim();
  if (!key) throw new GarminError("GARMIN_PERSONAL_API_KEY is not set");
  const res = await fetch(`${BASE}${TOKEN_PATH}`, {
    method: "POST",
    headers: { Accept: "*/*", Authorization: `ApiKey ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new GarminError(
      res.status === 401 || res.status === 403
        ? "Garmin rejected the API key. It may have expired; create a new one in Garmin Connect."
        : `Garmin token request failed (${res.status})`,
      res.status,
    );
  }
  const token = (await res.text()).trim();
  cached = { token, exp: jwtExp(token) };
  return token;
}

async function garminGet(path: string, params: Record<string, string | number> = {}, accept = "application/json") {
  const token = await garminToken();
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: accept },
    cache: "no-store",
  });
  if (!res.ok) throw new GarminError(`Garmin GET ${path} failed (${res.status})`, res.status);
  return res;
}

/** The activity-list summary. Garmin doesn't publish a schema for every field, so all are optional. */
export interface GarminActivity {
  activityId: number;
  activityName?: string;
  startTimeLocal?: string; // "2026-11-14 07:01:23"
  startTimeGMT?: string; // "2026-11-14 12:01:23"
  activityType?: { typeKey?: string; parentTypeId?: number };
  distance?: number; // m
  duration?: number; // s
  movingDuration?: number; // s
  elevationGain?: number; // m
  averageHR?: number;
  maxHR?: number;
  minTemperature?: number;
  maxTemperature?: number;
  [key: `hrTimeInZone_${number}`]: number | undefined;
}

export async function searchRuns(startDate: string, endDate: string): Promise<GarminActivity[]> {
  const out: GarminActivity[] = [];
  const limit = 50;
  for (let start = 0; start < 2000; start += limit) {
    const res = await garminGet("/activitylist-service/activities/search/activities", {
      start,
      limit,
      startDate,
      endDate,
      activityType: "running",
    });
    const page = (await res.json().catch(() => [])) as GarminActivity[] | null;
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    if (page.length < limit) break;
  }
  // Belt and braces: keep only running-family activities.
  return out.filter((a) => (a.activityType?.typeKey ?? "running").includes("running"));
}

/** Downloads the original activity file (a ZIP) and returns the .FIT inside it. */
export async function downloadFit(activityId: number): Promise<Uint8Array> {
  const res = await garminGet(
    `/download-service/files/activity/${activityId}`,
    {},
    "application/zip, application/x-zip-compressed, application/octet-stream",
  );
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.length) throw new GarminError(`Empty download for activity ${activityId}`);
  // Some files may come back as a bare .FIT ("FIT" signature at byte 8).
  if (bytes[8] === 0x2e && bytes[9] === 0x46 && bytes[10] === 0x49 && bytes[11] === 0x54) return bytes;
  const files = unzipSync(bytes);
  const name = Object.keys(files).find((n) => n.toLowerCase().endsWith(".fit"));
  if (!name) throw new GarminError(`No .FIT file in download for activity ${activityId}`);
  return files[name];
}
