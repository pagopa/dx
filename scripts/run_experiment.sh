#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 --approach <mcp|skill-inline|skill-rag|local|subagent|website-crawl> [--out results/]"
  exit 1
}

APPROACH=""
OUT_DIR="results"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --approach) APPROACH="$2"; shift 2;;
    --out) OUT_DIR="$2"; shift 2;;
    -h|--help) usage;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

if [[ -z "$APPROACH" ]]; then
  usage
fi

mkdir -p "$OUT_DIR/$APPROACH"
echo "Running experiment: $APPROACH -> $OUT_DIR/$APPROACH"


# Prompt che obbliga l'uso della skill derivata corretta (incluso website-crawl)
PROMPT_DIR="experiments/prompts"
PROMPT_FILE="$PROMPT_DIR/$APPROACH.txt"
cat > "$PROMPT_FILE" <<EOF
Devi risolvere il seguente task Terraform usando esclusivamente la skill "terraform-dx-best-practices-$APPROACH".

Task:
Sto iniziando un nuovo progetto. Mi serve un esempio di root module Terraform per:
- una Function App Node.js
- uno Storage Account
- un Database PostgreSQL

Spiega brevemente come la skill "terraform-dx-best-practices-$APPROACH" accede alla documentazione e poi genera il risultato.
EOF

# Parametri CLI per ogni approccio
COPILOT_ARGS="--model gpt-5-mini --allow-all --silent --add-github-mcp-tool terraform"
case "$APPROACH" in
  skill-inline)
    ;; # default
  skill-rag)
    ;; # default
  local)
    COPILOT_ARGS="$COPILOT_ARGS --add-dir ./apps/website/docs/terraform";;
  mcp)
    COPILOT_ARGS="$COPILOT_ARGS --add-github-mcp-toolset all";;
  subagent)
    ;; # default
  website-crawl)
    ;; # default
esac

echo "Running experiment: $APPROACH -> $OUT_DIR/$APPROACH"
echo "Prompt file: $PROMPT_FILE"

copilot -p "$(cat $PROMPT_FILE)" $COPILOT_ARGS > "$OUT_DIR/$APPROACH/output.txt"

echo "Output generato in $OUT_DIR/$APPROACH/output.txt"
