"use client";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { loadActivities } from "@/lib/data";
import { addDays, parse, today, weekStart } from "@/lib/dates";
import { distance, hoursMinutes } from "@/lib/format";
import type { RunActivity, Settings } from "@/lib/types";

const WEEKS = 12;

export default function TrendsView({ settings, version }: { settings: Settings; version: number }) {
  const [runs, setRuns] = useState<RunActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const last = weekStart(today());
  const first = addDays(last, -7 * (WEEKS - 1));

  useEffect(() => {
    loadActivities(first, addDays(last, 6))
      .then(setRuns)
      .catch((e) => setError(e.message));
  }, [first, last, version]);

  const weeks = useMemo(
    () =>
      Array.from({ length: WEEKS }, (_, i) => {
        const ws = addDays(first, 7 * i);
        const rs = runs.filter((r) => r.grade !== "dnr" && weekStart(r.run_date) === ws);
        const secs = rs.reduce((t, r) => t + (r.duration_s ?? 0), 0);
        const meters = rs.reduce((t, r) => t + (r.distance_m ?? 0), 0);
        const graded = rs.filter((r) => r.grade);
        const quality = graded.filter((r) => r.grade === "excellent" || r.grade === "good").length;
        const d = parse(ws);
        return {
          ws,
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          hours: Math.round((secs / 3600) * 100) / 100,
          secs,
          meters,
          runs: rs.length,
          quality: graded.length ? Math.round((100 * quality) / graded.length) : null,
        };
      }),
    [runs, first],
  );

  const active = weeks.filter((w) => w.runs > 0);
  const consistent = (() => {
    let n = 0;
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i].runs >= 3) n++;
      else if (i === weeks.length - 1) continue; // current week may be in progress
      else break;
    }
    return n;
  })();

  return (
    <main>
      <header className="hdr ruled">
        <div className="hdr-top"><span>LAST {WEEKS} WEEKS</span></div>
        <h1 className="h1">Trends</h1>
      </header>
      {error && <p className="err" role="alert">{error}</p>}

      <section className="pair">
        <div>
          <div className="label">Weeks in a row, 3+ runs</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{consistent}</div>
        </div>
        <div>
          <div className="label">Avg week</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>
            {active.length ? hoursMinutes(active.reduce((t, w) => t + w.secs, 0) / active.length) : "—"}
          </div>
        </div>
      </section>

      <section style={{ padding: "16px 12px 8px" }} aria-label="Weekly time on feet">
        <div className="label" style={{ padding: "0 8px 8px" }}>Time on feet (hours)</div>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={weeks} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#555" }} tickLine={false} axisLine={{ stroke: "#111" }} interval={1} />
              <YAxis tick={{ fontSize: 10, fontFamily: "var(--mono)", fill: "#555" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "#f3f3f3" }}
                formatter={(v) => [`${v} h`, "Time"]}
                contentStyle={{ border: "1.5px solid #111", borderRadius: 0, fontFamily: "var(--mono)", fontSize: 12 }}
              />
              <Bar dataKey="hours" fill="var(--accent)" stroke="#111" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="entries" aria-label="Weekly table">
        <div className="mono label" style={{ display: "grid", gridTemplateColumns: "60px repeat(4, minmax(0, 1fr))", gap: 6, paddingBottom: 6, borderBottom: "1px solid var(--ink)" }}>
          <span>Week</span><span style={{ textAlign: "right" }}>Time</span><span style={{ textAlign: "right" }}>{settings.units}</span><span style={{ textAlign: "right" }}>Runs</span><span style={{ textAlign: "right" }}>Good+</span>
        </div>
        {[...weeks].reverse().map((w) => (
          <div key={w.ws} className="mono" style={{ display: "grid", gridTemplateColumns: "60px repeat(4, minmax(0, 1fr))", gap: 6, padding: "8px 0", borderBottom: "1px solid var(--rule)", fontSize: 13 }}>
            <span className="muted">{w.label}</span>
            <span style={{ textAlign: "right" }}>{w.runs ? hoursMinutes(w.secs) : "—"}</span>
            <span style={{ textAlign: "right" }}>{w.runs ? distance(w.meters, settings.units) : "—"}</span>
            <span style={{ textAlign: "right" }}>{w.runs || "—"}</span>
            <span style={{ textAlign: "right" }}>{w.quality != null ? `${w.quality}%` : "—"}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
