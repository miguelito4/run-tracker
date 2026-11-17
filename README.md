# Run Tracker

A private training journal for runs. Watch data plus the things a watch can't tell you: a grade for every run, effort (RPE), intent, supplementary work and notes.

It's single-user: one deployment is one person, with one Supabase project and one Garmin account. The live instance at run.caseyjr.org is mine and isn't open to others. To use it yourself, deploy your own copy (see **Setup**).

It pairs with [BJJ Tracker](https://github.com/miguelito4/bjj-tracker) if you run both from the same Supabase project, but doesn't need it.

## What's here

- **Log:** grade (Excellent / Good / Flat / Reduced / Didn't run), RPE 1–10, intent, supplementary work (core, legs, mobility, roll, upper) and notes. Runs arrive from Garmin; you can also enter one by hand.
- **Garmin sync:** pulls runs through Garmin's Personal API once a day and from **Settings → Sync now**. Each run's original .FIT is parsed for time under your HR cap and run/walk split, and kept in a private Storage bucket. A manual entry on the same day is merged into the Garmin run, so your grade and notes survive.
- **Week:** Recreational mode (time on feet, grade mix, % under your HR cap) or Performance mode (distance, easy share, average HR). Includes a day strip with grade stamps, plus the one-lever card.
- **One lever:** hold a load for N weeks (3 by default), then change one thing: volume or intensity, not both.
- **Trends:** the last 12 weeks of time on feet, weekly table, consistency streak.
- **Settings:** accent color, default mode, HR cap, units, BJJ toggle, lever blocks, CSV export.

Not yet: zone and pace-at-HR trends.

## Stack

Next.js 16 (App Router) · React 19 · Supabase (Postgres + RLS, magic-link auth, Storage) · Vercel (hosting + Cron) · Recharts · PWA.

## Setup

1. **Supabase project.** Create a project, or use your BJJ Tracker project if you have one. In the SQL editor, run `supabase/migrations/000_base.sql`, then `001_run_tables.sql`, then `002_garmin_sync.sql`. If you want BJJ Tracker in the same project but haven't set it up yet, run its [`schema.sql`](https://github.com/miguelito4/bjj-tracker/blob/main/schema.sql) **before** 000; it fails if run after.
2. **Your account.** Sign-in never creates accounts (`shouldCreateUser: false`), so nobody can sign up on your deployment, including you. Add yourself in Supabase → Authentication → Users → **Add user** → **Create new user**, with **Auto Confirm User** ticked. If you already use BJJ Tracker in this project, your existing account works.
3. **Garmin key.** In Garmin Connect on the web, open <https://connect.garmin.com/app/settings/personalApiToken> and create a key. It's shown once, so copy it, and pick the longest expiry. Use the account your watch syncs to.
4. **Deploy.** Import the repo in Vercel, add your domain, and set these env vars:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: your project URL and publishable (anon) key, from Supabase → Project Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`): the `sb_secret_…` key. The daily sync runs without a signed-in user, so it needs this to write. Server-only: no `NEXT_PUBLIC_` prefix.
   - `GARMIN_PERSONAL_API_KEY`: the key from step 3.
   - `CRON_SECRET`: any long random string. Vercel sends it to authorize the daily job.
   - `RUN_USER_ID` (optional): your Supabase user id. Without it, the daily job uses the single row in `run_settings`.

   Then in Supabase → Authentication → URL Configuration, add your domain (for example `https://run.example.com`) to **Redirect URLs**. Otherwise magic links go to the project's Site URL instead.
5. **First sync.** Sign in with a magic link; that creates the settings row the daily job uses. Then go to Settings → **Sync now**. The first sync backfills 120 days, fetching up to 12 .FIT files per tap; tap again until nothing is pending. After that it runs daily at 11:17 UTC.

To run locally, copy `.env.example` to `.env.local`, fill it in, run `npm install && npm run dev`, and add `http://localhost:3000` to Redirect URLs.

## Garmin key

The personal API key reads only your own Garmin data and is for personal use, not for apps serving other people. Keys expire after 30, 90 or 180 days, or one year at most. To rotate, create a new key in Garmin Connect, replace `GARMIN_PERSONAL_API_KEY` in Vercel, then redeploy.

When a key expires or is revoked, **Sync now** says Garmin rejected it. The daily job doesn't report this yet: it stops adding runs and Settings keeps showing the last successful sync. If runs stop arriving, tap Sync now to check.

## BJJ Tracker (optional)

If BJJ Tracker uses the same Supabase project, sessions you log there appear on the run week and tick the BJJ box on each entry. This app only reads BJJ's `sessions` table and never writes to it. Without BJJ Tracker, turn the BJJ toggle off in Settings; leaving it on does no harm, it just shows nothing.

## How the numbers are worked out

Time under cap is HR-sample seconds at or below the cap, scaled to timer time (blank if HR covers under half the run). Run vs walk uses cadence (≥70 per leg, about 140 spm) and falls back to speed. Gaps over 10 s are treated as pauses.

## Notes

Free Supabase projects pause after a stretch of inactivity. The daily sync queries the database every day, which should keep the project awake; if it does pause, restore it from the Supabase dashboard.

## License

MIT
