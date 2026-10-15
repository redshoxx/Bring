#!/usr/bin/env bash
set -euo pipefail
umask 077
task_root="$(cd "$(dirname "$0")/.." && pwd)"
backup_dir="${1:?Zielverzeichnis für das Backup angeben}"
mkdir -p "$backup_dir"
stamp="$(date -u +%Y%m%d-%H%M%S)"
cd "$task_root/deploy"
docker compose exec -T database pg_dump -U alltag -d alltag --format=custom > "$backup_dir/database-$stamp.dump"
docker compose exec -T api tar -C /app/server/data -czf - images > "$backup_dir/images-$stamp.tar.gz"
echo 'Datenbank- und Bilderbackup erstellt. Verschlüsselt auf einen anderen Speicher kopieren.'
