import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import type { HassEntity } from "home-assistant-js-websocket";
import { Minus, Plus, X } from "lucide-react";
import { useEntity, useHass } from "../ha/HassContext";
import { fmtNum, fmtPower, fmtState, fmtTarget, fmtTemp, num, unavailable, watts } from "../format";
import { HelperControl } from "./controls";
import { useEnergy } from "./EnergyFlow";
import { Fb, useConfirm, WAIT } from "./feedback";
import { acThorLabel, useAcThor } from "./systems";

// ---------- Abbildung: Isometrie 2:1, x nach rechts unten, y nach links unten, z nach oben ----------
const W = 960, H = 580, OX = 390, OY = 110;
type V3 = [number, number, number];
const P = (x: number, y: number, z: number) => [OX + (x - y), OY + (x + y) / 2 - z];
const pt = (x: number, y: number, z: number) => P(x, y, z).map((n) => +n.toFixed(1)).join(",");
const poly = (cls: string, ps: V3[], attrs = "") => `<polygon class="${cls}" points="${ps.map((p) => pt(...p)).join(" ")}"${attrs}/>`;
// sichtbare Seiten eines Quaders: vorne (y=y1), rechts (x=x1), oben (z=z1)
const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, front = "part", right = "part shade", top = "part", attrs = "") =>
  poly(front, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], attrs) +
  poly(right, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], attrs) +
  poly(top, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], attrs);
const winFront = (y: number, x0: number, x1: number, z0: number, z1: number, attrs = "", cls = "part glass") =>
  poly(cls, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], attrs) +
  `<path class="stroke thin" d="M${pt((x0 + x1) / 2, y, z0)} L${pt((x0 + x1) / 2, y, z1)} M${pt(x0, y, (z0 + z1) / 2)} L${pt(x1, y, (z0 + z1) / 2)}"/>`;
const winRight = (x: number, y0: number, y1: number, z0: number, z1: number) =>
  poly("part glass", [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]]) + `<path class="stroke thin" d="M${pt(x, (y0 + y1) / 2, z0)} L${pt(x, (y0 + y1) / 2, z1)}"/>`;
// Dachneigung vorne: y 150 → 230 entspricht z 200 → 130
const roofZ = (y: number) => 200 - ((y - 150) * 70) / 80;
const panel = (x0: number, x1: number, y0: number, y1: number, on: string) =>
  poly(`part${on}`, [[x0, y1, roofZ(y1) + 2], [x1, y1, roofZ(y1) + 2], [x1, y0, roofZ(y0) + 2], [x0, y0, roofZ(y0) + 2]], ` data-tone="sun"`);
const cyl = (x: number, y: number, z0: number, z1: number, r: number, cls: string) => {
  const [cx, b] = P(x, y, z0), t = P(x, y, z1)[1], rx = r * 1.2, ry = r * 0.6;
  return `<path class="${cls}" data-tone="heat" d="M${cx - rx} ${t} V${b} A${rx} ${ry} 0 0 0 ${cx + rx} ${b} V${t}"/><ellipse class="${cls}" data-tone="heat" cx="${cx}" cy="${t}" rx="${rx}" ry="${ry}"/>`;
};
const dot = (x: number, y: number, z: number, r: number, cls: string, attrs = "") => {
  const [cx, cy] = P(x, y, z);
  return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}"${attrs}/>`;
};

/** Leistungen in W: bat + = Entladen, grid + = Bezug */
interface ArtState { pv: number; bat: number; tank: number; car: number; grid: number; room: boolean; plugged: boolean }

// Energie wandert als Punkte durch die Leitung, schneller bei mehr Leistung. Pfad in Richtung des Flusses, `rev` dreht um.
// Der SVG-Text hängt nur an diesen Stufen – React tauscht das SVG nur, wenn sich eine Stufe ändert, die Punkte laufen sonst weiter.
const live = (w: number) => Math.abs(w) >= 50;
const speed = (w: number) => (w < 500 ? 2.4 : w < 2000 ? 1.4 : w < 5000 ? 0.9 : 0.6);
const flow = (d: string, tone: string, w: number, rev = false) => {
  if (!live(w)) return `<path class="wire" d="${d}"/>`;
  const a = ` d="${d}" style="animation-duration:${speed(Math.abs(w))}s"`;
  const r = rev ? " reverse" : "";
  return `<path class="wire" d="${d}"/><path class="dots${r}"${a}/><path class="dots fill${r}" data-tone="${tone}"${a}/>`;
};
// Zählerschrank: hier treffen sich alle Leitungen (rechts an der Hauswand)
const M = pt(352, 231, 70);

