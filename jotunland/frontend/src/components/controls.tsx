import { useEffect, useRef, useState } from "react";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import {
  AppWindow, Battery, Blinds, Droplet, Flame, Gauge, Lightbulb, Minus, Play, Plug, Plus, Power, Snowflake, Thermometer, ToggleRight, Wind,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useHass } from "../ha/HassContext";
import { fmtNum, fmtState, fmtTarget, fmtTemp, name, relTime, unavailable } from "../format";
import { Badge, Chips, Slider, Toggle } from "./ui";
import { Fb, useConfirm, WAIT } from "./feedback";

const HVAC_LABEL: Record<string, string> = { heat: "Heizen", auto: "Auto", off: "Aus", cool: "Kühlen", heat_cool: "Auto", dry: "Trocknen", fan_only: "Lüfter" };

/** Thermostat mit ±-Tasten. Änderungen werden gesammelt und nach kurzer Pause gesendet. */
export function Thermostat({ entity, title, windowSensor, humidity }: { entity: HassEntity; title?: string; windowSensor?: HassEntity; humidity?: HassEntity }) {
  const { entities } = useHass();
  const fbT = useConfirm<number>();
  const fbM = useConfirm<string>();
  const id = entity.entity_id;
  const a = entity.attributes;
  const step = Number(a.target_temp_step ?? 0.5);
  const min = Number(a.min_temp ?? 5);
  const max = Number(a.max_temp ?? 30);
  const serverTarget = a.temperature === undefined || a.temperature === null ? undefined : Number(a.temperature);
  // draft: noch nicht gesendet (Tasten werden gesammelt), danach wartet fbT auf das Thermostat
  const [draft, setDraft] = useState<number>();
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const target = draft ?? (fbT.sending ? fbT.value : serverTarget);

  const change = (delta: number) => {
    const next = Math.min(max, Math.max(min, Math.round(((target ?? 20) + delta) / step) * step));
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setDraft(undefined);
      fbT.send(next, (e) => Number(e[id]?.attributes.temperature) === next, WAIT.thermostat, "climate", "set_temperature", { entity_id: id, temperature: next });
    }, 700);
  };

  const off = entity.state === "off";
  const heating = a.hvac_action === "heating";
  const windowOpen = windowSensor?.state === "on";
  const modes = ((a.hvac_modes as string[] | undefined) ?? []).filter((m) => HVAC_LABEL[m]);
  const battery = a.battery ?? a.battery_level;
  const blocked = !off ? undefined : windowOpen ? "Fenster offen" : entities["input_boolean.jotunland_sommerbetrieb"]?.state === "on" ? "Sommerbetrieb" : undefined;

  return (
    <div className={`thermo ${heating ? "heating" : ""} ${off ? "off" : ""}`}>
      <div className="thermo-head">
        <h3>{title ?? name(entity)}</h3>
        <div className="thermo-badges">
          {windowOpen && <Badge tone="info"><AppWindow size={12} /> Fenster offen</Badge>}
          {heating && <Badge tone="warn"><Flame size={12} /> heizt</Badge>}
          {battery !== undefined && Number(battery) < 25 && <Badge tone="bad"><Battery size={12} /> {String(battery)} %</Badge>}
          {unavailable(entity) && <Badge tone="bad">offline</Badge>}
        </div>
      </div>
      <div className="thermo-body">
        <div className="thermo-current">
          <span className="thermo-value">{fmtNum(a.current_temperature == null ? undefined : Number(a.current_temperature), 1)}</span>
          <span className="thermo-unit">°C</span>
          {humidity && <div className="thermo-hum"><Droplet size={12} /> {fmtState(humidity)}</div>}
        </div>
        <div className="thermo-target">
          <button type="button" className="round" aria-label="Kälter" disabled={off || unavailable(entity)} onClick={() => change(-step)}>
            <Minus size={18} />
          </button>
          <div className="thermo-set">
            <small>Soll</small>
            <strong className={fbT.sending ? "sending" : ""}>{off ? "Aus" : target === undefined ? fmtTarget(a) : fmtTemp(target)}</strong>
          </div>
          <button type="button" className="round" aria-label="Wärmer" disabled={off || unavailable(entity)} onClick={() => change(step)}>
            <Plus size={18} />
          </button>
        </div>
      </div>
      <Fb fb={{ sending: fbT.sending || fbM.sending, timedOut: fbT.timedOut || fbM.timedOut }} blocked={blocked} />
      {modes.length > 1 && (
        <Chips
          value={fbM.sending ? fbM.value : entity.state}
          options={modes.map((m) => ({ value: m, label: HVAC_LABEL[m] }))}
          onChange={(m) => fbM.send(m, (e) => e[id]?.state === m, WAIT.thermostat, "climate", "set_hvac_mode", { entity_id: id, hvac_mode: m })}
        />
      )}
    </div>
  );
}

