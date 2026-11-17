# Run Tracker

A private training journal for runs. Watch data plus the things a watch can't tell you: a grade for every run, effort (RPE), intent, supplementary work and notes.

Companion to [BJJ Tracker](https://github.com/miguelito4/bjj-tracker). It uses the **same Supabase project**: one account, and BJJ sessions show up on the run week automatically. The run app only reads the BJJ `sessions` table and never writes to it.

## What's here (stage 1)

- **Log:** manual entry (date, distance, time, avg HR, climb), then grade (Excellent / Good / Flat / Reduced / Didn't run), RPE 1–10, intent, supplementary work (core, legs, mobility, roll, upper) and notes. BJJ for the day is ticked from BJJ Tracker.
- **Week:** Recreational mode (time on feet, grade mix, % under your HR cap) or Performance mode (distance, easy share, average HR). Includes a day strip with grade stamps and BJJ days, plus the one-lever card.
- **One lever:** Chad's rule. Hold a load for N weeks (3 by default), then change one thing: volume or intensity, not both.
- **Trends:** the last 12 weeks of time on feet, weekly table, consistency streak.
- **Settings:** accent color (Volt, Hot pink, Electric cyan, Neon yellow, Neon violet, Neon orange), default mode, HR cap, units, BJJ toggle, lever blocks, CSV export.

Not yet: Garmin sync (stage 2), zone and pace-at-HR trends (stage 3).

## Stack

Next.js 16 (App Router) · React 19 · Supabase (Postgres + RLS, magic-link auth) · Recharts · Vercel · PWA.

## Setup

1. **Database.** In the BJJ Tracker's Supabase project, open the SQL editor and run `supabase/migrations/001_run_tables.sql`. It creates `run_activities`, `run_supplements`, `run_levers` and `run_settings`, each with row-level security. It relies on `public.profiles`, `public.set_updated_at()` and `uuid-ossp` from the BJJ schema.
2. **Auth redirect.** In Supabase → Authentication → URL Configuration, add the new site URL (for example `https://run.caseyjr.org`) to **Redirect URLs**. Without this, magic links will bounce back to the BJJ app.
3. **Env.** Copy `.env.example` to `.env.local` and use the same `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as BJJ Tracker.
4. **Run.** `npm install && npm run dev`.
5. **Deploy.** Import the repo in Vercel, set the two env vars and add the domain.

Sign-in is `shouldCreateUser: false`, so only existing accounts in the project can log in. Nobody new can sign up from this app.

The BJJ Tracker's keep-alive job already pings this Supabase project, so this app doesn't need its own.

## License

MIT
