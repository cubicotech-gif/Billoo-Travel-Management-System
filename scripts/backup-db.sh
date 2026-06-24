#!/usr/bin/env bash
# Manual on-demand database backup. Same dump the daily GitHub Action takes, but
# run from your own machine whenever you want a snapshot (e.g. right before
# running any SQL migration).
#
# Usage:
#   export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres'
#   ./scripts/backup-db.sh
#
# Restore a dump:
#   gunzip -c backups/billoo-YYYYMMDD-HHMMSS.sql.gz | psql "$SUPABASE_DB_URL"
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Supabase → Settings → Database → Connection string → URI)}"

mkdir -p backups
stamp="$(date +%Y%m%d-%H%M%S)"
out="backups/billoo-${stamp}.sql.gz"

echo "Dumping database → ${out}"
pg_dump "${SUPABASE_DB_URL}" --no-owner --no-privileges | gzip > "${out}"
echo "Done: ${out} ($(du -h "${out}" | cut -f1))"
