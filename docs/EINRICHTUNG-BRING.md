# Einrichtung für redshoxx/Bring

Repository: https://github.com/redshoxx/Bring

VPS-Adresse: `152.53.206.242`. Eine Verbindung aus der Entwicklungsumgebung war am 15.10.2026 nicht möglich (`Network is unreachable`). Auf dem VPS wurden keine Änderungen durchgeführt. Eine HTTPS-Domain und ein nutzbarer administrativer Zugang sind noch einzurichten.

## GitHub-Build freischalten

Das private Signierungspaket im Projektordner entpacken. Mit installierter GitHub CLI und `gh auth login`:

```bash
node scripts/github-setup.mjs redshoxx/Bring https://DEINE_API_DOMAIN
```

Alternativ unter Repository → Settings → Secrets and variables → Actions die Secrets `ANDROID_KEYSTORE_BASE64` und `ANDROID_KEYSTORE_PASSWORD` aus dem privaten Paket einrichten. Den Schlüssel niemals als Datei ins Repository hochladen. Die Repository-Variable `API_URL` ist die HTTPS-Serveradresse; sie kann später auch in der App eingegeben werden.

Danach den Workflow **APK, SideStore IPA und Updates** mit Version `0.1.1` starten. Erst nach erfolgreichem Android- und iOS-Build veröffentlicht die Pipeline einen Release.

## Künftige Downloadadressen

Diese Adressen funktionieren erst nach einem erfolgreichen Release:

- APK: https://github.com/redshoxx/Bring/releases/latest/download/Unser-Alltag.apk
- IPA: https://github.com/redshoxx/Bring/releases/latest/download/Unser-Alltag.ipa
- SideStore-Source: https://github.com/redshoxx/Bring/releases/latest/download/sidestore.json
- Update-Manifest: https://github.com/redshoxx/Bring/releases/latest/download/update.json

In der App als GitHub-Projekt `redshoxx/Bring` eintragen. CI-Builds erhalten die Updateadressen automatisch.

## VPS

Eine Subdomain auf `152.53.206.242` zeigen lassen. Anschließend gemäß README Docker Compose mit der passenden `APP_DOMAIN` und einem eigenen Datenbankpasswort starten. Keine unverschlüsselte öffentliche HTTP-Adresse in der nativen App verwenden. Bestehende Webserver und belegte Ports vor dem Start prüfen.
