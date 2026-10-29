# Jotunland – Design-Handoff für Claude Design

> Ziel: **Inspiration**, kein fertiges Produkt. Zeig mir 3 klar unterschiedliche Richtungen,
> wie sich Jotunland anfühlen könnte – mit echten Inhalten aus diesem Dokument.
> Beigelegt: `ist-start.jpg`, `ist-heizung.jpg` (aktueller Stand, Demo-Daten).

## 1. Was ist Jotunland?

Die Steuerzentrale eines Einfamilienhauses mit Solaranlage, Hausbatterie, Wallbox, Warmwasser-
Heizstab, Pelletkessel und Zigbee-Thermostaten. Läuft als Add-on in **Home Assistant** und wird
fast nur auf dem **Handy in der Home-Assistant-App** benutzt (iPhone 14 Pro, 393 × 852 pt,
meist dunkel). Die Seite sitzt dort in einem Rahmen unter der HA-Kopfzeile – eigene Kopf- und
Fußleiste sind erlaubt, aber keine Browser-Gesten wie Pull-to-Refresh.

Das Haus regelt sich selbst. Der Mensch schaut meistens nur: *Läuft alles? Warum heizt der
Speicher gerade nicht? Lädt das Auto?* Und manchmal greift er ein: wärmer, Auto sofort laden,
Warmwasser von Hand. Das Design muss beides können – **auf einen Blick lesen** und **mit einem
Daumen sicher bedienen**.

Sprache der Oberfläche: **Deutsch**. Lange Wörter einplanen („Absenktemperatur“,
„Einspeisung“, „Pelletkessel · Fröling“). Zahlen deutsch: `5,8 kW`, `21,5 °C`, `4.000 W`.

## 2. Was ich von dir möchte

Pro Richtung (3 Richtungen, gern mutig unterschiedlich – z. B. ruhig/editorial,
technisch/instrumentenhaft, warm/wohnlich):

1. **Start** (Handy, dunkel) – Begrüßung, Leiste „Jetzt“, Räume, Energiefluss, Wallbox, Warmwasser
2. **Eine Gerätekarte in allen Zuständen** – am besten Warmwasser (AC THOR), siehe §4
3. **Heizung** – Raum-Thermostate mit ± und Modus
4. **Klingel-Ansicht** (neu, gibt es noch nicht) – siehe §5
5. Eine der Ansichten zusätzlich **hell**

Kein Code nötig. Farben, Typo, Abstände, Bewegung gern als kurze Notiz dazu.

## 3. Ansichten und echte Inhalte

Navigation (Handy: schwebende Leiste unten, 7 Einträge – darf gern weniger werden):
**Start · Heizung · Energie · Geräte · Verlauf · Abläufe · Setup**

### Start
- „Donnerstag, 29. Oktober“ / „Guten Morgen“, rechts Schalter **Abwesend** (Flugzeug)
- **Jetzt** – wischbare Kacheln: Solar `5,8 kW` · Haus `845 W` · Batterie `78 %` „lädt 90 W“ ·
  Netz `163 W` „Einspeisung“ · Wallbox `0 W` „bereit“ · Warmwasser `57,7 °C` „heizt 4,0 kW“.
  Aktive Kacheln (Strom fließt) sind hervorgehoben
- Hinweis „Einrichtung abschließen – noch 1 Schritt“ (nur bis alles zugeordnet ist)
- **Räume** – Kacheln: Bad `23,0°` „Soll 23,0 °C“, Küche, Schlafzimmer, Kinderzimmer W …;
  Zustände: heizt (warm getönt) · Fenster offen · aus
- **Energie jetzt** – Energiefluss Solar → Haus / Batterie / Netz / Auto / Warmwasser
- **Wallbox**, **Warmwasser · AC THOR**, **Pelletkessel · Fröling**, **Schnellaktionen**
  („Alles aus (Verlassen)“, „Heizung Boost 1 h“, „Auto sofort laden“)

### Heizung
- Pro Raum ein Thermostat: Ist groß (`22,0 °C`), Soll mit − / + (`23,5 °C`), Luftfeuchte,
  Abzeichen „heizt“, „Fenster offen“, „Batterie 12 %“, „offline“; Modus Heizen · Auto · Aus
- **Heizprogramm**: Komfort `21,5 °C`, Absenkung `18,0 °C`, Heizen ab `06:00`, Absenken ab `22:00`,
  Sommerbetrieb (Pellets aus), Warmwasser-Minimum `45 °C`
- Wärmeerzeuger: Pelletkessel (Kessel-, Außentemperatur, Pufferspeicher oben/unten, Vorrat %),
  AC THOR

### Energie
Solar (aktuell, heute, Autarkie %), Batterie (Ladestand, Vorrang vor dem Auto bis `90 %`),
Tageskurven.

### Geräte
Alle Geräte nach Räumen, als Kacheln mit Schalter/Dimmer/Rollo; Antippen des Namens = umbenennen.
Technische Namen wie `0xd44867fffe27ff1e` oder `TS0601` bekommen Vorschläge.

