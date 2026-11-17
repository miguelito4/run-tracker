"use client";
import { useEffect, useMemo, useState } from "react";
import { loadActivities, loadBjj, loadCurrentLever, loadSupplements } from "@/lib/data";
import { addDays, daysBetween, fmtRange, today, weekDays, weekStart, weekdayShort } from "@/lib/dates";
import { distance, hoursMinutes } from "@/lib/format";
import {
  GRADES,
  INTENTS,
  SUPPLEMENT_KEYS,
  SUPPLEMENT_LABELS,
  type BjjSession,
  type Lever,
  type Mode,
  type RunActivity,
  type Settings,
  type Supplements,
} from "@/lib/types";

interface Props {
  settings: Settings;
  version: number;
  onOpen: (a: RunActivity) => void;
}

const sum = (xs: (number | null | undefined)[]) => xs.reduce<number>((t, x) => t + (x ?? 0), 0);

export default function WeekView({ settings, version, onOpen }: Props) {
  const [start, setStart] = useState(() => weekStart(today()));
  const [modeOverride, setMode] = useState<Mode | null>(null);
  const mode = modeOverride ?? settings.default_mode;
  const [runs, setRuns] = useState<RunActivity[]>([]);
  const [prevRuns, setPrevRuns] = useState<RunActivity[]>([]);
  const [supps, setSupps] = useState<Supplements[]>([]);
  const [bjj, setBjj] = useState<BjjSession[]>([]);
  const [lever, setLever] = useState<Lever | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const end = addDays(start, 6);
    const prevStart = addDays(start, -7);
    Promise.all([
      loadActivities(prevStart, end),
      loadSupplements(start, end),
      settings.show_bjj ? loadBjj(start, end) : Promise.resolve([]),
      loadCurrentLever(),
    ])
      .then(([acts, s, b, l]) => {
        setRuns(acts.filter((a) => a.run_date >= start));
        setPrevRuns(acts.filter((a) => a.run_date < start));
        setSupps(s);
        setBjj(b);
        setLever(l);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [start, version, settings.show_bjj]);

  const days = weekDays(start);
  const t = today();
  const ran = runs.filter((r) => r.grade !== "dnr");

  const stats = useMemo(() => {
    const time = sum(ran.map((r) => r.duration_s));
    const prevTime = sum(prevRuns.filter((r) => r.grade !== "dnr").map((r) => r.duration_s));
    const dist = sum(ran.map((r) => r.distance_m));
    const capped = ran.filter((r) => r.under_cap_s != null && r.duration_s);
    const underPct = capped.length
      ? Math.round((100 * sum(capped.map((r) => r.under_cap_s))) / sum(capped.map((r) => r.duration_s)))
      : null;
    const hrRuns = ran.filter((r) => r.avg_hr && r.duration_s);
    const avgHr = hrRuns.length
      ? Math.round(sum(hrRuns.map((r) => r.avg_hr! * r.duration_s!)) / sum(hrRuns.map((r) => r.duration_s)))
      : null;
    const easyIds = new Set(INTENTS.filter((i) => i.easy).map((i) => i.id));
    const intentTimed = ran.filter((r) => r.intent && r.duration_s);
    const easyPct = intentTimed.length
      ? Math.round(
          (100 * sum(intentTimed.filter((r) => easyIds.has(r.intent!)).map((r) => r.duration_s))) /
            sum(intentTimed.map((r) => r.duration_s)),
        )
      : null;
    const zones: Record<string, number> = {};
    ran.forEach((r) => Object.entries(r.zone_s ?? {}).forEach(([k, v]) => (zones[k] = (zones[k] ?? 0) + v)));
    const grades = Object.fromEntries(GRADES.map((g) => [g.id, runs.filter((r) => r.grade === g.id).length]));
    return { time, prevTime, dist, underPct, avgHr, easyPct, zones, grades };
  }, [ran, runs, prevRuns]);

  const suppCounts = SUPPLEMENT_KEYS.map((k) => ({ k, n: supps.filter((s) => s[k]).length })).filter((x) => x.n);
  const delta = stats.time - stats.prevTime;
  const graded = stats.grades.excellent + stats.grades.good + stats.grades.flat + stats.grades.reduced;

  // one-lever progress
  const leverWeek = lever ? Math.floor(daysBetween(lever.start_date, start) / 7) + 1 : 0;
  const leverDone = lever ? leverWeek > lever.hold_weeks : false;

  return (
    <main>
      <header className="hdr">
        <div className="hdr-top">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="ghost" aria-label="Previous week" onClick={() => setStart(addDays(start, -7))} style={{ minHeight: 32, padding: "0 8px" }}>←</button>
            {fmtRange(start)}
            <button className="ghost" aria-label="Next week" onClick={() => setStart(addDays(start, 7))} disabled={addDays(start, 7) > t} style={{ minHeight: 32, padding: "0 8px", opacity: addDays(start, 7) > t ? 0.3 : 1 }}>→</button>
          </span>
          <div className="seg" role="group" aria-label="Mode">
            <button aria-pressed={mode === "recreational"} onClick={() => setMode("recreational")}>Recreational</button>
            <button aria-pressed={mode === "performance"} onClick={() => setMode("performance")}>Performance</button>
          </div>
        </div>
        {mode === "recreational" ? (
          <div>
            <div className="label">Time on feet</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="big">{hoursMinutes(stats.time)}</span>
              {stats.prevTime > 0 && (
                <span className="mono ink-accent" style={{ fontSize: 13 }}>
                  {delta >= 0 ? "+" : "−"}{hoursMinutes(Math.abs(delta))}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="label">Distance</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="big">{distance(stats.dist, settings.units)}<span style={{ fontSize: 20, fontWeight: 600 }}> {settings.units}</span></span>
              <span className="mono muted" style={{ fontSize: 13 }}>{hoursMinutes(stats.time)} · {ran.length} runs</span>
            </div>
          </div>
        )}
      </header>

      {error && <p className="err" role="alert">{error}</p>}

      <section className="days" aria-label="Days">
        {days.map((d) => {
          const dayRuns = runs.filter((r) => r.run_date === d);
          const dayBjj = bjj.filter((b) => b.session_date === d);
          const g = dayRuns[0]?.grade;
          const gd = GRADES.find((x) => x.id === g);
          return (
            <div key={d} className={d === t ? "today" : undefined}>
              <span className="mono muted" style={{ fontSize: 11 }}>{weekdayShort(d).slice(0, 2)}</span>
              {dayRuns.length > 0 && (
                <button
                  className={`stamp ${g ?? "none"}`}
                  onClick={() => onOpen(dayRuns[0])}
                  aria-label={`${weekdayShort(d)} run${gd ? `, ${gd.label}` : ", not graded"}`}
                >
                  {gd?.short ?? "?"}
                </button>
              )}
              {dayRuns.length > 0 && (
                <span className="mono" style={{ fontSize: 11 }}>
                  {distance(sum(dayRuns.map((r) => r.distance_m)), settings.units)}
                  {dayRuns.length > 1 ? `×${dayRuns.length}` : ""}
                </span>
              )}
              {dayBjj.length > 0 && <span className="bjjtag" title={dayBjj.map((b) => b.session_type).join(", ")}>BJJ</span>}
              {!dayRuns.length && !dayBjj.length && <span style={{ color: "var(--faint)" }}>—</span>}
            </div>
          );
        })}
      </section>

      {mode === "recreational" ? (
        <section className="pair">
          <div>
            <div className="label">Grade mix</div>
            <div className="mixbar" aria-hidden="true">
              {graded > 0 && (
                <>
                  <span style={{ flexGrow: stats.grades.excellent, background: "var(--accent)" }} />
                  <span style={{ flexGrow: stats.grades.good, background: "var(--ink)" }} />
                  <span style={{ flexGrow: stats.grades.flat, background: "var(--faint)" }} />
                  <span style={{ flexGrow: stats.grades.reduced, background: "var(--line)" }} />
                </>
              )}
            </div>
            <div style={{ fontSize: 13 }}>
              {graded ? `${stats.grades.excellent} excellent · ${stats.grades.good} good · ${stats.grades.flat} flat` : "No graded runs yet"}
            </div>
          </div>
          <div>
            <div className="label">Under {settings.hr_cap} bpm</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{stats.underPct != null ? `${stats.underPct}%` : "—"}</div>
            <div className="muted" style={{ fontSize: 13 }}>{stats.underPct != null ? "of running time" : "fills in from Garmin"}</div>
          </div>
        </section>
      ) : (
        <section className="pair">
          <div>
            <div className="label">Easy share</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{stats.easyPct != null ? `${stats.easyPct}%` : "—"}</div>
            <div className="muted" style={{ fontSize: 13 }}>of run time, by intent</div>
          </div>
          <div>
            <div className="label">Avg HR</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{stats.avgHr ?? "—"}</div>
            <div className="muted" style={{ fontSize: 13 }}>{stats.underPct != null ? `${stats.underPct}% under ${settings.hr_cap}` : "time-weighted"}</div>
          </div>
        </section>
      )}

      <section className="card" aria-label="One lever">
        <div className="card-head">
          <span className="card-title">One lever</span>
          {lever && (
            <span className="mono" style={{ fontSize: 12 }}>
              {lever.lever.toUpperCase()} · {leverDone ? "HOLD DONE" : `WK ${Math.max(leverWeek, 1)} OF ${lever.hold_weeks}`}
            </span>
          )}
        </div>
        {lever ? (
          <>
            <div className="ticks" style={{ gridTemplateColumns: `repeat(${lever.hold_weeks}, minmax(0, 1fr))` }}>
              {Array.from({ length: lever.hold_weeks }, (_, i) => (
                <span key={i} className={i < leverWeek ? "on" : undefined} />
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>
              {leverDone
                ? "Hold complete. Change one thing now: a bit more time, or a bit faster. Not both."
                : lever.lever === "hold"
                  ? "Hold steady. Same time and same effort until the block ends."
                  : lever.lever === "volume"
                    ? "Adding volume. Keep intensity where it is."
                    : "Adding intensity. Keep volume where it is."}
              {lever.note ? ` ${lever.note}` : ""}
            </p>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>
            No block set. Start one in Settings: hold a load for three weeks, then change one thing.
          </p>
        )}
      </section>

      {suppCounts.length > 0 && (
        <p className="muted" style={{ margin: "0 20px 12px", fontSize: 13 }}>
          Also this week: {suppCounts.map((x) => `${SUPPLEMENT_LABELS[x.k]} ${x.n}`).join(" · ")}
          {bjj.length ? ` · BJJ ${bjj.length}` : ""}
        </p>
      )}

      <section className="entries" aria-label="Entries">
        <div className="label" style={{ paddingBottom: 6, borderBottom: "1px solid var(--ink)" }}>Entries</div>
        {runs.length === 0 && <p className="empty" style={{ padding: "12px 0" }}>No runs logged this week.</p>}
        {runs.map((r) => {
          const gd = GRADES.find((x) => x.id === r.grade);
          const intent = INTENTS.find((i) => i.id === r.intent)?.label;
          return (
            <button key={r.id} className="entry" onClick={() => onOpen(r)}>
              <span className={`stamp ${r.grade ?? "none"}`} aria-hidden="true">{gd?.short ?? "?"}</span>
              <span className="t">
                {weekdayShort(r.run_date)} · {r.title || intent || "Run"}
                {!r.grade && <span className="ink-accent" style={{ fontWeight: 500 }}> · grade it</span>}
              </span>
              <span className="mono muted" style={{ fontSize: 12 }}>
                {distance(r.distance_m, settings.units)} · {hoursMinutes(r.duration_s)}
              </span>
            </button>
          );
        })}
      </section>
    </main>
  );
}
