# Gym Trainingsplan (PWA)

Eine Progressive Web App zum Dokumentieren von Krafttraining im Gym – passend zum Übungsplan.

Die App läuft direkt im Browser auf dem Android-Smartphone, ist offlinefähig und kann über den Browser dem Homescreen hinzugefügt werden (installierbare PWA). Alle Daten bleiben lokal auf dem Gerät (localStorage), es ist kein Server oder Account nötig.

## Funktionen

- **Plan**: Übungsplan frei erfassen und bearbeiten
  - Trainingstage anlegen (z. B. „Tag A – Brust & Trizeps")
  - Übungen pro Tag mit geplanten Sätzen, Ziel-Wiederholungen und Ziel-Gewicht
  - Alles jederzeit editier- und löschbar
- **Training**: Training gemäß Plan dokumentieren
  - Trainingstag auswählen, die geplanten Übungen werden automatisch geladen
  - Pro Satz Gewicht (kg) und Wiederholungen manuell eintragen
  - Sätze hinzufügen/entfernen, Datum und Notiz festlegen
- **Übersicht**: Auswertung der dokumentierten Trainings
  - Gesamtstatistik (Trainings, dokumentierte Sätze, Volumen in kg)
  - Auswertung pro Trainingstag
  - Liste der vergangenen Trainings, jedes Training ist nachträglich bearbeitbar
  - **Export/Import**: Sicherung der Daten als JSON-Datei, Import ersetzt die Daten auf dem Gerät

## Nutzung auf dem Android-Smartphone

1. Repository lokal auschecken oder die App über einen eigenen Webspace/lokalen Webserver bereitstellen (statische Dateien, kein Build nötig).
2. Die URL in Chrome auf dem Smartphone öffnen.
3. Über das Chrome-Menü „Zum Startbildschirm hinzufügen" die App installieren.
4. Die App startet danach im Vollbildmodus und funktioniert auch offline.

Für die lokale Entwicklung genügt ein einfacher Webserver, z. B.:

```bash
npx serve .
```

## Projektstruktur

```
index.html          Einstiegspunkt (App-Shell)
manifest.json       PWA-Manifest
sw.js               Service Worker (Offline-Caching)
css/style.css       Styles (mobil optimiert, dunkles Design)
js/app.js           Routing und Navigation
js/plan.js          Übungsplan-Verwaltung
js/workout.js       Training-Dokumentation
js/overview.js      Übersicht und Statistik
js/store.js         Datenspeicher (localStorage)
js/util.js          Hilfsfunktionen
icons/              App-Icons (SVG und PNG)
tests/smoke.test.mjs Basistests für Datenspeicher und Hilfsfunktionen
```

## Tests

```bash
node --test tests/smoke.test.mjs
```