### Verlauf
Zeitleiste des Tages: was lief wann (Laufbänder je Gerät), dazu **Entscheidungen** der Regelungen
und Eingriffe von Hand („Ludwig: Modus → Hand“).

### Abläufe / Setup
Liste der Automationen (an/aus, zuletzt ausgelöst). Setup: Geräte den Funktionen zuordnen,
Paket installieren – wird selten benutzt, darf nüchtern bleiben.

## 4. Die wichtigsten Zustände (neu in 0.8.0 – bitte gestalten!)

Begriffe aus dem Haus – sie sollen im Design unterscheidbar sein:

| Begriff | Bedeutung | Beispiel |
|---|---|---|
| **Statuszeile** | letzte Entscheidung der Regelung, auf der Karte, antippbar → Verlauf | „Absenkung 18,0 °C – außerhalb der Heizzeit 06:00–22:00 · vor 1 h“ |
| **Wird gesendet** | Befehl ist raus, das Gerät hat ihn noch nicht bestätigt; Anzeige zeigt schon den Wunschwert | Thermostat bis 15 s, Wallbox bis 60 s, Heizstab bis er die Leistung aufnimmt (fährt ~60 W/s) |
| **Keine Rückmeldung** | Gerät hat nicht reagiert; Anzeige springt auf den echten Wert zurück | „keine Rückmeldung“ nach 15 s |
| **Sperre** | Regelung lässt das Gerät absichtlich nicht folgen – kein Fehler! | „gesperrt: Speicher voll“, „gesperrt: Fenster offen“, „gesperrt: Sommerbetrieb“ |
| **Störung** | echter Fehler | „Pelletkessel meldet eine Störung“ |

Warmwasser-Karte als Referenz für alle Zustände:
- Speicher `57,7 °C`, Soll `60 °C`, Heizstab `4,0 kW`, Abzeichen „heizt“ / „aus“
- Statuszeile „Automatik: Überschuss 2,4 kW → Sollwert 2400 W · vor 3 min“
- Stellschrauben: Modus Automatik · Hand · Aus; Handleistung `0–9.000 W`; Abschalten ab `60 °C`
- Sperre: „gesperrt: Speicher voll“ an der Handleistung
- Heute: Laufband 0–24 Uhr, „Heute: 2× 3 h 10 min →“

Heute sind das kleine Textzeilen (Screenshot `ist-heizung.jpg`). Gern viel besser: wie fühlt
sich „wartet auf das Gerät“ an, ohne nervös zu wirken? Wie sieht eine Sperre aus, damit man
versteht, dass das Absicht ist?

## 5. Kommt als Nächstes – gern schon mitdenken

- **Klingel** (Eufy Batterie-Türklingel + HomeBase als Gong): Beim Klingeln kommt eine
  dringende Meldung mit Bild auf jedes Handy. Antippen öffnet die Klingel-Ansicht: erst das
  Standbild, dann blendet das Live-Bild ein. Knopf „In Eufy-App antworten“ (Sprechen geht nur
  dort). Dazu **Ruhezeit** (Standard 21–7 Uhr, Gong stumm, Meldung kommt trotzdem) und ein
  Schalter **„Klingel leise“**.
- **Anlernen**: neues Zigbee-Gerät koppeln („Kopplung offen – 2:00“, Gerät gefunden, Namen
  und Raum vergeben) und von Home Assistant entdeckte Geräte einrichten.

## 6. Aktuelles Designsystem (darfst du komplett verwerfen)

- Dunkel: Hintergrund `#0a0e12`, Flächen `#141b21` / `#1b242b` / `#232e36`, Text `#eef3f6`,
  gedämpft `#8d9ba6`, Akzent Mint `#5fd3ad`
- Farbe je Bereich (bitte als Idee beibehalten): Solar `#f7bd4a` · Heizung `#f47b4d` ·
  Wasser `#4cb8ef` · Wallbox `#a690ff` · Batterie `#4ccb8e` · Netz `#9aa7b1`
- Status: ok `#5fd395`, Warnung `#f3b847`, Fehler `#f2706f`
- Karten mit 22 px Radius, feine Ränder, leicht getönt je Bereich; Inter; große Zahlen mit
  Ziffern gleicher Breite; Segment-Schalter für Modi; schwebende Glas-Leiste unten
- Hell: gleiche Struktur, Hintergrund `#f2f4f6`, Flächen weiß

## 7. Rahmenbedingungen

- Handy zuerst, ein Daumen, Ziele ≥ 44 pt; Desktop als Raster mehrerer Karten
- Muss auf einem älteren Handy flüssig bleiben – Bewegung sparsam, „Bewegung reduzieren“ beachten
- Daten kommen live (Envoy-Werte ~1×/min, Thermostate in Sekunden) – nichts darf springen,
  wenn sich eine Zahl ändert
- Keine Werbefotos von Häusern; das Haus heißt Jotunland (nordisch, „Riesenland“) – gern als
  leiser Charakter, nicht als Kitsch
- Kein Gerät darf so aussehen, als sei es aus, wenn es nur gesperrt ist
