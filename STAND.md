# Stand: Jotunland Smarthome
Zuletzt aktualisiert: 2026-10-15
HTML-Seite: keine

## Ziel
Smarthome-Oberfläche (Home-Assistant-Add-on) und Hausregeln für ein Haus mit PV, Hausbatterie, Wallbox, Warmwasser-Heizstab
(AC THOR) und Pelletkessel: Überschuss sinnvoll nutzen, Entscheidungen der Regelungen nachvollziehbar machen.

## Aktueller Stand
- Add-on Version 0.6.0: Hausregeln aus `jotunland/haus/` werden beim Aktualisieren eingespielt, Geheimes nur per `!secret`.
- Seite „Verlauf“ (Läufe von AC THOR und Wallbox, Entscheidungen aus dem Logbuch); AC-THOR-Regelung mit Temperaturgrenze.
- Werkzeuge in `tools/` (ha, auswertung, geraete) für Arbeit mit echten Signalen; Einzelheiten in CLAUDE.md.
- 2026-10-15: hierarchie eingerichtet (Skills, Worker, UTS, diese Datei).

## Offene Punkte
- Kiwigrid gridBox: Rolle im Haus klären (CLAUDE.md, „Das Haus“).
- Fröling Pelletkessel: Anbindung offen (Fröling Connect oder Modbus); Warmwasser-Anforderung bisher nur als Meldung.

## Entscheidungen
- Speichermodus und Netzladen der Hausbatterie gehören 1KOMMA5° Heartbeat; Home Assistant fasst sie nicht an (CLAUDE.md).
- Echte Geräte nur nach Rückfrage schalten; Lesen ist immer erlaubt (CLAUDE.md, „Regeln“).
- Ausliefern über `main` und eine höhere Add-on-Version; Home Assistant bietet dann das Update an.

## Nächste Schritte
1. Rolle der gridBox und Anbindung des Pelletkessels klären.

## Befunde
- keine