type Wert = string | number | boolean;
export type Confirm = (v: Wert) => { check: (e: HassEntities) => boolean; ms: number };

/** Stimmt der gemeldete Zustand mit dem gesendeten Wert überein? */
function reached(e: HassEntity | undefined, v: Wert): boolean {
  if (!e) return false;
  if (typeof v === "boolean") return e.state === (v ? "on" : "off");
  if (typeof v === "number") return Number(e.state) === v;
  return e.state === v;
}

/**
 * Bedienelement für Helfer (input_*) und number-Entitäten – die "Stellschrauben" der Automationen.
 * `confirm` ersetzt die Rückmeldung (z. B. AC THOR: Leistung statt Sollwert), `blocked` zeigt eine Sperre.
 */
export function HelperControl({ entity, label, confirm, blocked }: { entity: HassEntity; label?: string; confirm?: Confirm; blocked?: string }) {
  const { callService } = useHass();
  const fb = useConfirm<Wert>();
  const id = entity.entity_id;
  const domain = id.split(".")[0];
  const a = entity.attributes;
  const title = label ?? name(entity);
  const shown = fb.sending ? fb.value : undefined;
  // Helfer bestätigt Home Assistant sofort, echte Geräte (number, switch, select) brauchen länger
  const set = (v: Wert, service: string, data: Record<string, unknown>) => {
    const c = confirm?.(v) ?? { check: (e: HassEntities) => reached(e[id], v), ms: domain.startsWith("input_") ? WAIT.schalter : WAIT.thermostat };
    return fb.send(v, c.check, c.ms, domain, service, { entity_id: id, ...data });
  };

  let control: React.ReactNode = <span className="muted">{fmtState(entity)}</span>;
  if (domain === "input_boolean" || domain === "switch") {
    control = <Toggle on={typeof shown === "boolean" ? shown : entity.state === "on"} busy={fb.sending} label={title} onChange={(v) => set(v, v ? "turn_on" : "turn_off", {})} />;
  } else if (domain === "input_number" || domain === "number") {
    const min = Number(a.min ?? 0);
    const max = Number(a.max ?? 100);
    const step = Number(a.step ?? 1);
    const unit = a.unit_of_measurement ? ` ${a.unit_of_measurement}` : "";
    control = (
      <Slider
        value={typeof shown === "number" ? shown : Number(entity.state)}
        min={min}
        max={max}
        step={step}
        format={(v) => `${fmtNum(v, step < 1 ? 1 : 0)}${unit}`}
        onCommit={(v) => set(v, "set_value", { value: v })}
      />
    );
  } else if (domain === "input_select" || domain === "select") {
    const options = (a.options as string[]) ?? [];
    control = <Chips value={typeof shown === "string" ? shown : entity.state} options={options.map((o) => ({ value: o, label: o }))} onChange={(o) => set(o, "select_option", { option: o })} />;
  } else if (domain === "input_datetime" && a.has_time && !a.has_date) {
    control = (
      <input
        type="time"
        className="input time"
        value={entity.state.slice(0, 5)}
        onChange={(ev) => ev.target.value && callService("input_datetime", "set_datetime", { entity_id: id, time: `${ev.target.value}:00` })}
      />
    );
  } else if (domain === "script" || domain === "input_button" || domain === "button") {
    control = (
      <button type="button" className="btn" onClick={() => callService(domain, domain === "script" ? "turn_on" : "press", { entity_id: id })}>
        <Play size={14} /> Start
      </button>
    );
  }

  const wide = domain === "input_select" || domain === "select" || domain === "input_number" || domain === "number";
  return (
    <div className={`helper ${wide ? "wide" : ""}`}>
      <span className="helper-label">
        {title} <Fb fb={fb} blocked={blocked} />
      </span>
      {control}
    </div>
  );
}