/** Das Haus als SVG-Text. Ein Bauteil bekommt `on` (Fläche in seiner Energieart), solange es arbeitet. */
function houseSvg(s: ArtState) {
  const on = (v: boolean | number) => ((typeof v === "number" ? live(v) : v) ? " on" : "");
  const rays = Array.from({ length: 8 }, (_, i) => {
    const c = Math.cos((i * Math.PI) / 4), si = Math.sin((i * Math.PI) / 4);
    return `<line x1="${(880 + 38 * c).toFixed(1)}" y1="${(72 + 38 * si).toFixed(1)}" x2="${(880 + 48 * c).toFixed(1)}" y2="${(72 + 48 * si).toFixed(1)}"/>`;
  }).join("");
  const panels = [[196, 222], [164, 190]].flatMap(([y0, y1]) => [[172, 210], [214, 252], [256, 294], [298, 336]].map(([x0, x1]) => panel(x0, x1, y0, y1, on(s.pv))));
  const car = ` data-tone="car"`;
  return [
    live(s.pv) ? `<g class="rays">${rays}</g>` : "",
    `<circle class="part${on(s.pv)}" data-tone="sun" cx="880" cy="72" r="30"/>`,
    `<path class="part" d="M70 96 a18 18 0 0 1 16 -26 a24 24 0 0 1 44 -6 a16 16 0 0 1 26 14 a14 14 0 0 1 -4 26 h-72 a12 12 0 0 1 -10 -8 Z"/>`,
    // Sockel mit Rasen, Weg und Einfahrt
    poly("part shade", [[520, 0, 0], [520, 340, 0], [520, 340, -14], [520, 0, -14]]),
    poly("part shade", [[0, 340, 0], [520, 340, 0], [520, 340, -14], [0, 340, -14]]),
    poly("part earth", [[0, 0, 0], [520, 0, 0], [520, 340, 0], [0, 340, 0]]),
    poly("part", [[20, 246, 0], [134, 246, 0], [134, 340, 0], [20, 340, 0]]),
    poly("part", [[180, 230, 0], [202, 230, 0], [202, 340, 0], [180, 340, 0]]),
    // Netzmast hinten rechts
    `<path class="stroke wide" d="M${pt(500, 20, 0)} L${pt(500, 20, 172)} M${pt(500, 6, 164)} L${pt(500, 34, 164)}"/>`,
    // Dach hinten, Wände, Fenster, Tür
    poly("part roof-shade", [[140, 150, 200], [370, 150, 200], [370, 58, 119.5], [140, 58, 119.5]]),
    poly("part", [[150, 230, 0], [360, 230, 0], [360, 230, 130], [150, 230, 130]]),
    poly("part shade", [[360, 70, 0], [360, 230, 0], [360, 230, 130], [360, 150, 200], [360, 70, 130]]),
    winFront(230, 180, 214, 78, 112),
    winFront(230, 250, 284, 78, 112, ` data-tone="heat"`, `part glass${on(s.room)}`),
    winFront(230, 312, 342, 78, 112),
    winFront(230, 240, 280, 24, 58),
    winFront(230, 304, 344, 24, 58),
    poly("part roof-shade", [[176, 230, 0], [206, 230, 0], [206, 230, 62], [176, 230, 62]]),
    winRight(360, 92, 128, 78, 108),
    winRight(360, 92, 128, 24, 54),
    // Schornstein (Pelletkessel)
    box(300, 318, 118, 136, 160, 232, "part", "part shade", "part roof-shade"),
    // Dach vorne mit PV
    poly("part roof", [[140, 150, 200], [370, 150, 200], [370, 242, 119.5], [140, 242, 119.5]]),
    ...panels,
    poly("part roof-shade", [[370, 150, 200], [370, 242, 119.5], [370, 242, 111.5], [370, 150, 192]]),
    poly("part roof-shade", [[370, 150, 200], [370, 58, 119.5], [370, 58, 111.5], [370, 150, 192]]),
    // Technik-Anbau, offen nach vorn: Batterie, Speicher mit Heizstab, Pelletkessel
    box(360, 480, 140, 230, 0, 84, "part", "part shade", "part earth"),
    poly("part roof-shade", [[372, 230, 6], [468, 230, 6], [468, 230, 72], [372, 230, 72]]),
    box(378, 390, 208, 224, 6, 58, `part${on(s.bat)}`, `part${on(s.bat)}`, `part${on(s.bat)}`, ` data-tone="battery"`),
    box(394, 406, 208, 224, 6, 58, `part${on(s.bat)}`, `part${on(s.bat)}`, `part${on(s.bat)}`, ` data-tone="battery"`),
    cyl(428, 216, 6, 66, 12, `part${on(s.tank)}`),
    box(446, 464, 206, 224, 6, 48),
    dot(455, 224, 26, 5, "part"),
    // Leitungen: Netz (Bezug zum Haus, Einspeisung zum Mast), PV vom Dach, Batterie, Heizstab, Wallbox
    flow(`M${pt(500, 20, 166)} Q${pt(440, 70, 120)} ${pt(360, 100, 122)}`, "grid", s.grid, s.grid < 0),
    flow(`M${pt(300, 242, 119)} Q${pt(352, 240, 112)} ${M}`, "sun", s.pv),
    flow(`M${M} Q${pt(372, 238, 72)} ${pt(392, 224, 40)}`, "battery", s.bat, s.bat > 0),
    flow(`M${M} Q${pt(404, 240, 84)} ${pt(428, 228, 50)}`, "heat", s.tank),
    flow(`M${M} L${pt(352, 236, 0)} L${pt(141, 236, 0)} L${pt(141, 266, 0)}`, "car", s.car),
    // Einfahrt: Wallbox-Säule und Auto
    box(136, 146, 266, 276, 0, 44, `part${on(s.car)}`, `part shade${on(s.car)}`, `part${on(s.car)}`, car),
    s.plugged ? `<path class="stroke" d="M${pt(141, 276, 30)} Q${pt(132, 296, 4)} ${pt(120, 280, 18)}"/>` : "",
    box(26, 124, 262, 298, 8, 26, `part${on(s.car)}`, `part shade${on(s.car)}`, `part${on(s.car)}`, car),
    poly("part glass", [[50, 298, 26], [104, 298, 26], [94, 298, 42], [62, 298, 42]]),
    poly(`part shade${on(s.car)}`, [[104, 266, 26], [104, 298, 26], [94, 298, 42], [94, 266, 42]], car),
    poly(`part${on(s.car)}`, [[62, 266, 42], [94, 266, 42], [94, 298, 42], [62, 298, 42]], car),
    `<path class="stroke thin" d="M${pt(78, 298, 26)} L${pt(78, 298, 42)}"/>`,
    dot(46, 298, 8, 9, "ink"),
    dot(104, 298, 8, 9, "ink"),
    dot(124, 290, 18, 3, "part"),
    // Baum hinten rechts, Busch vorn
    `<path class="stroke wide" d="M${pt(450, 40, 0)} V${P(450, 40, 46)[1]}"/>`,
    `<circle class="part leaf-shade" cx="${P(450, 40, 0)[0] + 12}" cy="${P(450, 40, 70)[1]}" r="26"/>`,
    `<circle class="part leaf" cx="${P(450, 40, 0)[0] - 8}" cy="${P(450, 40, 80)[1]}" r="30"/>`,
    `<circle class="part leaf" cx="${P(214, 330, 0)[0]}" cy="${P(214, 330, 10)[1]}" r="14"/>`,
    `<circle class="part leaf-shade" cx="${P(214, 330, 0)[0] + 16}" cy="${P(214, 330, 6)[1]}" r="10"/>`,
  ].join("");
}

