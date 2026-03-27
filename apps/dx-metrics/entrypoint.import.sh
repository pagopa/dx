#!/bin/sh
# Entrypoint for the DX metrics import job.
# Computes the --since date from IMPORT_SINCE_DAYS (default: 30) and launches the import script.
set -eu

SINCE=$(node -e "const d=new Date();d.setDate(d.getDate()-${IMPORT_SINCE_DAYS:-30});process.stdout.write(d.toISOString().slice(0,10))")

echo "Starting DX metrics import since ${SINCE}"
exec tsx scripts/import.ts --since "${SINCE}"
