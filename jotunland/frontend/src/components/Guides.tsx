import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Anleitungen je Gerät – aus Hersteller- und Community-Dokumentation zusammengefasst (Stand Oktober 2026).
 * Bewusst knapp und auf dieses Haus zugeschnitten; die Links führen zum Original.
 */
interface Guide { id: string; title: string; sub: string; steps: ReactNode[]; tips?: ReactNode[]; links: [string, string][] }

const GUIDES: Guide[] = [
  {
    id: "zigbee2mqtt",
    title: "Zigbee2MQTT öffnen und Geräte anlernen",
    sub: "Zigbee-Stick am Raspberry Pi · Thermostate, Fühler",
    steps: [
      <>Home Assistant → <b>Einstellungen → Add-ons</b> (in neueren Versionen „Apps“) → <b>Zigbee2MQTT</b> → <b>Web-Oberfläche öffnen</b>.</>,
      <>Damit es schneller geht: auf derselben Seite <b>In der Seitenleiste anzeigen</b> einschalten.</>,
      <>Fehlt der Punkt „Add-ons“, ist der eigene Benutzer kein Administrator: <b>Einstellungen → Personen → Benutzer</b> → „Administrator“ einschalten (braucht einen Admin).</>,
      <>Anlernen: oben <b>Anlernen aktivieren (Alle)</b> – das Fenster bleibt rund 4 Minuten offen. Ohne Oberfläche geht es auch über den Schalter <b>Zigbee2MQTT Bridge Permit join</b> in Home Assistant.</>,
      <>Gerät in den Anlernmodus bringen (meist Taste lange drücken, bis die LED blinkt). Es erscheint in der Geräteliste.</>,
      <>Gerät umbenennen („Kinderzimmer Thermostat“) und <b>Home-Assistant-Entitäts-ID aktualisieren</b> anhaken. Danach Anlernen wieder ausschalten.</>,
    ],
    tips: [
      <>Den Stick selbst braucht man dafür nicht in der Hand – nur für ein Firmware-Update.</>,
      <>Den Stick mit einem kurzen USB-Verlängerungskabel vom Pi weg legen: USB 3 und WLAN des Pi stören Zigbee.</>,
      <>Home Assistant bietet für denselben Stick auch „ZHA“ an – ignorieren. Zwei Programme auf einem Stick vertragen sich nicht.</>,
    ],
    links: [
      ["Zigbee2MQTT einrichten (raspberry.tips)", "https://raspberry.tips/raspberrypi-tutorials/zigbee2mqtt-setup-home-assistant"],
      ["Gerät hinzufügen (HA-Forum)", "https://community.home-assistant.io/t/how-to-add-device-to-zigbee2mqtt/1021334"],
    ],
  },
  {
    id: "trvzb",
    title: "Heizkörperthermostat Sonoff TRVZB",
    sub: "Zigbee · Kinderzimmer W",
    steps: [
      <>Batterien einlegen und das Thermostat auf das Ventil schrauben – es muss die Temperatur anzeigen, bevor es angelernt wird.</>,
      <>In Zigbee2MQTT das Anlernen einschalten (siehe oben), dann am Thermostat die Kopplung starten (genaue Taste: Kurzanleitung des Geräts).</>,
      <>Nach dem Anlernen fährt das Thermostat einmal den Ventilstift ab und kalibriert sich selbst – ein paar Minuten warten.</>,
      <>In Jotunland unter <b>Einrichtung → Geräte benennen</b> den technischen Namen (<code>0x…</code>) durch den Raum ersetzen.</>,
    ],
    tips: [
      <>Misst es neben dem Heizkörper zu warm: in Zigbee2MQTT beim Gerät <b>local_temperature_calibration</b> setzen (z. B. −1,5). Einmal fest einstellen – Integrationen wie „Better Thermostat“ verstellen den Wert sonst selbst.</>,
    ],
    links: [
      ["SONOFF TRVZB (zigbee2mqtt.io)", "https://www.zigbee2mqtt.io/devices/TRVZB.html"],
      ["Zigbee-Thermostate mit Home Assistant (Sonoff)", "https://sonoff.tech/en-eu/blogs/news/zigbee-trvs-for-home-assistant-smarter-heating-guide"],
    ],
  },
  {
    id: "envoy",
    title: "Enphase PV und Hausbatterie",
    sub: "IQ Gateway (Envoy) · 2 × Encharge",
    steps: [
      <>Dem Envoy im Router eine <b>feste IP</b> geben und ihn nur per LAN <i>oder</i> WLAN verbinden – beides gleichzeitig führt alle paar Minuten zu Abbrüchen.</>,
      <>Home Assistant → <b>Einstellungen → Geräte & Dienste → Integration hinzufügen → Enphase Envoy</b>.</>,
      <>Ab Firmware 7 mit dem <b>Enlighten-Zugang</b> (Mail und Passwort der Enphase-App) anmelden. Die Cloud wird nur für das Zugangs-Token gebraucht – beim Einrichten und einmal im Jahr zur Erneuerung. Mit Zwei-Faktor-Anmeldung das Token von Hand eintragen.</>,
      <>Danach erscheinen Erzeugung, Netz, Batterie-Ladestand und je Encharge die Leistung (<b>+ = Entladen</b>).</>,
    ],
    tips: [
      <>Der Envoy liefert nur etwa einmal pro Minute neue Werte – Regelungen nicht schneller takten.</>,
      <>Bezug und Einspeisung zählt der Envoy je Phase; der Stromzähler saldiert. Die Envoy-Summen liegen deshalb beide zu hoch.</>,
      <>Speichermodus und Netzladen gehören <b>1KOMMA5° Heartbeat</b> (dynamischer Tarif) – in Home Assistant nicht verstellen, Jotunland liest nur.</>,
      <>Nach einem Firmware-Update kann ein neues Token nötig sein: Integration „Neu konfigurieren“.</>,
    ],
    links: [
      ["Enphase Envoy (home-assistant.io)", "https://www.home-assistant.io/integrations/enphase_envoy/"],
      ["Anmeldung und Token (pyenphase)", "https://pyenphase.readthedocs.io/en/latest/usage_authentication.html"],
      ["Heartbeat für Enphase (1KOMMA5°)", "https://1komma5.com/de/heartbeat/aktion/enphase/"],
    ],
  },
  {
    id: "wallbox",
    title: "Wallbox eProWallbox Move per OCPP",
    sub: "Free2move eSolutions · noch nicht verbunden",
    steps: [
      <>In Home Assistant über <b>HACS</b> die Integration <b>OCPP</b> (lbbrhzn/ocpp) installieren und neu starten.</>,
      <><b>Integration hinzufügen → OCPP</b>: Host <code>0.0.0.0</code>, Port <b>9000</b>, als Kennung einen kurzen Namen ohne Leerzeichen (z. B. <code>wallbox</code>) oder die Seriennummer vom Typenschild.</>,
      <>In der <b>eSolutions-App</b> per Bluetooth mit der Wallbox verbinden → Backend/CPMS auf <b>Andere</b> stellen → Adresse <code>ws://&lt;IP von Home Assistant&gt;:9000/wallbox</code> (gleiche Kennung wie oben).</>,
      <>Wallbox neu starten. Bis sie sich meldet, stehen die OCPP-Entitäten auf „nicht verfügbar“ – das ist normal.</>,
      <>Danach in Jotunland unter <b>Einrichtung → Zuordnung</b> Status, Leistung und Ladestrom der Wallbox zuordnen.</>,
    ],
    tips: [
      <>Verbindet sie sich nicht: Adresse ohne <code>ws://</code> oder mit <code>/</code> am Ende probieren, die IP statt <code>homeassistant.local</code> nehmen.</>,
      <>Mit eigenem Backend geht die Cloud-Steuerung der App nicht mehr – Bluetooth schon.</>,
      <>Die Move hat keinen eingebauten Zähler; die Ladeleistung ist geschätzt, solange kein externer Zähler dran ist.</>,
    ],
    links: [
      ["OCPP-Integration: Installation", "https://home-assistant-ocpp.readthedocs.io/en/latest/installation.html"],
      ["eProWallbox Datenblatt (Free2move)", "https://www.esolutions.free2move.com/eu/en_fr//pkm-000015_07-epro-datasheet-f2m-charge"],
      ["eProWallbox in evcc", "https://docs.evcc.io/de/chargers/free2move-esolutions-eprowallbox"],
    ],
  },
  {
    id: "acthor",
    title: "Heizstab my-PV AC THOR 9s",
    sub: "Modbus TCP · Warmwasser",
    steps: [
      <>Am AC THOR (Display oder Weboberfläche) als Ansteuerung <b>Modbus TCP</b> wählen – sonst nimmt er keine Leistungsvorgabe an.</>,
      <>Die Regelung <code>ac_thor.yaml</code> schreibt die gewünschte Leistung in <b>Register 1000</b> (0–9000 W); gelesen liefert es die aktuelle Leistung.</>,
      <>Im Handbetrieb unter <b>Haus → Warmwasser</b> Modus „Hand“ wählen und die Leistung einstellen.</>,
    ],
    tips: [
      <>Kommt etwa 60 Sekunden kein neuer Wert, schaltet der AC THOR ab (Watchdog) – deshalb schreibt die Regelung regelmäßig.</>,
      <>Nur <b>eine</b> Modbus-Verbindung gleichzeitig: Home Assistant hält sie. Andere Programme (evcc, ioBroker) dann nicht parallel verbinden.</>,
      <>Andere beschreibbare Register höchstens einmal am Tag ändern – sie landen im Flash-Speicher. Register 1000 ist davon ausgenommen.</>,
      <>Der Fühler zeigt 10–20 K zu wenig: 60 °C Messwert sind real etwa 79 °C. Die Abschaltgrenze gilt für den Messwert.</>,
    ],
    links: [
      ["Steuerungs-Dokumentation AC THOR (my-PV, PDF)", "https://download.my-pv.com/acthor/Documentation-Controls_AC-THOR_AC-THOR%209s_EN231130.pdf"],
      ["AC THOR in Home Assistant (Forum)", "https://community.home-assistant.io/t/my-pv-ac-thor/452248"],
    ],
  },
  {
    id: "froeling",
    title: "Pelletkessel Fröling",
    sub: "noch nicht angebunden",
    steps: [
      <>Es gibt keine offizielle Home-Assistant-Integration. Zwei Wege: die Cloud <b>Fröling Connect</b> (App, nur dort) oder <b>lokal per Modbus</b>.</>,
      <>Lokal: Der Lambdatronic-Regler hat eine serielle Schnittstelle, die auf Modbus umgestellt werden kann. Ein RS232-zu-Ethernet-Adapter (z. B. Waveshare) macht daraus Modbus TCP auf Port 502.</>,
      <>Die Netzwerkbuchse am Kessel bleibt für Fröling Connect – Modbus läuft über den Adapter getrennt davon.</>,
      <>In Home Assistant die Werte über die Modbus-Integration einlesen; welche Register was bedeuten, steht in Frölings „Modbus-Definition Lambdatronic“. Danach in Jotunland unter <b>Einrichtung → Zuordnung</b> Kessel, Puffer und Störung zuordnen.</>,
    ],
    tips: [
      <>Bis dahin meldet die Regelung „Warmwasser anfordern“ nur als Nachricht.</>,
      <>Lokal ist schneller und unabhängig von der Cloud, braucht aber etwas Bastelei am Kessel – im Zweifel den Heizungsbauer fragen.</>,
    ],
    links: [
      ["pe1-modbus: Fröling PE1 an Home Assistant (GitHub)", "https://github.com/smokyflex/pe1-modbus"],
    ],
  },
];

export function Guides() {
  return (
    <div className="guides">
      <p className="hint">Kurzfassungen für die Geräte in diesem Haus, aus Hersteller- und Community-Anleitungen zusammengetragen. Die Links führen zum Original.</p>
      {GUIDES.map((g) => (
        <details key={g.id} className="guide" id={`anleitung-${g.id}`}>
          <summary>
            <span className="guide-title">{g.title}</span>
            <span className="guide-sub">{g.sub}</span>
          </summary>
          <ol>{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {g.tips && (
            <>
              <h3>Gut zu wissen</h3>
              <ul>{g.tips.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
          <p className="guide-links">
            {g.links.map(([label, url]) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">{label} <ExternalLink size={12} /></a>
            ))}
          </p>
        </details>
      ))}
    </div>
  );
}