// ---------- Schilder ----------
interface Pin { id: string; name: string; value: string; entity?: string; ctl?: ReactNode }
type Layout = Record<string, [number, number]>;

const at = (x: number, y: number): [number, number] => [+((x / W) * 100).toFixed(1), +((y / H) * 100).toFixed(1)];
// Standard auf dem Haus; der erste Raum sitzt am Fenster, das beim Heizen leuchtet
const DEFAULT_AT: Record<string, [number, number]> = {
  pv: at(240, 120), netz: at(850, 140), batterie: at(470, 470), warmwasser: at(690, 480), wallbox: at(150, 400), raum: at(420, 330),
};

/** Kompakte Solltemperatur −/+ für ein Thermostat im Schild */
function RoomStep({ entity }: { entity: HassEntity }) {
  const fb = useConfirm<number>();
  const id = entity.entity_id;
  const a = entity.attributes;
  const step = Number(a.target_temp_step ?? 0.5);
  const target = fb.sending ? fb.value : a.temperature == null ? undefined : Number(a.temperature);
  const off = entity.state === "off" || unavailable(entity) || target === undefined;
  const set = (d: number) => {
    const next = Math.min(Number(a.max_temp ?? 30), Math.max(Number(a.min_temp ?? 5), Math.round((target! + d) / step) * step));
    fb.send(next, (e) => Number(e[id]?.attributes.temperature) === next, WAIT.thermostat, "climate", "set_temperature", { entity_id: id, temperature: next });
  };
  return (
    <div className="helper">
      <span className="helper-label">Soll <Fb fb={fb} /></span>
      <span className="house-step">
        <button type="button" className="round sm" aria-label="Kälter" disabled={off} onClick={() => set(-step)}><Minus size={16} /></button>
        <b className={fb.sending ? "sending" : ""}>{off ? "Aus" : fmtTemp(target)}</b>
        <button type="button" className="round sm" aria-label="Wärmer" disabled={off} onClick={() => set(step)}><Plus size={16} /></button>
      </span>
    </div>
  );
}

