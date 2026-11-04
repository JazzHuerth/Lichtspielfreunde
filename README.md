# Lichtspielfreunde e.V. – Website & Kinoprogramm-Verwaltung

Offizielle Website des gemeinnützigen Kino-Vereins **Lichtspielfreunde e.V.** zur Förderung der Filmkunst und Kinokultur.
Entwickelt mit [Astro](https://astro.build/) und vorbereitet für das Hosting auf [Netlify](https://www.netlify.com/) via GitHub.

---

## 🌟 Funktionsumfang

1. **Vereinsdarstellung:**
   - Präsentation des Vereins, seines Vorstands und seines gemeinnützigen Vereinszwecks.
   - Mitgliederwerbung mit Online-Antrag und Beitragsstaffelung.
   - Kontaktformular, Anfahrtsbeschreibung und Informationen zum Spielort.

2. **Kinoprogramm des nächsten Quartals:**
   - Übersicht aller Filmvorführungen der kommenden Monate mit Monats-Filterung.
   - Detaillierte Filmkarten mit Datum, Uhrzeit, Plakatfoto, Regie, Jahr, Laufzeit, FSK, Genre und Synopsen.
   - Hervorgehobenes Startseiten-Highlight („Filmtipp des Quartals“).

3. **Passwortgeschützter Bereich („Programm“):**
   - Direkter Menüpunkt `Programm` in der Navigation.
   - Passwortabfrage zur Authentifizierung (Standard: `lichtspiel2025` bzw. Umgebungsvariable `ADMIN_PASSWORD`).
   - Neues Anlegen und Bearbeiten von Filmen inklusive Text und Foto-Upload.
   - **Speicherung als Markdown-Dateien (`.md`)** mit Frontmatter im Ordner `src/content/programm/`.
   - Integrierter Ein-Klick-Download von Markdown-Dateien sowie direkte GitHub-API-Speicherung für Netlify.

4. **Cookie-Zustimmungsabfrage (DSGVO-konform):**
   - Banner erscheint automatisch beim ersten Start der Website.
   - Unterscheidung zwischen technisch notwendigen und optionalen Cookies.
   - Auswahl wird im Browser gespeichert und kann jederzeit über einen Link im Footer oder auf der Datenschutzseite angepasst werden.

5. **Header-Navigation:**
   - Logo der Lichtspielfreunde (Platzhalter in `public/logo.svg`, einfach durch die eigene Datei austauschbar).
   - Menüpunkte:
     - `Home` (`/`)
     - `Mitglied werden` (`/mitglied-werden`)
     - `Kontakt` (`/kontakt`)
     - `Mehr` (Dropdown):
       - `Newsletter` (`/newsletter`)
       - `Impressum` (`/impressum`)
       - `Datenschutz` (`/datenschutz`)
     - `Programm` (passwortgeschützt, `/programm`)

---

## 📁 Projektstruktur

```text
├── public/
│   ├── logo.svg               # Logo der Lichtspielfreunde (hier austauschen)
│   └── images/programm/       # Filmplakate & Fotos
├── src/
│   ├── components/
│   │   ├── Header.astro       # Header mit Menü, Logo und Dropdown
│   │   ├── Footer.astro       # Fußbereich mit Kontaktdaten und Links
│   │   ├── CookieBanner.astro # DSGVO-Cookie-Zustimmungsbanner
│   │   └── ...
│   ├── content/
│   │   └── programm/          # Markdown-Dateien aller Filme (*.md)
│   ├── pages/
│   │   ├── index.astro        # Startseite: Programm, Verein, Vorstand
│   │   ├── mitglied-werden.astro # Mitgliedsantrag
│   │   ├── kontakt.astro      # Kontakt & Anfahrt
│   │   ├── newsletter.astro   # Newsletter-Anmeldung
│   │   ├── impressum.astro    # Impressum nach DDG & MStV
│   │   ├── datenschutz.astro  # Datenschutzerklärung
│   │   ├── programm/          # Passwortgeschützter Filmeditor
│   │   └── api/programm.ts    # API-Endpunkt für Auth & Speicherung
│   └── consts.ts              # Globale Texte, Adressen & Quartalsangaben
├── netlify.toml               # Netlify Deployment-Konfiguration
└── astro.config.mjs           # Astro-Konfiguration mit @astrojs/netlify
```

---

## 🚀 Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Der Entwicklungsserver startet auf `http://localhost:4321`.

### Passwort für den Bereich „Programm“
Das vorkonfigurierte Passwort lautet:
```
lichtspiel2025
```
Sie können es in der Datei `.env` über `ADMIN_PASSWORD=IhrPasswort` ändern.

---

## 🎨 Eigenes Logo einfügen

Das Logo der Lichtspielfreunde befindet sich in:
```text
public/logo.svg
```
Wenn Sie Ihr finales Logo erhalten haben, können Sie:
- Die Datei `public/logo.svg` einfach mit Ihrer SVG-Grafik überschreiben, oder
- Eine Bilddatei (z.B. `logo.png`) in `public/` ablegen und den Pfad in `src/components/Header.astro` anpassen.

---

## ☁️ Bereitstellung von GitHub auf Netlify

Die App ist für die automatische Bereitstellung auf **Netlify** optimiert:

1. **GitHub Repository erstellen:**
   ```bash
   git add .
   git commit -m "Kinoverein Website für Lichtspielfreunde e.V."
   git remote add origin https://github.com/IHR-BENUTZERNAME/IHR-REPOSITORY.git
   git branch -M main
   git push -u origin main
   ```

2. **Mit Netlify verknüpfen:**
   - Gehen Sie auf [Netlify](https://app.netlify.com/) und wählen Sie **"Add new site" &rarr; "Import an existing project" &rarr; "GitHub"**.
   - Wählen Sie Ihr Repository aus.
   - Netlify erkennt die Konfiguration durch `netlify.toml` automatisch:
     - **Build Command:** `npm run build`
     - **Publish directory:** `dist`

3. **Umgebungsvariablen auf Netlify setzen (Site configuration &rarr; Environment variables):**
   - `ADMIN_PASSWORD`: Ihr geheimes Passwort für `/programm`
   - `ASTRO_TELEMETRY_DISABLED`: `1`
   - *(Optional für automatisches Git-Commit beim Bearbeiten auf Netlify)*:
     - `GITHUB_TOKEN`: Ihr GitHub Personal Access Token (mit `repo`-Rechten)
     - `GITHUB_REPO`: `IHR-BENUTZERNAME/IHR-REPOSITORY`
     - `GITHUB_BRANCH`: `main`

Wenn `GITHUB_TOKEN` und `GITHUB_REPO` gesetzt sind, speichert der Web-Editor neue Filme direkt als Commit in Ihr GitHub-Repository, wodurch Netlify die Seite unmittelbar automatisch aktualisiert! Alternativ können Filme jederzeit lokal bearbeitet oder per Klick als `.md`-Datei heruntergeladen werden.
