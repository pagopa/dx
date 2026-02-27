#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 '<query>'"
  exit 1
fi

QUERY="$1"

echo "Querying DX search API for: $QUERY"

curl -s -X POST https://api.dx.pagopa.it/search \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${QUERY}\", \"number_of_results\": 5}" | jq .

echo "If results contain a field like \"full_doc_url\", download it with:"
echo "  curl -s <full_doc_url> -o doc.md"
