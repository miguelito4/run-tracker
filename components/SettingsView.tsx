"use client";
import { useEffect, useState } from "react";
import { ACCENTS, accentById } from "@/lib/accents";
import { loadActivities, loadCurrentLever, startLever } from "@/lib/data";
import { today, weekStart } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { Lever, LeverKind, Settings } from "@/lib/types";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onChanged: () => void;
}

const LEVERS: { id: LeverKind; label: string }[] = [
  { id: "hold", label: "Hold" },
  { id: "volume", label: "Volume ↑" },
  { id: "intensity", label: "Intensity ↑" },
];

export default function SettingsView({ settings, onChange, onChanged }: Props) {
  const current = accentById(settings.accent);
  const [hrCap, setHrCap] = useState(String(settings.hr_cap));
  const [lever, setLever] = useState<Lever | null>(null);
  const [newLever, setNewLever] = useState<LeverKind>("hold");
  const [newStart, setNewStart] = useState(weekStart(today()));
  const [newWeeks, setNewWeeks] = useState("3");
  const [newNote, setNewNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentLever().then(setLever).catch(() => {});
  }, []);

  const commitHrCap = () => {
    const n = Number(hrCap);
    if (Number.isInteger(n) && n >= 90 && n <= 200) onChange({ hr_cap: n });
    else setHrCap(String(settings.hr_cap));
  };

  const addBlock = async () => {
    try {
      await startLever({ lever: newLever, start_date: newStart, hold_weeks: Number(newWeeks) || 3, note: newNote.trim() || null });
      setLever(await loadCurrentLever());
      setNewNote("");
      setMsg("Block started.");
      onChanged();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const exportCsv = async () => {
    const rows = await loadActivities("1900-01-01", "2999-12-31");
    const cols = ["run_date", "title", "source", "distance_m", "duration_s", "avg_hr", "max_hr", "elev_gain_m", "under_cap_s", "run_s", "walk_s", "grade", "rpe", "intent", "notes"] as const;
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `runs-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <main>
      <header className="hdr ruled">
        <div className="hdr-top"><span>SETTINGS</span></div>
        <h1 className="h1">Your logbook</h1>
      </header>

      <section className="section" style={{ borderBottom: "1px solid var(--rule)", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="flabel" style={{ margin: 0 }}>Accent</span>
          <span className="mono muted" style={{ fontSize: 12 }}>{current.name}</span>
        </div>
        <div className="swatches" role="radiogroup" aria-label="Accent color">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={a.id === current.id}
              aria-label={a.name}
              onClick={() => onChange({ accent: a.id })}
              style={{ background: a.hex }}
            />
          ))}
        </div>
      </section>

      <section className="rows" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div>
          <span className="flabel" style={{ margin: 0 }}>Default view</span>
          <div className="seg" role="group" aria-label="Default mode">
            <button aria-pressed={settings.default_mode === "recreational"} onClick={() => onChange({ default_mode: "recreational" })}>Recreational</button>
            <button aria-pressed={settings.default_mode === "performance"} onClick={() => onChange({ default_mode: "performance" })}>Performance</button>
          </div>
        </div>
        <div>
          <label className="flabel" htmlFor="hrcap" style={{ margin: 0 }}>Easy heart-rate cap</label>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input id="hrcap" type="number" inputMode="numeric" min={90} max={200} value={hrCap} onChange={(e) => setHrCap(e.target.value)} onBlur={commitHrCap} style={{ width: 70, textAlign: "center" }} />
            <span className="muted" style={{ fontSize: 12 }}>bpm</span>
          </span>
        </div>
        <div>
          <span className="flabel" style={{ margin: 0 }}>Units</span>
          <div className="seg" role="group" aria-label="Units">
            <button aria-pressed={settings.units === "mi"} onClick={() => onChange({ units: "mi" })}>mi</button>
            <button aria-pressed={settings.units === "km"} onClick={() => onChange({ units: "km" })}>km</button>
          </div>
        </div>
        <div>
          <div>
            <div className="flabel" style={{ margin: 0 }}>BJJ Tracker</div>
            <div className="muted" style={{ fontSize: 12 }}>Show mat sessions on the week</div>
          </div>
          <input type="checkbox" aria-label="Show BJJ sessions" checked={settings.show_bjj} onChange={(e) => onChange({ show_bjj: e.target.checked })} style={{ width: 22, height: 22, accentColor: "var(--ink)", margin: 0 }} />
        </div>
        <div>
          <div>
            <div className="flabel" style={{ margin: 0 }}>Garmin</div>
            <div className="mono muted" style={{ fontSize: 11 }}>Not connected yet. Manual entry for now.</div>
          </div>
        </div>
      </section>

      <section className="section" style={{ borderBottom: "1px solid var(--rule)", gap: 12 }} aria-label="One-lever block">
        <div>
          <div className="flabel" style={{ margin: 0 }}>One-lever block</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {lever
              ? `Current: ${LEVERS.find((l) => l.id === lever.lever)?.label}, ${lever.hold_weeks} weeks from ${lever.start_date}.`
              : "None yet."}
          </div>
        </div>
        <div className="seg" role="group" aria-label="Lever" style={{ alignSelf: "flex-start" }}>
          {LEVERS.map((l) => (
            <button key={l.id} aria-pressed={newLever === l.id} onClick={() => setNewLever(l.id)}>{l.label}</button>
          ))}
        </div>
        <div className="rows" style={{ margin: "0 -20px" }}>
          <div>
            <label className="flabel" htmlFor="lstart" style={{ margin: 0 }}>Starts</label>
            <input id="lstart" type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
          </div>
          <div>
            <label className="flabel" htmlFor="lweeks" style={{ margin: 0 }}>Hold for</label>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input id="lweeks" type="number" min={1} max={12} value={newWeeks} onChange={(e) => setNewWeeks(e.target.value)} style={{ width: 70, textAlign: "center" }} />
              <span className="muted" style={{ fontSize: 12 }}>weeks</span>
            </span>
          </div>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="flabel" style={{ margin: 0 }}>Note <span className="muted" style={{ fontWeight: 400 }}>optional</span></span>
          <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="~3 hours a week, all under 140" style={{ height: 40, border: "1px solid var(--line)", padding: "0 10px", borderRadius: 0 }} />
        </label>
        <button className="ghost" type="button" onClick={addBlock} style={{ alignSelf: "flex-start", minHeight: 44 }}>Start block</button>
        {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
      </section>

      <section className="entries" style={{ paddingTop: 4 }}>
        <button className="entry" type="button" onClick={exportCsv}><span className="t">Export CSV</span><span className="mono">→</span></button>
        <button className="entry" type="button" onClick={signOut} style={{ borderBottom: 0 }}><span className="t">Sign out</span><span className="mono">→</span></button>
      </section>
    </main>
  );
}
