#!/usr/bin/env bash
set -euo pipefail

APP="/home/rizqunaid/nukarangsalam2-koinnu"
BACKUP_DIR="$APP/backups"
mkdir -p "$BACKUP_DIR"

TS=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/koin_nu-$TS.sql"
TMP="$OUT.tmp"

echo "Starting PostgreSQL backup for koin_nu..."
if ! docker exec keuangan_db pg_dump -U postgres -d koin_nu > "$TMP"; then
  echo "Backup failed!" >&2
  rm -f "$TMP"
  exit 1
fi

mv "$TMP" "$OUT"
gzip -f "$OUT"
echo "Backup compressed: $OUT.gz"

# Delete backups older than 14 days
find "$BACKUP_DIR" -type f -name 'koin_nu-*.sql.gz' -mtime +14 -delete

LATEST="$BACKUP_DIR/latest.txt"
ls -1t "$BACKUP_DIR"/koin_nu-*.sql.gz | head -1 > "$LATEST"
echo "Backup complete: $(cat "$LATEST")"
