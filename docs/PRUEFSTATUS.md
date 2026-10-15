# Prüfstatus · 15.10.2026

## Erfolgreich geprüft

`npm test`: 6 Tests, 6 bestanden.

- Separate Benutzer und Haushalte; dritte Person bekommt keine fremden Daten.
- Standardmäßig private Ausgaben trotz gemeinsamer Einkaufsliste.
- Partner darf private Aufgaben und freigegebene Finanzen nicht verändern.
- Eine Freigabeänderung wird im WebSocket-Snapshot berücksichtigt; private Inhalte fehlen in allen Partnernachrichten.
- Gleichzeitige Änderungen mit derselben Revision: genau eine erfolgreich, eine HTTP 409.
- Partner trennen und Abmelden entziehen den Zugriff.
- Validierung von Einträgen, Zuständigkeiten und nicht vorhandenen Bildern.
- Release-Generator gegen offizielles SideStore-JSON-Schema validiert; Version, Downloadadressen und APK-SHA256 stimmen mit Testdateien überein. Dabei wurden ausschließlich ausdrücklich als Fixtures erzeugte Testbytes verwendet, keine angeblichen Installationsdateien.

`npm run typecheck`: erfolgreich.

`expo export --platform android --platform ios`: beide Hermes-Bundles erfolgreich. Das prüft JavaScript und dessen native Imports, ersetzt aber keinen nativen Build oder Gerätetest.

`expo prebuild`: Android- und iOS-Projektgenerierung erfolgreich. Geprüft: Bundle-ID `at.unseralltag.app`, iOS-Scheme `UnserAlltag`, iOS-Zielversion 15.1, Android-Minimum API 24.

Browser mit echtem lokalen Backend: Testzugang, Einkaufsmenge ändern, abhaken, neuen Artikel hinzufügen, löschen und rückgängig machen; sieben Tage im Wochenplan, neues Abendessen mit Zutaten speichern. Fehler bei Web-UUIDs gefunden und mit kryptografischen Zufallsbytes korrigiert. Native HTTP-Abbrüche verwenden einen normalen AbortController, weil React Native 0.81 kein `AbortSignal.timeout()` bereitstellt.

## Noch offen / blockiert

- Installierbare APK: lokaler Gradle-Build scheitert an HTTP 403 für native Maven-/Google-Abhängigkeiten. Keine APK als fertig ausgegeben.
- iOS-Archive/IPA und tatsächliche SideStore-Installation: benötigen macOS/Xcode und einen erfolgreichen Pipeline-Lauf; hier nicht ausgeführt.
- Lokale Benachrichtigungen auf echten Android-/iPhone-Geräten: implementiert, noch nicht am Gerät überprüft. Keine APNs-/FCM-Push-Infrastruktur.
- Produktiver PostgreSQL-/Docker-Start auf dem Ziel-VPS: vorbereitet, nicht auf dem VPS ausgeführt. API-Tests liefen mit dem lokalen SQLite-Adapter.
- Automatische Bildgenerierung: Serverauftrag und API-Anbindung implementiert; ohne bereitgestellten Bilddienst-Schlüssel keine Live-Generierung geprüft.
- GitHub-Repository, Releases und öffentliche SideStore-Source: noch nicht veröffentlicht; konkretes Repository fehlt.

## Schema-Quelle

`sidestore.schema.json` stammt von https://github.com/SideStore/sidestore-source-types/blob/main/schema.json und wurde am 15.10.2026 abgerufen. Der Generator verwendet dessen kompatible Felder; keine erfundenen Download-Dateien werden ausgeliefert.
