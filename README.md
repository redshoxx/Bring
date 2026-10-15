# Unser Alltag · Version 0.1.0

Native React-Native-App für Android und iPhone mit eigener Node-API und PostgreSQL auf deinem VPS. Design: warme Flächen, Aubergine, Flieder und Apricot; Manrope-Schrift, große Touch-Flächen und klare Listen.

## Enthalten

- Einkaufsliste: hinzufügen, Name/Menge ändern, abhaken, löschen, kurz rückgängig machen, erledigte Artikel gesammelt entfernen.
- Aufgaben: eigene/gemeinsame Aufgaben, Zuständigkeit, Fälligkeit, lokale Erinnerung 24 Stunden vorher.
- Wochenplan: sieben Tage, vor/zurück, gemeinsame Abendessen und eigener Mitnehm-Plan. Mitnahmetag wird am Vorabend als Vorbereitung angezeigt.
- Zutaten auswählen und in die gemeinsame Einkaufsliste übernehmen; Historie zum Wiederverwenden von Gerichten mit Zutaten und Anleitung.
- Gerichtbilder als Hintergrundauftrag mit Wiederverwendung; benötigt einen kostenpflichtigen Bilddienst-Zugang auf dem Server.
- Zwei eigene Konten, Einladung mit Ablaufzeit, Partner trennen; serverseitige Prüfung jeder Freigabe einschließlich WebSocket und Bildzugriff.
- Optionale Vorräte, Termine, Ausgaben und Sparziele, getrennt aktivierbar und freigebbar. Diese Zusatzbereiche sind einfache manuelle Listen, keine Bankanbindung oder Finanzplanung.
- Live-Synchronisierung bei geöffneter App; automatische Neuverbindung und Abgleich beim Öffnen. Gleichzeitige Bearbeitung erzeugt einen Konflikt statt stiller Überschreibung.
- Versionsprüfung beim App-Start und bei Rückkehr in die App; Android-APK-Download und SideStore-Source.

## Was für die Nutzung noch eingerichtet werden muss

1. Backend auf deinem VPS installieren und eine HTTPS-Domain zuweisen.
2. Auf beiden Handys die gleiche Serveradresse eingeben, je ein Konto erstellen und per Code verbinden.
3. Für Updates ein GitHub-Repository und dessen Releases einrichten. In der App unter **Mehr → GitHub-Projekt für Updates** `BENUTZER/REPOSITORY` speichern.
4. Für automatische Bilder optional `OPENAI_API_KEY` nur auf dem VPS eintragen. Ohne Schlüssel bleibt der Wochenplan vollständig nutzbar; die App weist auf fehlende Bildgenerierung hin.

Der Code und die Build-Pipeline sind vorbereitet. Dein VPS und dein GitHub-Konto wurden durch das Erstellen dieses Pakets noch nicht verändert. Eine IPA kann nur auf einem macOS-Runner mit Xcode gebaut werden. Ein Workflow ist enthalten, aber vor einem erfolgreichen Lauf existiert noch keine nutzbare SideStore-Downloadadresse.

## Android installieren

Wenn `releases/Unser-Alltag.apk` im Downloadpaket vorhanden ist, auf das Android-Handy kopieren, öffnen und die Installation dieser Quelle erlauben. Es ist ein Release-Build mit eingebettetem JavaScript; Metro/Expo Go wird nicht benötigt. Mindestversion Android 7, enthaltene Architekturen ARM64 und ARMv7.

Beim ersten Start die HTTPS-Serveradresse eingeben. Die App enthält keine fremden Zugangsdaten und keine feste produktive Serveradresse. Der Server muss erreichbar sein, um Konten und Daten zu verwenden.

**Updates:** Beim Start wird das Update-Manifest geprüft. Eine neuere Version wird angeboten; ein Tipp lädt die APK herunter. Android verlangt eine Installationsbestätigung. Es gibt keine stille Installation im Hintergrund. Derselbe Paketname, derselbe Signaturschlüssel und eine höhere `versionCode` sind für ein Update ohne Deinstallation erforderlich.

## VPS installieren (Ubuntu mit Docker Compose)

Voraussetzung: Docker Engine mit Compose-Plugin, Domain mit DNS auf deinen VPS, freie Ports 80/443. Falls dort schon ein Webserver läuft, den vorhandenen Proxy nutzen und die Caddy-Ports entsprechend anpassen.

