import { useEffect, useState } from "react";
import { Flame, History, House, Lightbulb, Settings, Workflow, Zap } from "lucide-react";
import { HassProvider, useHass } from "./ha/HassContext";
import { Overview } from "./views/Overview";
import { Heating } from "./views/Heating";
import { Energy } from "./views/Energy";
import { Devices } from "./views/Devices";
import { Automations } from "./views/Automations";
import { Setup } from "./views/Setup";
import { History as HistoryView } from "./views/History";
import { Connect } from "./views/Connect";
import { servedViaIngress } from "./ha/connection";

const ROUTES = [
  { path: "", label: "Haus", icon: House, view: Overview },
  { path: "heizung", label: "Heizung", icon: Flame, view: Heating },
  { path: "energie", label: "Energie", icon: Zap, view: Energy },
  { path: "geraete", label: "Geräte", icon: Lightbulb, view: Devices },
  { path: "verlauf", label: "Verlauf", icon: History, view: HistoryView },
  { path: "automationen", label: "Automationen", short: "Abläufe", icon: Workflow, view: Automations },
  { path: "einrichtung", label: "Einrichtung", short: "Setup", icon: Settings, view: Setup },
];

function useRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, "");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

function Shell() {
  const { status, error, isDemo, config, toasts, addon, settings } = useHass();
  const route = useRoute();
  // Als Add-on (Ingress) verbindet der Server – Adresse/Token einzugeben ergibt dort keinen Sinn
  const viaAddon = !!addon || servedViaIngress();
  const [editConn, setEditConn] = useState(false);
  useEffect(() => setEditConn(false), [settings]);
  if (!viaAddon && (status === "setup" || status === "error" || editConn)) return <Connect />;
  if (viaAddon && status === "error") {
    return (
      <div className="connect">
        <div className="connect-card">
          <div className="brand big">{config.title}</div>
          <p className="hint bad">{error ?? "Verbindung zu Home Assistant verloren"}</p>
          <button type="button" className="btn primary" onClick={() => window.location.reload()}>
            Neu anmelden
          </button>
        </div>
      </div>
    );
  }
  const waiting = status === "connecting" || status === "setup";
  const current = ROUTES.find((r) => r.path === route) ?? ROUTES[0];
  const View = current.view;

  return (
    <div className="shell">
      <nav className="nav" aria-label="Hauptnavigation">
        <div className="brand"><span>{config.title}</span></div>
        {ROUTES.map((r) => (
          <a key={r.path} href={`#/${r.path}`} className={r === current ? "active" : ""} aria-current={r === current ? "page" : undefined}>
            <r.icon size={20} />
            <span className={"short" in r ? "long" : undefined}>{r.label}</span>
            {"short" in r && <span className="short">{r.short}</span>}
          </a>
        ))}
        <div className={`conn conn-${status}`}>
          <span className="dot" />
          {isDemo ? "Demo" : status === "connected" ? "Verbunden" : status === "reconnecting" ? "Verbinde neu …" : "Verbinde …"}
        </div>
      </nav>
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" data-tone={t.tone}>{t.text}</div>
        ))}
      </div>
      <main className="main">
        {isDemo && <div className="demo-banner">Demo-Modus: simulierte Daten. Unter Einrichtung → Verbindung beenden.</div>}
        {waiting ? (
          <div className="loading">
            Verbinde mit Home Assistant …
            {error && <p className="hint bad">{error} – neuer Versuch läuft</p>}
            {error && !viaAddon && (
              <button type="button" className="btn ghost" onClick={() => setEditConn(true)}>
                Verbindung ändern
              </button>
            )}
          </div>
        ) : (
          <View />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HassProvider>
      <Shell />
    </HassProvider>
  );
}