function iconFor(e: HassEntity): LucideIcon {
  const d = e.entity_id.split(".")[0];
  const dc = e.attributes.device_class;
  if (d === "light") return Lightbulb;
  if (d === "switch") return dc === "outlet" || /steckdose|plug/i.test(e.entity_id) ? Plug : Power;
  if (d === "cover") return Blinds;
  if (d === "climate") return Thermometer;
  if (d === "fan") return Wind;
  if (dc === "temperature") return Thermometer;
  if (dc === "humidity" || dc === "moisture") return Droplet;
  if (dc === "window" || dc === "door" || dc === "opening") return AppWindow;
  if (dc === "power" || dc === "energy") return Gauge;
  if (dc === "battery") return Battery;
  if (d === "input_boolean") return ToggleRight;
  return Snowflake;
}

/** Kachel für die Geräteübersicht: bedienbar, wo sinnvoll, sonst Anzeige. */
export function EntityTile({ entity, onRename }: { entity: HassEntity; onRename?: () => void }) {
  const { callService } = useHass();
  const fb = useConfirm<boolean>();
  const dim = useConfirm<number>();
  const id = entity.entity_id;
  const d = id.split(".")[0];
  const Icon = iconFor(entity);
  const on = ["on", "open", "heat", "auto"].includes(entity.state);
  const toggleable = ["light", "switch", "input_boolean", "fan"].includes(d);
  const dimmable = d === "light" && ((entity.attributes.supported_color_modes as string[] | undefined) ?? []).some((m) => m !== "onoff");

  return (
    <div className={`tile ${on ? "on" : ""} ${unavailable(entity) ? "unavail" : ""}`} data-domain={d}>
      <div className="tile-top">
        <span className="tile-icon"><Icon size={18} /></span>
        <div className="tile-text">
          <button type="button" className="tile-name" onClick={onRename} title={id}>{name(entity)}</button>
          <span className="tile-state">
            {fmtState(entity)}{d === "light" && on && entity.attributes.brightness ? ` · ${Math.round((Number(entity.attributes.brightness) / 255) * 100)} %` : ""}{" "}
            <Fb fb={{ sending: fb.sending || dim.sending, timedOut: fb.timedOut || dim.timedOut }} />
          </span>
        </div>
        {toggleable && (
          <Toggle
            on={fb.sending ? !!fb.value : entity.state === "on"}
            busy={fb.sending}
            disabled={unavailable(entity)}
            label={name(entity)}
            onChange={(v) => fb.send(v, (e) => e[id]?.state === (v ? "on" : "off"), WAIT.schalter, d, v ? "turn_on" : "turn_off", { entity_id: id })}
          />
        )}
      </div>
      {dimmable && entity.state === "on" && (
        <Slider
          value={dim.sending ? dim.value! : Math.round((Number(entity.attributes.brightness ?? 255) / 255) * 100)}
          min={1}
          max={100}
          step={1}
          format={(v) => `${v} %`}
          // Lampen runden die Helligkeit auf 0–255 – ±2 % gilt als angekommen
          onCommit={(v) => dim.send(v, (e) => Math.abs((Number(e[id]?.attributes.brightness ?? 0) / 255) * 100 - v) <= 2, WAIT.schalter, "light", "turn_on", { entity_id: id, brightness_pct: v })}
        />
      )}
      {d === "cover" && (
        <div className="btn-row">
          <button type="button" className="btn small" onClick={() => callService("cover", "open_cover", { entity_id: id })}>Auf</button>
          <button type="button" className="btn small" onClick={() => callService("cover", "stop_cover", { entity_id: id })}>Stopp</button>
          <button type="button" className="btn small" onClick={() => callService("cover", "close_cover", { entity_id: id })}>Zu</button>
        </div>
      )}
      {(d === "sensor" || d === "binary_sensor") && <span className="tile-foot">{relTime(entity.last_changed)}</span>}
    </div>
  );
}