const HELPER = (entities: Record<string, HassEntity>, id: string) => entities[id] && !unavailable(entities[id]) ? entities[id] : undefined;

/** Alle Werte, die es im Haus wirklich gibt – nie Beispielwerte. */
function usePins(): Pin[] {
  const { entities, mapping, rooms } = useHass();
  const n = useEnergy();
  const acthor = useAcThor();
  const thorTemp = useEntity("acthor.temperature");
  const thorPower = useEntity("acthor.power");
  const wbStatus = useEntity("wallbox.status");
  const wbPower = useEntity("wallbox.power");
  const wbMode = useEntity("wallbox.mode");
  const wbCurrent = useEntity("wallbox.current");
  const pellet = useEntity("pellet.state");
  const pelletOutside = useEntity("pellet.outside_temp");
  const pins: Pin[] = [];
  const kw = (w?: number) => fmtPower(w === undefined ? undefined : Math.abs(w));

  if (n.pv !== undefined) pins.push({ id: "pv", name: "PV", value: kw(n.pv), entity: mapping["energy.pv_power"] });
  if (n.grid !== undefined)
    pins.push({ id: "netz", name: Math.abs(n.grid) < 50 ? "Netz · ausgeglichen" : n.grid < 0 ? "Netz · Einspeisung" : "Netz · Bezug", value: kw(n.grid), entity: mapping["energy.grid"] });
  if (n.batterySoc !== undefined || n.battery !== undefined) {
    const b = n.battery ?? 0;
    pins.push({
      id: "batterie",
      name: b < -20 ? `Batterie · lädt ${kw(b)}` : b > 20 ? `Batterie · entlädt ${kw(b)}` : "Batterie",
      value: n.batterySoc === undefined ? kw(b) : `${fmtNum(n.batterySoc, 0)} %`,
      entity: mapping["energy.battery_soc"] ?? mapping["energy.battery_power"],
    });
  }
  if (thorTemp || thorPower) {
    const w = watts(thorPower) ?? 0;
    // im Schild nur die Schalter der Regelung; die Leistung nur, solange Handbetrieb an ist
    const ctl = acthor.controls.filter((c) =>
      c === acthor.handPower ? !!acthor.hand : (c.domain === "input_boolean" || c.domain.endsWith("select")) && /hand|manu|modus|mode|uberschuss|surplus/.test(c.own),
    );
    pins.push({
      id: "warmwasser",
      name: w > 50 ? `Warmwasser · ${fmtPower(w)}` : acthor.full ? "Warmwasser · voll" : "Warmwasser",
      value: thorTemp ? fmtTemp(num(thorTemp)) : fmtPower(w),
      entity: thorTemp?.entity_id ?? thorPower?.entity_id,
      ctl: ctl.length
        ? ctl.map((c) => (
            <HelperControl key={c.id} entity={c.entity} label={acThorLabel(c.name)} confirm={c === acthor.handPower ? acthor.powerConfirm : undefined} blocked={c === acthor.handPower && acthor.full ? "Speicher voll" : undefined} />
          ))
        : undefined,
    });
  }
  for (const r of rooms) {
    const c = entities[r.climate];
    if (!c) continue;
    const open = r.window ? entities[r.window]?.state === "on" : false;
    const cur = c.attributes.current_temperature;
    pins.push({
      id: `raum:${r.climate}`,
      name: `${r.name} · ${open ? "Fenster offen" : c.state === "off" ? "aus" : `${c.attributes.hvac_action === "heating" ? "heizt auf" : "Soll"} ${fmtTarget(c.attributes)}`}`,
      value: cur == null ? fmtState(c) : `${fmtNum(Number(cur), 1)} °C`,
      entity: r.climate,
      ctl: <RoomStep entity={c} />,
    });
  }
  if (wbStatus || wbPower || wbMode) {
    const w = watts(wbPower);
    const pv = wbMode && /pv/i.test(wbMode.state);
    pins.push({
      id: "wallbox",
      name: wbMode ? `Wallbox · ${wbMode.state}` : "Wallbox",
      // ohne Sensor der Wallbox selbst gibt es keine Zahl, nur den Zustand
      value: w !== undefined ? fmtPower(w) : wbStatus && !unavailable(wbStatus) ? fmtState(wbStatus) : "nicht verbunden",
      entity: wbMode?.entity_id ?? wbStatus?.entity_id ?? wbPower?.entity_id,
      ctl: wbMode ? (
        <>
          <HelperControl entity={wbMode} label="Lademodus" />
          {wbCurrent && !pv && <HelperControl entity={wbCurrent} label="Ladestrom" />}
        </>
      ) : undefined,
    });
  }
  const summer = HELPER(entities, "input_boolean.jotunland_sommerbetrieb");
  if (pellet || summer)
    pins.push({
      id: "pellet",
      name: "Pelletkessel",
      value: pellet && !unavailable(pellet) ? fmtState(pellet) : summer?.state === "on" ? "Sommerbetrieb" : "Heizbetrieb",
      entity: pellet?.entity_id ?? summer?.entity_id,
      ctl: summer ? <HelperControl entity={summer} label="Sommerbetrieb" /> : undefined,
    });
  if (n.consumption !== undefined) pins.push({ id: "verbrauch", name: "Verbrauch", value: kw(n.consumption), entity: mapping["energy.consumption"] });

  const weather = Object.values(entities).find((e) => e.entity_id.startsWith("weather.") && typeof e.attributes.temperature === "number");
  if (weather) pins.push({ id: "aussen", name: `Außen · ${fmtState(weather)}`, value: fmtTemp(Number(weather.attributes.temperature)), entity: weather.entity_id });
  else if (pelletOutside) pins.push({ id: "aussen", name: "Außen", value: fmtTemp(num(pelletOutside)), entity: pelletOutside.entity_id });

  const price = Object.values(entities).find((e) => e.entity_id.startsWith("sensor.") && /^(EUR|€|ct)\/kWh$/.test(String(e.attributes.unit_of_measurement ?? "")) && num(e) !== undefined);
  if (price) {
    const ct = /^ct/.test(String(price.attributes.unit_of_measurement)) ? num(price)! : num(price)! * 100;
    pins.push({ id: "preis", name: "Strompreis", value: `${fmtNum(ct, 1)} ct/kWh`, entity: price.entity_id });
  }
  // Raumfühler: Temperatur mit Feuchte daneben (Zigbee benennt sie …_temperature / …_humidity)
  const roomIds = new Set(rooms.flatMap((r) => [r.climate, r.humidity]));
  for (const e of Object.values(entities)) {
    if (!/^sensor\..+_temperature$/.test(e.entity_id) || e.attributes.device_class !== "temperature" || roomIds.has(e.entity_id) || num(e) === undefined) continue;
    const hum = entities[e.entity_id.replace(/_temperature$/, "_humidity")];
    if (!hum) continue;
    const label = String(e.attributes.friendly_name ?? e.entity_id).replace(/\s*(temperatur|temperature)$/i, "");
    pins.push({ id: `fuehler:${e.entity_id}`, name: `${label} · ${fmtState(hum)}`, value: fmtTemp(num(e)), entity: e.entity_id });
  }
  for (const [id, label] of [["input_number.jotunland_komfort_temperatur", "Komforttemperatur"], ["input_number.jotunland_batterie_vorrang", "Batterie-Vorrang"]] as const) {
    const e = HELPER(entities, id);
    if (e) pins.push({ id, name: label, value: fmtState(e), entity: id, ctl: <HelperControl entity={e} label={label} /> });
  }
  return pins;
}

