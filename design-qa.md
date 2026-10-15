# Designprüfung · 15.10.2026

## Ergebnis und Umfang

Die geprüften Webansichten der tatsächlichen React-Native-Komponenten sind benutzbar und visuell mit dem gewählten Entwurf abgestimmt. Dies ist eine UI-Prüfung mit lokalem Backend, kein Nachweis einer installierten Android- oder iPhone-App. Der native Android-Build ist durch HTTP-403-Antworten beim Bezug von Abhängigkeiten blockiert; eine iOS-Kompilierung wurde nicht ausgeführt.

## Referenz und Vergleich

- Freigegebener Bildentwurf: `docs/design-reference.png`.
- Prüfung im mobilen Inhaltsbereich mit 393 × 852 Pixeln.
- Interne Screenshots: `/workspace/scratch/alltag-qa-shopping-final.jpg` und `/workspace/scratch/alltag-qa-compare-final.jpg`. Sie sind keine Bestandteile der Auslieferung.
- Für den Vergleich wurde der Einkaufsbildschirm aus dem Entwurf ausgeschnitten und auf eine vergleichbare Breite skaliert. Die Montage ist eine visuelle Gegenüberstellung, kein pixelgenauer Differenztest.

## Geprüfte Merkmale

Warmer Hintergrund, Aubergine als Hauptfarbe, fliederfarbene Flächen, abgerundete Karten, deutliche Häkchen, erreichbare Bearbeiten-/Löschen-Aktionen und eine feste untere Navigation sind umgesetzt. Die anfangs zu kleine Typografie wurde vergrößert: Überschrift 32, hervorgehobener Listentext 16, kleine Texte 13 Pixel. Im geprüften Ausschnitt gab es danach keine abgeschnittenen Listentexte oder überlappenden Aktionen.

Besucht wurden Heute, Einkauf, Woche und Aufgaben sowie die Formulare zur Einkaufsbearbeitung und zur Erstellung eines Abendessens. Einkäufe konnten ergänzt, geändert, abgehakt, gelöscht und wiederhergestellt werden. Ein neues Abendessen einschließlich Zutaten wurde im Backend gespeichert. Der Wochenplan enthält sieben Tage und einen getrennten Mitnehm-Bereich. Aufgaben zeigen den Hinweis auf die Erinnerung einen Tag zuvor; die Auslösung einer nativen Benachrichtigung wurde hier nicht geprüft.

Die Fehlerabfrage für die lokale App-Adresse lieferte nach den Korrekturen keine Browserfehler. Mehr/Partner und optionale Module wurden nicht vollständig visuell durchgeklickt; ihre Zugriffskontrolle ist Gegenstand der API-Tests.

## Verbleibende Abweichungen

- P3: Schriftmetriken und einzelne Abstände unterscheiden sich vom generierten Entwurf. Eine exakte Font-/Maßvorlage liegt nicht vor.
- P3: Waren, Erledigt-Zähler und Partneranzeige hängen vom echten Datenstand ab. Das Prüfkonto war nicht mit einem Partner verbunden.
- Gerichtbilder werden nur bei konfiguriertem Bilddienst erzeugt. Ein mitgeliefertes Beispielbild ist keine erfolgreich geprüfte Live-Generierung.

Geräteprüfung, Tastaturverhalten, native Systemleisten und Berechtigungsdialoge bleiben vor der Veröffentlichung zu prüfen. Den vollständigen technischen Prüfstand dokumentiert `docs/PRUEFSTATUS.md`.
