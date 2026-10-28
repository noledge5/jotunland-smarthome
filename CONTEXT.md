# Jotunland – Begriffe

**Regelung** – eine Automatik, die ein Gerät laufend nach Regeln steuert (z. B. AC-THOR-Regelung, PV-Überschussladen, Heizzeiten).

**Hausregel** – eine Regelung, die nur für dieses Haus gilt. Gegenstück: die allgemeine Vorlage, die für jedes Haus passt.

**Stellschraube** – ein Wert, mit dem der Mensch eine Regelung beeinflusst (Modus, Handleistung, Temperaturgrenze, Batterie-Vorrang). Eine Stellschraube ist nicht das Gerät selbst.

**Entscheidung** – was eine Regelung gerade tut und warum, in einem kurzen Satz (z. B. „Speicher voll (Messwert 60 °C) → 0 W“). Jede Regelung meldet ihre Entscheidungen.

**Statuszeile** – die jüngste Entscheidung einer Regelung, sichtbar auf der Karte des Geräts.

**Rückmeldung** – das Gerät selbst zeigt, dass es einen Befehl umsetzt (die Leistung steigt, das Laden beginnt, der Sollwert steht im Thermostat). Dass eine Stellschraube gespeichert ist, ist noch keine Rückmeldung.

**Anlernen** – ein neues Gerät ins Haus aufnehmen (Zigbee koppeln oder ein entdecktes Gerät einrichten). Nur beim Anlernen bekommt ein Gerät seinen sauberen Namen samt ID; danach ändert ein Umbenennen nur noch den Namen, weil Regelungen und Auswertungen sich auf die ID beziehen.

**Meldung** – eine Nachricht von Jotunland an die Menschen im Haus: immer in Home Assistant und auf jedes Handy mit der Home-Assistant-App, nie nur auf eines.

**Klingeln** – jemand drückt die Türklingel. Ein Klingeln erzeugt immer eine Meldung mit Bild, auch in der Ruhezeit.

**Gong** – der Klingelton im Haus (bei Eufy die HomeBase). Nicht dasselbe wie die Meldung aufs Handy.

**Ruhezeit** – Zeiten, in denen der Gong stumm bleibt. Die Meldung kommt trotzdem.

**Sperre** – eine Entscheidung, die das Gerät absichtlich nicht folgen lässt (z. B. „Speicher voll“, „Auto voll“). Eine Sperre ist keine fehlende Rückmeldung.