// ---------- Anordnung: pro HA-Benutzer gespeichert, lokal als Fallback ----------
const USER_KEY = "jotunland_house";
const LOCAL_KEY = "jotunland.house";

function useLayout(pins: Pin[]) {
  const { ws, rooms } = useHass();
  const [saved, setSaved] = useState<Layout | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null");
    } catch {
      return null;
    }
  });
  useEffect(() => {
    ws<{ value: Layout | null }>({ type: "frontend/get_user_data", key: USER_KEY })
      .then((r) => r?.value && setSaved(r.value))
      .catch(() => { /* Demo oder alte HA-Version → localStorage */ });
  }, [ws]);

  const firstRoom = rooms[0] ? `raum:${rooms[0].climate}` : "";
  const defaults = useMemo(() => {
    const d: Layout = {};
    for (const p of pins) {
      const pos = DEFAULT_AT[p.id === firstRoom ? "raum" : p.id];
      if (pos) d[p.id] = pos;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.map((p) => p.id).join(), firstRoom]);

  const save = (next: Layout | null) => {
    setSaved(next);
    try {
      if (next) localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      else localStorage.removeItem(LOCAL_KEY);
    } catch { /* egal */ }
    ws({ type: "frontend/set_user_data", key: USER_KEY, value: next }).catch(() => { /* bleibt lokal */ });
  };
  return { layout: saved ?? defaults, save, reset: () => save(null) };
}

