import { useCallback, useEffect, useState } from "react";
import type { HassEntities } from "home-assistant-js-websocket";
import { Lock, SignalLow, Workflow } from "lucide-react";
import { useHass } from "../ha/HassContext";
import type { EntityMeta } from "../ha/types";
import { relTime } from "../format";
import { Badge } from "./ui";

/** Zeitlimits für die Rückmeldung je Gerät (siehe CONTEXT.md „Rückmeldung“) */
export const WAIT = { schalter: 10_000, thermostat: 15_000, wallbox: 60_000 } as const;

interface Pending {
  check: (e: HassEntities) => boolean;
  until: number;
  value: unknown;
}

/**
 * Befehl mit Rückmeldung: zeigt den gewünschten Wert, bis das Gerät selbst ihn meldet.
 * Kommt bis zum Zeitlimit nichts, springt die Anzeige auf den echten Wert zurück.
 */
export function useConfirm<V>() {
  const { entities, callService } = useHass();
  const [pending, setPending] = useState<Pending | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (pending?.check(entities)) setPending(null);
  }, [entities, pending]);

  useEffect(() => {
    if (!pending) return;
    const t = window.setTimeout(() => {
      setPending(null);
      setTimedOut(true);
    }, pending.until - Date.now());
    return () => window.clearTimeout(t);
  }, [pending]);

  useEffect(() => {
    if (!timedOut) return;
    const t = window.setTimeout(() => setTimedOut(false), 6000);
    return () => window.clearTimeout(t);
  }, [timedOut]);

  const send = useCallback(
    async (value: V, check: (e: HassEntities) => boolean, ms: number, domain: string, service: string, data?: Record<string, unknown>) => {
      setTimedOut(false);
      setPending({ check, until: Date.now() + ms, value });
      try {
        await callService(domain, service, data);
      } catch {
        setPending(null); // Fehler meldet callService schon als Hinweis
      }
    },
    [callService],
  );

  return { sending: !!pending, value: pending?.value as V | undefined, timedOut, send };
}

/** Zigbee-Funkqualität (linkquality 0–255) darunter gilt als schwach */
export const WEAK_LINK = 40;

// device_id → sensor.…_linkquality, einmal je Registry-Stand
const lqIndex = new WeakMap<Record<string, EntityMeta>, Map<string, string>>();
function lqSensors(meta: Record<string, EntityMeta>) {
  let m = lqIndex.get(meta);
  if (!m) {
    m = new Map();
    for (const [id, x] of Object.entries(meta)) if (x.device_id && id.startsWith("sensor.") && id.endsWith("_linkquality")) m.set(x.device_id, id);
    lqIndex.set(meta, m);
  }
  return m;
}

/**
 * Funk eines Geräts: Sensor …_linkquality am selben Gerät (Zigbee2MQTT) oder Attribut `linkquality`.
 * Der Sensor ist in HA oft deaktiviert – dann ist `lq` undefined und wir raten nicht.
 */
export function useLink(entityId?: string) {
  const { entities, meta } = useHass();
  const dev = entityId ? meta[entityId]?.device_id : undefined;
  const sensor = dev ? entities[lqSensors(meta).get(dev) ?? ""] : undefined;
  const e = entityId ? entities[entityId] : undefined;
  const raw = sensor && sensor.state !== "unavailable" && sensor.state !== "unknown" ? sensor.state : e?.attributes.linkquality;
  const lq = raw == null || raw === "" || !Number.isFinite(Number(raw)) ? undefined : Number(raw);
  const offline = e?.state === "unavailable" || sensor?.state === "unavailable";
  return { lq, offline, weak: !offline && lq !== undefined && lq < WEAK_LINK };
}

/** Kleines Schild „Funk schwach“ für Thermostat-/Gerätekarten – nur bei bekanntem, schwachem Funk */
export function LinkBadge({ entity }: { entity?: string }) {
  const { lq, weak } = useLink(entity);
  if (!weak) return null;
  return <Badge tone="bad"><span title={`Funkqualität ${lq}/255`}><SignalLow size={12} /> Funk schwach</span></Badge>;
}

/** Kleiner Hinweis neben dem Bedienelement: „wird gesendet …“ / „keine Rückmeldung – Grund“ / Sperre */
export function Fb({ fb, blocked, entity }: { fb: { sending: boolean; timedOut: boolean }; blocked?: string; entity?: string }) {
  const link = useLink(entity);
  if (blocked) return <span className="fb blocked"><Lock size={16} /> gesperrt: {blocked}</span>;
  if (fb.sending) return <span className="fb sending" role="status">wird gesendet …</span>;
  if (fb.timedOut) {
    // Befehl ging an HA raus, das Gerät hat ihn aber nicht gemeldet – sagen, woran es wahrscheinlich liegt
    const why = link.offline ? "Gerät offline" : link.weak ? `keine Rückmeldung – Funk schwach (${link.lq}/255)` : "keine Rückmeldung – Gerät hat den Befehl nicht bestätigt";
    return <span className="fb bad" role="status">{why}</span>;
  }
  return null;
}

/** Statuszeile: letzte Entscheidung der Regelung mit Grund */
export function StatusLine({ name }: { name: string }) {
  const { decisions } = useHass();
  const d = decisions[name];
  if (!d) return null;
  return (
    <a className="status-line" href="#/verlauf" title="Alle Entscheidungen im Verlauf">
      <Workflow size={16} />
      <span>{d.message}</span>
      <time>{relTime(new Date(d.when).toISOString())}</time>
    </a>
  );
}
