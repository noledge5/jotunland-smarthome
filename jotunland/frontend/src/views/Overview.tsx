import { AppWindow, BatteryMedium, Car, ChevronRight, Droplets, Flame, Home, Plane, Sparkles, Sun, Thermometer, UtilityPole, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { INTERNAL_SCRIPT, useSetupState } from "../setup";
import { useEntity, useHass } from "../ha/HassContext";
import { Card, Empty, Toggle } from "../components/ui";
import { EnergyFlow, useEnergy } from "../components/EnergyFlow";
import { AcThorCard, PelletCard, WallboxCard } from "../components/systems";
import { StatusLine } from "../components/feedback";
import { fmtNum, fmtPower, fmtTarget, fmtTemp, name, num } from "../format";

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend";
}

function NowItem({ icon: Icon, label, value, sub, tone, live }: { icon: LucideIcon; label: string; value: string; sub?: string; tone: string; live?: boolean }) {
  return (
    <div className={`now-item ${live ? "live" : ""}`} data-tone={tone}>
      <span className="now-label"><Icon size={14} /> {label}</span>
      <span className="now-value">{value}</span>
      {sub && <span className="now-sub">{sub}</span>}
    </div>
  );
}

/** Auf einen Blick: was gerade läuft – zum Wischen auf dem Handy */
function NowStrip() {
  const n = useEnergy();
  const water = useEntity("acthor.temperature");
  const items: { icon: LucideIcon; label: string; value: string; sub?: string; tone: string; live?: boolean }[] = [];
  if (n.pv !== undefined) items.push({ icon: Sun, label: "Solar", value: fmtPower(n.pv), tone: "sun", live: n.pv > 50 });
  if (n.house !== undefined) items.push({ icon: Home, label: "Haus", value: fmtPower(n.house), tone: "accent" });
  if (n.batterySoc !== undefined || n.battery !== undefined) {
    const b = n.battery ?? 0;
    items.push({ icon: BatteryMedium, label: "Batterie", value: n.batterySoc === undefined ? fmtPower(Math.abs(b)) : `${fmtNum(n.batterySoc, 0)} %`, sub: Math.abs(b) <= 20 ? "ruht" : b > 0 ? `entlädt ${fmtPower(b)}` : `lädt ${fmtPower(-b)}`, tone: "battery", live: Math.abs(b) > 20 });
  }
  if (n.grid !== undefined) items.push({ icon: UtilityPole, label: "Netz", value: fmtPower(Math.abs(n.grid)), sub: Math.abs(n.grid) <= 20 ? "ausgeglichen" : n.grid > 0 ? "Bezug" : "Einspeisung", tone: "grid" });
  if (n.wallbox !== undefined) items.push({ icon: Car, label: "Wallbox", value: fmtPower(n.wallbox), sub: n.wallbox > 100 ? "lädt" : "bereit", tone: "bolt", live: n.wallbox > 100 });
  if (water || n.acthor !== undefined) items.push({ icon: Droplets, label: "Warmwasser", value: fmtTemp(num(water)), sub: (n.acthor ?? 0) > 50 ? `heizt ${fmtPower(n.acthor)}` : "aus", tone: "water", live: (n.acthor ?? 0) > 50 });
  if (!items.length) return null;
  return (
    <div className="now" role="list" aria-label="Jetzt">
      {items.map((i) => <NowItem key={i.label} {...i} />)}
    </div>
  );
}

export function Overview() {
  const { entities, rooms, callService } = useHass();
  const away = entities["input_boolean.jotunland_abwesend"];
  const setup = useSetupState();
  const scripts = Object.values(entities).filter((e) => e.entity_id.startsWith("script.jotunland_") && !INTERNAL_SCRIPT.test(e.entity_id));

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1>{greeting()}</h1>
        </div>
        {away && (
          <label className={`away ${away.state === "on" ? "on" : ""}`}>
            <Plane size={16} /> <span className="away-label">Abwesend</span>
            <Toggle on={away.state === "on"} label="Abwesend" onChange={(v) => callService("input_boolean", v ? "turn_on" : "turn_off", { entity_id: away.entity_id })} />
          </label>
        )}
      </header>

      <NowStrip />

      {setup.open > 0 && (
        <a className="setup-banner" href="#/einrichtung">
          <Sparkles size={18} />
          <span>
            <strong>Einrichtung abschließen</strong> – noch {setup.open} {setup.open === 1 ? "Schritt" : "Schritte"}
          </span>
          <ChevronRight size={18} />
        </a>
      )}

      <div className="grid">
        <Card title="Räume" icon={Thermometer} tone="fire" action={<a className="link" href="#/heizung">Alle</a>}>
          {rooms.length === 0 ? (
            <Empty>Keine Thermostate gefunden.</Empty>
          ) : (
            <div className="room-tiles">
              {rooms.map((r) => {
                const c = entities[r.climate];
                const w = r.window ? entities[r.window] : undefined;
                if (!c) return null;
                const heating = c.attributes.hvac_action === "heating";
                const open = w?.state === "on";
                const Icon = open ? AppWindow : heating ? Flame : Thermometer;
                return (
                  <a key={r.climate} href="#/heizung" className={`room-tile ${heating ? "heating" : ""} ${open ? "window" : ""} ${c.state === "off" ? "off" : ""}`}>
                    <span className="room-tile-top">{r.name} <Icon size={15} /></span>
                    <strong>{fmtNum(c.attributes.current_temperature == null ? undefined : Number(c.attributes.current_temperature), 1)}°</strong>
                    <small>{open ? "Fenster offen" : c.state === "off" ? "aus" : `${heating ? "heizt auf" : "Soll"} ${fmtTarget(c.attributes)}`}</small>
                  </a>
                );
              })}
            </div>
          )}
          <StatusLine name="Jotunland Heizung" />
        </Card>

        <Card title="Energie jetzt" icon={Zap} tone="sun">
          <EnergyFlow />
        </Card>

        <WallboxCard />
        <AcThorCard />
        <PelletCard />

        {scripts.length > 0 && (
          <Card title="Schnellaktionen" icon={Home}>
            <div className="quick">
              {scripts.map((s) => (
                <button key={s.entity_id} type="button" className={`quick-btn ${s.state === "on" ? "running" : ""}`} onClick={() => callService("script", "turn_on", { entity_id: s.entity_id })}>
                  {name(s)}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