// ---------- Hausansicht ----------
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function House() {
  const { entities, rooms } = useHass();
  const n = useEnergy();
  const wbStatus = useEntity("wallbox.status");
  const pins = usePins();
  const { layout, save, reset } = useLayout(pins);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Layout | null>(null); // während des Ziehens
  const [narrow, setNarrow] = useState(false);
  const fig = useRef<HTMLElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; isNew: boolean; x0: number; y0: number; moved: boolean; inside: boolean } | null>(null);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 520));
    ro.observe(fig.current!);
    return () => ro.disconnect();
  }, []);

  const plugged = !!wbStatus && /charging|preparing|suspended|finishing|connected|lädt|angesteckt/i.test(wbStatus.state);
  const svg = houseSvg({
    pv: n.pv ?? 0,
    bat: n.battery ?? 0,
    tank: n.acthor ?? 0,
    car: n.wallbox ?? 0,
    grid: n.grid ?? 0,
    room: rooms.some((r) => entities[r.climate]?.attributes.hvac_action === "heating"),
    plugged,
  });
  // Überschuss = was die PV mehr liefert, als das Haus braucht: geht in die Batterie oder ins Netz
  const toBattery = Math.max(0, -(n.battery ?? 0));
  const toGrid = Math.max(0, -(n.grid ?? 0));
  const surplus = toBattery + toGrid;

  const shown = draft ?? layout;
  const placed = pins.filter((p) => shown[p.id]);
  const free = pins.filter((p) => !shown[p.id]);

  // offenes Schild in der Abbildung halten – auch wenn es beim Bedienen wächst
  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = stage.current?.querySelector<HTMLElement>(".house-pin.open");
    if (!el || narrow) return;
    el.style.setProperty("--dx", "0px");
    el.style.setProperty("--dy", "0px");
    const r = el.getBoundingClientRect(), sr = stage.current!.getBoundingClientRect();
    el.style.setProperty("--dx", `${Math.min(0, sr.right - r.right - 8) + Math.max(0, sr.left - r.left + 8)}px`);
    el.style.setProperty("--dy", `${Math.min(0, sr.bottom - r.bottom - 8)}px`);
  });

  useEffect(() => {
    if (!open) return;
    const close = (e: globalThis.PointerEvent) => !(e.target as Element).closest(".house-pin") && setOpen(null);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const pos = (e: PointerEvent) => {
    const r = art.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
    return { inside: x >= 0 && x <= 100 && y >= 0 && y <= 100, at: [+clamp(x, 4, 96).toFixed(1), +clamp(y, 4, 96).toFixed(1)] as [number, number] };
  };
  const startDrag = (e: PointerEvent, id: string, isNew: boolean) => {
    if (!editing || narrow || e.button > 0) return;
    drag.current = { id, isNew, x0: e.clientX, y0: e.clientY, moved: false, inside: !isNew };
    if (isNew) setDraft({ ...layout, [id]: pos(e).at });
    fig.current!.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4)) return;
    d.moved = true;
    const p = pos(e);
    d.inside = p.inside;
    setDraft((cur) => ({ ...(cur ?? layout), [d.id]: p.at }));
  };
  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const next = { ...(draft ?? layout) };
    if (d.isNew && !d.inside) delete next[d.id]; // neben dem Haus losgelassen
    if (d.isNew && !d.moved) next[d.id] = [50, 50]; // nur angetippt
    setDraft(null);
    if (d.moved || d.isNew) save(next);
  };
  const remove = (id: string) => {
    const next = { ...layout };
    delete next[id];
    save(next);
  };
  const onKey = (e: KeyboardEvent, id: string) => {
    if (!editing) return;
    const step = e.shiftKey ? 5 : 1;
    const m = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key];
    if (m) {
      const [x, y] = layout[id];
      save({ ...layout, [id]: [clamp(x + m[0], 4, 96), clamp(y + m[1], 4, 96)] });
      e.preventDefault();
    } else if (e.key === "Delete" || e.key === "Backspace") remove(id);
  };

  const outside = drag.current?.isNew && drag.current.moved && !drag.current.inside ? drag.current.id : null;

  return (
    <figure ref={fig} className={`house ${editing ? "editing" : ""}`} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="house-stage" ref={stage}>
        <div ref={art}>
          <svg className="house-art" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <ul className="house-pins">
          {placed.map((p) => {
            const isOpen = open === p.id && !editing && !!p.ctl;
            return (
              <li
                key={p.id}
                className={`house-pin ${p.ctl ? "has-ctl" : ""} ${isOpen ? "open" : ""} ${outside === p.id ? "outside" : ""} ${drag.current?.id === p.id ? "dragging" : ""}`}
                style={{ ["--x" as string]: `${shown[p.id][0]}%`, ["--y" as string]: `${shown[p.id][1]}%` }}
                tabIndex={editing ? 0 : undefined}
                aria-label={editing ? `${p.name} verschieben (Pfeiltasten, Entf entfernt)` : undefined}
                onPointerDown={(e) => startDrag(e, p.id, false)}
                onKeyDown={(e) => onKey(e, p.id)}
              >
                <button type="button" className="house-pin-head" aria-expanded={p.ctl ? isOpen : undefined} tabIndex={editing ? -1 : undefined} onClick={() => p.ctl && !editing && setOpen(isOpen ? null : p.id)}>
                  <span className="house-pin-name">{p.name}</span>
                  <span className="house-pin-value">{p.value}</span>
                </button>
                {isOpen && <div className="house-pin-ctl helpers">{p.ctl}</div>}
                {editing && (
                  <button type="button" className="house-pin-x" aria-label={`${p.name} entfernen`} onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(p.id)}>
                    <X size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {surplus >= 50 && (
          <p className="house-surplus" role="status">
            <span>Überschuss</span> <b>{fmtPower(surplus)}</b>
            <small>{[toBattery >= 50 && `${fmtPower(toBattery)} in die Batterie`, toGrid >= 50 && `${fmtPower(toGrid)} ins Netz`].filter(Boolean).join(" · ")}</small>
          </p>
        )}
        <div className="house-bar">
          {editing && <button type="button" className="btn small" onClick={reset}>Zurücksetzen</button>}
          <button type="button" className={`btn small ${editing ? "primary" : ""}`} onClick={() => { setEditing(!editing); setOpen(null); }}>
            {editing ? "Fertig" : "Bearbeiten"}
          </button>
        </div>
      </div>
      {editing && (
        <div className="house-tray">
          <p>{free.length ? (narrow ? "Antippen zum Hinzufügen" : "Auf das Haus ziehen oder antippen") : "Alle Werte sind auf dem Haus"}</p>
          {free.map((p) => (
            <button
              key={p.id}
              type="button"
              className="house-chip"
              title={p.entity}
              onPointerDown={(e) => startDrag(e, p.id, true)}
              onClick={() => narrow && save({ ...layout, [p.id]: [50, 50] })}
            >
              <Plus size={13} /> {p.name} <b>{p.value}</b>
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
