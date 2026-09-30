#!/usr/bin/env bash

set -euo pipefail

printf '%s\n' "$*" >> "$MOCK_LOG"

if [[ "$*" == *"ingress traffic"* ]]; then
  echo "Unexpected traffic mutation" >&2
  exit 1
fi

if [[ "${1:-} ${2:-}" == "containerapp show" ]]; then
  if [[ "${MOCK_FAIL:-}" == "show" ]]; then
    echo "Azure query failed" >&2
    exit 1
  fi
  cat "$MOCK_STATE"
  exit 0
fi

if [[ "${1:-} ${2:-} ${3:-}" != "containerapp revision label" ]]; then
  echo "Unexpected Azure command" >&2
  exit 1
fi

operation=$4
shift 4
revision=""
label=""
yes=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --revision) revision=$2; shift 2 ;;
    --label) label=$2; shift 2 ;;
    --yes) yes=true; shift ;;
    --name|--resource-group|--output) shift 2 ;;
    *) echo "Unexpected argument: $1" >&2; exit 1 ;;
  esac
done

if [[ "$label" != "staging" || "${MOCK_FAIL:-}" == "$operation" ]]; then
  echo "Azure label mutation failed" >&2
  exit 1
fi

if [[ "$operation" == "add" && "$yes" != true ]]; then
  echo "Missing noninteractive label transfer" >&2
  exit 1
fi
if [[ "$operation" == "remove" && -n "$revision" ]]; then
  echo "Label removal does not accept a revision argument" >&2
  exit 1
fi
if [[ "${MOCK_RETAIN_LABEL:-}" == "true" ]]; then
  exit 0
fi

case "$operation" in
  add)
    jq --arg revision "$revision" '
      .traffic |= map(
        (if .label == "staging" then del(.label) else . end) |
        if .revisionName == $revision then .label = "staging" else . end
      ) |
      if any(.traffic[]; .revisionName == $revision) then .
      else .traffic += [{revisionName: $revision, latestRevision: false, weight: 0, label: "staging"}]
      end
    ' "$MOCK_STATE" > "$MOCK_STATE.next"
    ;;
  remove)
    jq '.traffic |= map(if .label == "staging" then del(.label) else . end)' \
      "$MOCK_STATE" > "$MOCK_STATE.next"
    ;;
  *) echo "Unexpected label operation: $operation" >&2; exit 1 ;;
esac
mv "$MOCK_STATE.next" "$MOCK_STATE"
