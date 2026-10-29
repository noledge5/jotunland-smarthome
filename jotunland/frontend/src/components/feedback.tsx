import { useCallback, useEffect, useState } from "react";
import type { HassEntities } from "home-assistant-js-websocket";
import { Lock, Sparkles } from "lucide-react";
import { useHass } from "../ha/HassContext";
import { relTime } from "../format";

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

/** Kleiner Hinweis neben dem Bedienelement: „wird gesendet …“ / „keine Rückmeldung“ / Sperre */
export function Fb({ fb, blocked }: { fb: { sending: boolean; timedOut: boolean }; blocked?: string }) {
  if (blocked) return <span className="fb blocked"><Lock size={11} /> gesperrt: {blocked}</span>;
  if (fb.sending) return <span className="fb sending" role="status">wird gesendet …</span>;
  if (fb.timedOut) return <span className="fb bad" role="status">keine Rückmeldung</span>;
  return null;
}

/** Statuszeile: letzte Entscheidung der Regelung mit Grund */
export function StatusLine({ name }: { name: string }) {
  const { decisions } = useHass();
  const d = decisions[name];
  if (!d) return null;
  return (
    <a className="status-line" href="#/verlauf" title="Alle Entscheidungen im Verlauf">
      <Sparkles size={13} />
      <span>{d.message}</span>
      <time>{relTime(new Date(d.when).toISOString())}</time>
    </a>
  );
}
