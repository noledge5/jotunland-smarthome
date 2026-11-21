# Jotunland – offene Punkte und Plan

Stand: 21.11.2026 · Add-on 0.12.0 · Paket-Version 9

## Stand heute

- **Quelle der Wahrheit:** GitHub `main` (noledge5/jotunland-smarthome). Home Assistant installiert das Add-on
  von dort. Ablauf: Branch → PR → merge → in HA Add-on aktualisieren → Jotunland → Einrichtung → Assistent →
  „Aktualisieren“ (spielt Paket und Hausregeln ein, HA startet neu).
- **Hardware:** HA OS auf Raspberry Pi 5 (Daten auf SD-Karte). Synology DS124 (1 GB RAM) ist für HA ungeeignet –
  Entscheidung: auf dem Pi bleiben.
- **Zigbee:** Zigbee2MQTT + Mosquitto. Stick Sonoff ZBDongle-P (CC2652P) im USB-2-Port, Firmware
  Z-Stack 20250321 (geflasht am 21.11.2026), Kanal 11, Port fest über
  `/dev/serial/by-id/usb-ITead_Sonoff_Zigbee_3.0_USB_Dongle_Plus_…`. Noch **keine Router/Repeater** im Netz.
  Sicherung: `/config/zigbee2mqtt_backup_20261121-202100/`.
- **Geräte:** Thermostat Schlafzimmer + Kinderzimmer W (SONOFF TRVZB), Fenster Schlafzimmer (SNZB-04P),
  Temperatur Büro (SNZB-02D), Temperatur Wohnzimmer (Tuya). „Fenster offen → Heizung aus“ ist für das
  Schlafzimmer aktiv.
- **Funk (Linkquality, 0–255):** Schlafzimmer 43–51, Kinderzimmer 40–57 – schwach, aber nutzbar.

## Offen – braucht Hardware oder den Hausherrn

1. **Zigbee-Repeater kaufen** (Zigbee-Steckdose mit Netzteil, z. B. Sonoff S26R2ZB, IKEA Tretakt, ~10–15 €),
   zwischen Stick und Schlafzimmer einstecken. Größter Gewinn für die Funkqualität. Anlernen als erster
   echter Fall für „Neues Gerät“ (unten).
2. **Thermostat-Firmware 1.4.4** (beide TRVZB, Update in Zigbee2MQTT angeboten). Erst **nach** dem Repeater –
   ein OTA-Update dauert 30–60 min je Gerät und bricht bei schwachem Funk eher ab.
3. **Fröling Connect** neu anmelden (HA → Einstellungen → Geräte & Dienste → Fröling Connect: „Wrong username
   or password“). Danach im Assistenten „Aktualisieren“ – dann kommen Kessel-Meldungen dazu.
4. **SD-Karte → NVMe-SSD** am Pi 5 (M.2-HAT + kleine SSD, ~30–40 €). HA-Backups automatisch auf die Synology
   (HA → Einstellungen → System → Speicher → Netzwerkspeicher).
5. **Wallbox** (eProWallbox, OCPP): Wallbox auf `ws://<HA-IP>:9000/<Name>` einstellen, danach Zuordnung im
   Assistenten. Bis dahin installiert Jotunland keine Wallbox-Automationen.

## Nächstes Feature: Geräte anlernen und Automationen bauen

Wunsch: ein echter Ablauf in Jotunland, um neue Geräte zu verbinden und einfach Automationen zu bauen.
Automationen sollen **in Jotunland und im HA-Editor** bearbeitbar sein.

### „Neues Gerät“ (Assistent)

1. Art wählen: Zigbee (Zigbee2MQTT) oder „im Netzwerk gefunden“ (HA-Discovery / config flows).
2. Zigbee: `permit_join` für 120 s über `zigbee2mqtt/bridge/request/permit_join` (Countdown, Abbrechen),
   neue Geräte live über `zigbee2mqtt/bridge/event` (`device_joined`, `device_interview`) anzeigen.
3. Name + Raum: Vorschlag aus Gerätetyp und Raum („Fenster Schlafzimmer“). Umbenennen über
   `bridge/request/device/rename` mit `homeassistant_rename: true` (so wurden die Büro-/Schlafzimmer-Sensoren
   am 21.11. eingerichtet), Raum über `config/device_registry/update`; Fensterkontakt → `device_class: window`.
4. Vorschläge je Gerätetyp: Fensterkontakt + Thermostat im Raum → „Fenster offen → Heizung aus“;
   Raumthermometer + TRVZB → externen Fühler nutzen (`external_temperature_input`,
   `temperature_sensor_select: external`); Steckdose → Zeitplan / PV-Überschuss.
5. Funkqualität nach dem Anlernen zeigen (Linkquality-Sensor ist jetzt aktiviert).

### „Neue Automation“ (Wenn → Falls → Dann)

- Bausteine per Auswahl: **Wenn** (Gerätezustand, Uhrzeit, Sonnenauf/-untergang, PV-Überschuss, Abwesend),
  **Falls** (Zeitfenster, Zustand, Temperatur), **Dann** (schalten, Solltemperatur, Meldung, Szene).
- Speichern als **normale HA-Automation** über `config/automation/config/<id>` (landet in `automations.yaml`,
  im HA-Editor bearbeitbar). ID-Präfix `jotunland_`, damit die Seite „Automationen“ sie zeigt.
- Jede Automation schreibt ihre Entscheidung per `logbook.log` mit Namen „Jotunland …“ (siehe CLAUDE.md),
  damit Verlauf und Statuszeilen sie zeigen.
- Vorlagen statt leerer Seite: „Fenster offen → Heizung aus“, „Überschuss → einschalten“, „Abends absenken“.
- Bearbeiten in Jotunland nur für Automationen, deren Struktur der Baukasten versteht; andere → Link in den
  HA-Editor.

## Merkzettel

- Echte Geräte nur nach Rückfrage schalten (CLAUDE.md). Lesen ist immer in Ordnung.
- AC-THOR-Abschaltung bleibt bei 75 °C Messwert (real ~80 °C im Puffer ist hier normal).
- `input_number.ac_thor_max_temp_messwert`, Wallbox-Phasen und Batterie-Vorrang werden beim Aktualisieren
  nicht mehr überschrieben (seit 0.11.0).
