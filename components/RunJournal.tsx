"use client";
import { useCallback, useEffect, useState } from "react";
import { applyAccent } from "@/lib/accents";
import { loadSettings, saveSettings } from "@/lib/data";
import { DEFAULT_SETTINGS, type RunActivity, type Settings } from "@/lib/types";
import WeekView from "./WeekView";
import LogView from "./LogView";
import TrendsView from "./TrendsView";
import SettingsView from "./SettingsView";

type Tab = "week" | "trends" | "log" | "settings";

export default function RunJournal() {
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("action") === "log" ? "log" : "week",
  );
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [editing, setEditing] = useState<RunActivity | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings()
      .then((s) => {
        setSettings(s);
        applyAccent(s.accent);
      })
      .catch((e) => setError(e.message));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    if (patch.accent) applyAccent(patch.accent);
    try {
      await saveSettings(patch);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const openLog = (a: RunActivity | null) => {
    setEditing(a);
    setTab("log");
    window.scrollTo(0, 0);
  };

  const done = () => {
    setEditing(null);
    setVersion((v) => v + 1);
    setTab("week");
    window.scrollTo(0, 0);
  };

  return (
    <div className="app">
      {error && <p className="err" role="alert">{error}</p>}
      {tab === "week" && <WeekView settings={settings} version={version} onOpen={openLog} />}
      {tab === "trends" && <TrendsView settings={settings} version={version} />}
      {tab === "log" && <LogView key={editing?.id ?? "new"} settings={settings} activity={editing} onDone={done} />}
      {tab === "settings" && <SettingsView settings={settings} onChange={updateSettings} onChanged={() => setVersion((v) => v + 1)} />}

      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          <button aria-current={tab === "week" ? "page" : undefined} onClick={() => setTab("week")}>Week</button>
          <button aria-current={tab === "trends" ? "page" : undefined} onClick={() => setTab("trends")}>Trends</button>
          <button className="log" aria-current={tab === "log" ? "page" : undefined} onClick={() => openLog(null)}>+ Log</button>
          <button aria-current={tab === "settings" ? "page" : undefined} onClick={() => setTab("settings")}>Settings</button>
        </div>
      </nav>
    </div>
  );
}
