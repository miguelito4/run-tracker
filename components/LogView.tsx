"use client";
import { useEffect, useState } from "react";
import { deleteActivity, loadBjj, loadSupplements, saveActivity, saveSupplements } from "@/lib/data";
import { fmtDay, today } from "@/lib/dates";
import { clock, distance, feet, pace, parseClock, ratio, toMeters } from "@/lib/format";
import {
  GRADES,
  INTENTS,
  SUPPLEMENT_KEYS,
  SUPPLEMENT_LABELS,
  type Grade,
  type Intent,
  type RunActivity,
  type Settings,
  type Supplements,
} from "@/lib/types";

interface Props {
  settings: Settings;
  activity: RunActivity | null;
  onDone: () => void;
}

const emptySupps = (day: string): Supplements => ({ day, core: false, legs: false, mobility: false, roll: false, upper: false });

export default function LogView({ settings, activity, onDone }: Props) {
  const fromWatch = activity != null && activity.source !== "manual";
  const u = settings.units;

  // manual fields (strings while editing)
  const [date, setDate] = useState(activity?.run_date ?? today());
  const [title, setTitle] = useState(activity?.title ?? "");
  const [dist, setDist] = useState(activity?.distance_m != null ? distance(activity.distance_m, u, 2) : "");
  const [dur, setDur] = useState(activity?.duration_s != null ? clock(activity.duration_s) : "");
  const [hr, setHr] = useState(activity?.avg_hr != null ? String(activity.avg_hr) : "");
  const [elevFt, setElevFt] = useState(activity?.elev_gain_m != null ? feet(activity.elev_gain_m) : "");

  // journal
  const [grade, setGrade] = useState<Grade | null>(activity?.grade ?? null);
  const [rpe, setRpe] = useState<number | null>(activity?.rpe ?? null);
  const [intent, setIntent] = useState<Intent | null>(activity?.intent ?? null);
  const [notes, setNotes] = useState(activity?.notes ?? "");
  const [supps, setSupps] = useState<Supplements>(emptySupps(date));
  const [bjjToday, setBjjToday] = useState(false);

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSupplements(date, date).then((rows) => setSupps(rows[0] ? { ...rows[0], day: date } : emptySupps(date))).catch(() => {});
    if (settings.show_bjj) loadBjj(date, date).then((b) => setBjjToday(b.length > 0));
  }, [date, settings.show_bjj]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: Partial<RunActivity> = {
        id: activity?.id,
        grade,
        rpe,
        intent,
        notes: notes.trim() || null,
        title: title.trim() || null,
      };
      if (!fromWatch) {
        const d = dist.trim() ? Number(dist) : null;
        const s = dur.trim() ? parseClock(dur) : null;
        if (dist.trim() && (d == null || Number.isNaN(d))) throw new Error("Distance should be a number.");
        if (dur.trim() && s == null) throw new Error("Time should look like 42:16 or 1:05:30.");
        Object.assign(patch, {
          source: "manual",
          run_date: date,
          distance_m: d != null ? Math.round(toMeters(d, u) * 10) / 10 : null,
          duration_s: s,
          avg_hr: hr.trim() ? Number(hr) : null,
          elev_gain_m: elevFt.trim() ? Math.round((Number(elevFt) / 3.28084) * 10) / 10 : null,
        });
      }
      await saveActivity(patch);
      await saveSupplements({ ...supps, day: date });
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!activity) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await deleteActivity(activity.id);
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const underPct =
    activity?.under_cap_s != null && activity.duration_s ? Math.round((100 * activity.under_cap_s) / activity.duration_s) : null;

  return (
    <main>
      <header className="hdr ruled">
        <div className="hdr-top">
          <span>{fmtDay(date)}{activity?.started_at ? ` · ${new Date(activity.started_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="dot" /> {fromWatch ? `Synced · ${activity!.source === "garmin" ? "Garmin" : "Coros"}` : "Manual entry"}
          </span>
        </div>
        <label className="vh" htmlFor="title">Title</label>
        <input
          id="title"
          className="h1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={activity ? "Run" : "New run"}
          style={{ border: 0, padding: 0, width: "100%", background: "transparent" }}
        />
      </header>

      {fromWatch ? (
        <section className="datagrid" aria-label="From your watch">
          <div><div className="label">Distance</div><div className="v">{distance(activity!.distance_m, u, 2)}<span className="u"> {u}</span></div></div>
          <div><div className="label">Time</div><div className="v">{clock(activity!.duration_s)}</div></div>
          <div><div className="label">Pace</div><div className="v">{pace(activity!.distance_m, activity!.duration_s, u)}</div></div>
          <div><div className="label">Avg HR</div><div className="v">{activity!.avg_hr ?? "—"}</div></div>
          <div><div className="label">Under {settings.hr_cap}</div><div className="v ink-accent">{underPct != null ? `${underPct}%` : "—"}</div></div>
          <div><div className="label">Run : Walk</div><div className="v">{ratio(activity!.run_s, activity!.walk_s)}</div></div>
        </section>
      ) : (
        <section className="datagrid" aria-label="Run details">
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} style={{ fontSize: 14 }} />
          </div>
          <div>
            <label className="label" htmlFor="dist">Distance ({u})</label>
            <input id="dist" inputMode="decimal" placeholder="3.4" value={dist} onChange={(e) => setDist(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="dur">Time</label>
            <input id="dur" inputMode="numeric" placeholder="42:16" value={dur} onChange={(e) => setDur(e.target.value)} />
          </div>
          <div>
            <span className="label">Pace</span>
            <div className="v">{pace(dist ? toMeters(Number(dist), u) : null, dur ? parseClock(dur) : null, u)}</div>
          </div>
          <div>
            <label className="label" htmlFor="hr">Avg HR</label>
            <input id="hr" inputMode="numeric" placeholder="136" value={hr} onChange={(e) => setHr(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="elev">Climb (ft)</label>
            <input id="elev" inputMode="numeric" placeholder="187" value={elevFt} onChange={(e) => setElevFt(e.target.value)} />
          </div>
        </section>
      )}

      <div className="section">
        <fieldset>
          <legend>Grade this run</legend>
          <div className="grades">
            {GRADES.map((g) => (
              <button key={g.id} type="button" className={g.id} aria-pressed={grade === g.id} onClick={() => setGrade(grade === g.id ? null : g.id)}>
                {g.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend style={{ display: "flex", gap: 8 }}>
            Effort (RPE) <span className="muted" style={{ fontWeight: 400 }}>1 = stroll · 10 = all-out</span>
          </legend>
          <div className="rpe">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" aria-label={`RPE ${n}`} aria-pressed={rpe === n} onClick={() => setRpe(rpe === n ? null : n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Intent</legend>
          <div className="chips">
            {INTENTS.map((i) => (
              <button key={i.id} type="button" aria-pressed={intent === i.id} onClick={() => setIntent(intent === i.id ? null : i.id)}>
                {i.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Also today</legend>
          <div className="checks">
            {SUPPLEMENT_KEYS.map((k) => (
              <label key={k}>
                <input type="checkbox" checked={supps[k]} onChange={(e) => setSupps({ ...supps, [k]: e.target.checked })} />
                {SUPPLEMENT_LABELS[k]}
              </label>
            ))}
            {settings.show_bjj && (
              <label className="bjj" title="From your BJJ Tracker">
                <input type="checkbox" checked={bjjToday} disabled readOnly />
                BJJ
              </label>
            )}
          </div>
        </fieldset>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="flabel" style={{ margin: 0 }}>Notes</span>
          <textarea className="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How it went, what you noticed." />
        </label>

        {error && <p className="err" role="alert" style={{ margin: 0 }}>{error}</p>}

        <button className="primary" type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save entry"}
        </button>
        {activity && (
          <button className="ghost danger" type="button" onClick={remove} disabled={saving} style={{ alignSelf: "flex-start" }}>
            {confirmDelete ? "Tap again to delete" : "Delete this run"}
          </button>
        )}
      </div>
    </main>
  );
}