```bash
cd deploy
cp .env.example .env
# .env bearbeiten: APP_DOMAIN und ein zufälliges DB_PASSWORD setzen
docker compose up -d --build
docker compose ps
```

Die API ist dann unter `https://DEINE_DOMAIN` erreichbar, der Status unter `/health`. Caddy richtet HTTPS ein. PostgreSQL und API haben keine direkt veröffentlichten Ports; nur Caddy ist von außen erreichbar. Die Daten liegen in Docker-Volumes auf deinem VPS. Für den Datenbankpasswortwert nur Buchstaben und Ziffern nutzen, weil er in die Verbindungs-URL eingesetzt wird.

Backups:

```bash
bash scripts/backup.sh /sicherer/backup-pfad
```

Dieser Aufruf erstellt einen Datenbank-Dump und ein Bildarchiv. Für regelmäßige Sicherungen per Cron aufrufen und verschlüsselt außerhalb des VPS kopieren. Es wird kein Zeitplan automatisch auf deinem Server installiert. Wiederherstellung: API anhalten, Dump mit `pg_restore --clean --if-exists -U alltag -d alltag` einspielen, Bildarchiv in das App-Datenvolume entpacken, API starten. Vor einer Wiederherstellung den aktuellen Stand sichern.

## GitHub-Releases und SideStore

Die Pipeline liegt unter `.github/workflows/release.yml`. Sie führt Tests und TypeScript-Prüfung aus, baut Android und iOS und veröffentlicht erst dann APK, IPA, Update-Manifest, Icon und SideStore-Source.

1. Projekt ohne `.private`, `node_modules`, generierte native Ordner und Datenbanken in ein GitHub-Repository übertragen. `.gitignore` ist enthalten.
2. Repository-Variable `API_URL` auf deine HTTPS-API-Adresse setzen (optional; in der App editierbar).
3. Folgende Repository-Secrets setzen, damit Updates zur zuerst installierten APK passen:
   - `ANDROID_KEYSTORE_BASE64`: Base64-Inhalt von `.private/unser-alltag.keystore` aus deinem privaten Schlüsselpaket.
   - `ANDROID_KEYSTORE_PASSWORD`: Passwort aus `.private/signing.json`.
4. Workflow per **Actions → APK, SideStore IPA und Updates → Run workflow** mit beispielsweise `0.1.1` starten, oder Tag `v0.1.1` pushen.
5. Das Verteilungs-Repository bzw. seine Release-Dateien müssen ohne Anmeldung lesbar sein. Private GitHub-Releases funktionieren nicht direkt als öffentliche SideStore-Source. Für privaten Quellcode besser ein separates öffentliches Verteilungs-Repository verwenden und die Release-Veröffentlichung daran anpassen.

Nach dem ersten erfolgreichen Release:

Alternativ zum manuellen Anlegen der Secrets: Das private Schlüsselpaket in den Projektordner entpacken, GitHub CLI installieren, mit `gh auth login` anmelden und `node scripts/github-setup.mjs BENUTZER/REPOSITORY https://DEINE_DOMAIN` ausführen. Das Script überträgt die Signierungswerte über Standardeingabe an GitHub Secrets; es veröffentlicht weder den Quellcode noch einen Release.

```text
Android-Manifest:
https://github.com/BENUTZER/REPOSITORY/releases/latest/download/update.json

SideStore-Source:
https://github.com/BENUTZER/REPOSITORY/releases/latest/download/sidestore.json
```

Die Source in SideStore hinzufügen. Neue Versionen erscheinen nach dem Aktualisieren der Source. Die App zeigt ebenfalls einen Versionshinweis und einen Link zu SideStore. Die eigentliche Installation und Signierung erfolgen durch SideStore; eine automatische stille iOS-Installation wird nicht versprochen. Kostenlose Apple-Konten benötigen normalerweise spätestens nach sieben Tagen eine erneute Signierung durch SideStore. Source-Metadaten werden bei jedem Release neu erstellt.

**Signaturschlüssel privat sichern:** Die zum lokalen APK-Build erzeugten Dateien liegen in `.private/` und dürfen niemals in ein öffentliches Repository. Ohne denselben Schlüssel kann eine bereits installierte Android-App nicht regulär aktualisiert werden. GitHub erhält diesen Schlüssel ausschließlich über die oben genannten Secrets. Der Quellcode-ZIP enthält keine Signaturschlüssel; sie werden, falls vorhanden, in einem separaten privaten Download geliefert.

## Lokal entwickeln

