# Unser Alltag starten

Diese Lieferung enthält den implementierten App-Quellcode, den VPS-Server und die GitHub-Pipeline. **Es ist noch keine fertig geprüfte APK oder IPA enthalten.** Der lokale APK-Build wurde beim Herunterladen nativer Android-Abhängigkeiten durch HTTP 403 blockiert. Der iPhone-Build benötigt einen macOS-Runner mit Xcode.

## Der kürzeste Weg zur Installation

1. Ein GitHub-Repository für dieses Projekt bereitstellen.
2. Den Quellcode übertragen. Das beiliegende private Schlüsselpaket nicht hochladen.
3. Die zwei Android-Signierungssecrets einrichten, wie in README beschrieben.
4. Unter Actions den Workflow **APK, SideStore IPA und Updates** mit Version `0.1.1` starten.
5. Nach einem erfolgreichen Lauf liegen APK, IPA, `sidestore.json` und `update.json` gemeinsam im Release.
6. APK auf Android installieren; die Source-Adresse in SideStore hinzufügen.

Zusätzlich das Backend aus `deploy/` auf deinem VPS starten und die HTTPS-Adresse in beiden Apps eintragen. Ohne eingerichtetes Backend können noch keine Konten oder gemeinsamen Daten verwendet werden.

## Was bereits geprüft ist

- TypeScript ohne Fehler.
- JavaScript-/Hermes-Bundles für Android und iPhone erfolgreich erzeugt.
- Sechs Integrationstests erfolgreich: Benutzertrennung, Partnerfreigaben, Konflikte bei gleichzeitiger Bearbeitung, WebSocket-Abgleich, Trennen/Abmelden, Eingabeprüfung und SideStore-Source-Schema.
- Einkaufsliste und Tagesgericht mit dem echten lokalen Backend im Browser bedient.
- iOS-Projektgenerierung und Bundle-ID/Scheme geprüft; keine macOS-Kompilierung oder SideStore-Installation in dieser Umgebung.

## Für den nächsten Einrichtungsschritt benötigt

- Der Link zum gewünschten GitHub-Repository.
- Die Domain/Subdomain für den VPS-Server.
- Ein verfügbarer Zugriff auf deinen VPS für die Installation.

Passwörter oder API-Schlüssel bitte nicht in öffentliche Dateien oder GitHub-Commits einfügen. Ein Bilddienst-Schlüssel gehört ausschließlich in `deploy/.env` auf deinem VPS. Die automatische Bilderzeugung ist ohne diesen Zugang nicht aktiv.

Die ausführliche Anleitung und ehrliche Funktionsgrenzen stehen in `README.md`.
