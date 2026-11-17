import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { syncGarmin } from "@/lib/server/sync";
import { GarminError } from "@/lib/server/garmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The single owner of this deployment: RUN_USER_ID if set, else the one row in run_settings. */
async function ownerId(): Promise<string> {
  if (process.env.RUN_USER_ID) return process.env.RUN_USER_ID;
  const { data, error } = await supabaseAdmin().from("run_settings").select("user_id").limit(2);
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("Can't tell whose runs to sync. Set RUN_USER_ID.");
  return data[0].user_id;
}

async function run(userId: string, days?: number) {
  try {
    const result = await syncGarmin(userId, { days });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const status = e instanceof GarminError && e.status ? 502 : 500;
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status });
  }
}

// Vercel Cron: sends "Authorization: Bearer $CRON_SECRET".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return run(await ownerId());
}

// "Sync now" from the app: the signed-in user's Supabase access token.
export async function POST(req: NextRequest) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin().auth.getUser(jwt);
  if (error || !data.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (process.env.RUN_USER_ID && data.user.id !== process.env.RUN_USER_ID) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const days = Number(req.nextUrl.searchParams.get("days")) || undefined;
  return run(data.user.id, days && days > 0 && days <= 730 ? days : undefined);
}