Node 24 LTS verwenden:

```bash
npm ci
npm test
npm run typecheck
npm run api
```

Die API verwendet ohne `DATABASE_URL` ausschließlich für die lokale Entwicklung SQLite. In Produktion wird PostgreSQL verlangt. Für native App-Entwicklung:

```bash
cd mobile
npx expo start
```

Native Benachrichtigungen am besten in einer installierten App prüfen. APK selbst bauen (Android SDK, JDK 17 und akzeptierte SDK-Lizenzen notwendig):

```bash
cd mobile
npx expo prebuild --platform android --clean --no-install
cd ..
node scripts/android-build.mjs
```

Der Build erzeugt beim ersten lokalen Aufruf einen privaten Release-Schlüssel unter `.private/`. Anschließend wird dieser wiederverwendet. iOS auf einem Mac mit Xcode und CocoaPods:

```bash
bash scripts/ios-build.sh
```

Das Script baut eine unsignierte Geräte-IPA, die SideStore selbst signiert. Kein Simulator-Build. Die Bundle-ID bleibt `at.unseralltag.app`.

Weboberfläche zur lokalen UI-Prüfung:

```bash
npm --workspace mobile run export
npm run dev
```

Port 4173 zeigt dieselben React-Native-Web-Komponenten und stellt einen lokalen Testzugang bereit. Der Testzugang wird nur in dieser lokalen Prüfumgebung angezeigt. Der produktive Docker-Server enthält dessen Endpunkt und Testdaten ausdrücklich nicht.

## Verhalten und Grenzen dieser Version

- Echtzeit bedeutet ereignisbasierten Abgleich bei bestehender Verbindung, keine garantierte Verzögerung von null Millisekunden.
- Daten werden nicht offline als neue Änderungen zwischengespeichert. Bei fehlender Verbindung erscheint ein Fehler; offene Formulare bleiben zum erneuten Speichern erhalten. Bereits geladene Inhalte bleiben bis zum erneuten Abgleich sichtbar.
- Erinnerungen werden lokal auf dem zuständigen Handy geplant, sobald dieses die Aufgabe synchronisiert. Änderungen an Aufgaben, während die App geschlossen ist, erreichen den lokalen Zeitplan erst beim nächsten Öffnen. Es gibt keine APNs-/FCM-Push-Infrastruktur. Bei SideStore ist diese Einschränkung besonders relevant. Systemberechtigungen, Akkuoptimierung und Betriebssystemregeln beeinflussen die Zustellung.
- Eine Aufgabe ohne Zuständigkeit erinnert den Ersteller. Private Aufgaben können ausschließlich der eigenen Person zugewiesen werden.
- Privat markierte Einträge sind auch bei aktivierter Bereichsfreigabe privat. Bei Entzug einer Freigabe verschwinden Einträge auf verbundenen Partnergeräten. Offline-Geräte können zuvor angezeigte Inhalte bis zur nächsten Verbindung noch sehen; bereits Gesehenes lässt sich nicht rückwirkend verbergen.
- Die Zutatenübernahme summiert Mengen unterschiedlicher Gerichte nicht automatisch; Auswahl und Mengen bleiben bewusst kontrollierbar.
- Mitnehm-Modus „Extra Portion“ zeigt eine Vorbereitung an. Die Abendessen-Portionenzahl wird nicht automatisch verändert, damit sie nicht doppelt hochgezählt wird.
- Bildgenerierung übermittelt den Gerichtnamen an den konfigurierten Bilddienst. Ergebnisse sind illustrative KI-Bilder. Wartezeit und Kosten hängen vom Dienst ab. Schlüssel werden nie in die App eingebaut.
- Noch keine Passwort-zurücksetzen-Funktion, kein E-Mail-Versand, kein Gerätesperrbildschirm-Widget.

## Projektstruktur

```text
mobile/src/           Native App, Ansichten, API, lokale Erinnerungen, Updates
mobile/assets/        App-Icon und Beispiel-Gerichtbild
server/src/           API, Datenbankadapter, Rechteprüfung, WebSocket, Bildauftrag
server/test/          Integrationstests mit getrennten Benutzerkonten
deploy/               Docker Compose, Caddy und Umgebungsbeispiel
scripts/              Android-/iOS-Build, Release-Source, Backup, UI-Testserver
.github/workflows/    Build-Schritte, Veröffentlichung bei Versionsrelease
docs/                 Prüfstatus und Betriebshinweise
```
