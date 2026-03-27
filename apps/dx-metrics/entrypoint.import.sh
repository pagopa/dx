#!/bin/sh
# Entrypoint for the DX metrics import job.
# Computes the --since date from IMPORT_SINCE_DAYS (default: 30) and launches the import script.
set -eu

SINCE=$(node -e 'const raw = process.env.IMPORT_SINCE_DAYS; const parsed = parseInt(raw, 10); const days = Number.isFinite(parsed) && parsed >= 0 ? parsed : 30; const d = new Date(); d.setDate(d.getDate() - days); process.stdout.write(d.toISOString().slice(0, 10));')

echo "Starting DX metrics import since ${SINCE}"
exec tsx scripts/import.ts --since "${SINCE}"
