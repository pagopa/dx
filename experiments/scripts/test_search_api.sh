#!/usr/bin/env bash
set -euo pipefail

QUERY="$1"
OUTDIR="../../results/search-api-test"
mkdir -p "$OUTDIR"

echo "Testing DX Search API for query: $QUERY"

RESP=$(curl -s -X POST https://api.dx.pagopa.it/search \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\", \"number_of_results\": 5}")

# Save raw response
echo "$RESP" > "$OUTDIR/response.json"

# Try to find a full_doc_url in the results
FULLURL=$(echo "$RESP" | jq -r '.results[]?.full_doc_url // empty' | head -n1 || true)

if [ -n "$FULLURL" ]; then
  echo "Found full_doc_url: $FULLURL"
  curl -s "$FULLURL" -o "$OUTDIR/full_doc.md"
  echo "Downloaded full document to $OUTDIR/full_doc.md"
  jq -r '.results[]?.source' "$OUTDIR/response.json" > "$OUTDIR/sources.txt"
  exit 0
else
  echo "No full_doc_url found in search results. See $OUTDIR/response.json"
  exit 2
fi
