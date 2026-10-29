import { ChevronRight, Plane, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { INTERNAL_SCRIPT, useSetupState } from "../setup";
import { useHass } from "../ha/HassContext";
import { Toggle } from "../components/ui";
import { House } from "../components/House";
import { StatusLine } from "../components/feedback";
import { fmtState, fmtTemp, name } from "../format";

const REGELUNGEN = ["Jotunland AC THOR", "Jotunland Heizung", "Jotunland Wallbox"];

function TabCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`tabcard ${className}`}>
      <h2 className="tabcard-tab">{title}</h2>
      <div className="tabcard-body">{children}</div>
    </section>
  );
}


export function Overview() {
  const { entities, decisions, callService } = useHass();
  const away = entities["input_boolean.jotunland_abwesend"];
  const setup = useSetupState();
  const scripts = Object.values(entities).filter((e) => e.entity_id.startsWith("script.jotunland_") && !INTERNAL_SCRIPT.test(e.entity_id));
  const weather = Object.values(entities).find((e) => e.entity_id.startsWith("weather.") && typeof e.attributes.temperature === "number");
  const date = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <p className="eyebrow">{date}{weather && ` · ${fmtState(weather)}, ${fmtTemp(Number(weather.attributes.temperature))}`}</p>
          <h1>Haus</h1>
        </div>
        {away && (
          <label className={`away ${away.state === "on" ? "on" : ""}`}>
            <Plane size={16} /> <span className="away-label">Abwesend</span>
            <Toggle on={away.state === "on"} label="Abwesend" onChange={(v) => callService("input_boolean", v ? "turn_on" : "turn_off", { entity_id: away.entity_id })} />
          </label>
        )}
      </header>

      {setup.open > 0 && (
        <a className="setup-banner" href="#/einrichtung">
          <Sparkles size={18} />
          <span>
            <strong>Einrichtung abschließen</strong> – noch {setup.open} {setup.open === 1 ? "Schritt" : "Schritte"}
          </span>
          <ChevronRight size={18} />
        </a>
      )}

      <TabCard title="Jetzt">
        <House />
      </TabCard>

      <div className="grid">
        {REGELUNGEN.some((r) => decisions[r]) && (
          <TabCard title="Regelungen">
            {REGELUNGEN.map((r) => <StatusLine key={r} name={r} />)}
          </TabCard>
        )}
        {scripts.length > 0 && (
          <TabCard title="Schnellaktionen">
            <div className="quick">
              {scripts.map((s) => (
                <button key={s.entity_id} type="button" className={`quick-btn ${s.state === "on" ? "running" : ""}`} onClick={() => callService("script", "turn_on", { entity_id: s.entity_id })}>
                  {name(s)}
                </button>
              ))}
            </div>
          </TabCard>
        )}
      </div>
    </div>
  );
}
