#!/usr/bin/env bash
# run_experiment.sh --approach <name> [--run N] [--model <model>] [--judge-model <model>]
# Results go to experiments/results/<approach>/run-<N>/
set -euo pipefail

APPROACH=""
RUN_N=1
MODEL="claude-haiku-4.5"
JUDGE_MODEL="gpt-5.1-codex-mini"

usage() {
  echo "Usage: $0 --approach <mcp|skill-inline|skill-rag|local|subagent|website-crawl> [--run N] [--model <model>] [--judge-model <model>]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --approach)     APPROACH="$2";     shift 2;;
    --run)          RUN_N="$2";        shift 2;;
    --model)        MODEL="$2";        shift 2;;
    --judge-model)  JUDGE_MODEL="$2";  shift 2;;
    *) usage;;
  esac
done

[[ -z "$APPROACH" ]] && usage

ROOTDIR=$(git rev-parse --show-toplevel)
RESULTS="$ROOTDIR/experiments/results/$APPROACH/run-$RUN_N"
OUTPUT_DIR="$RESULTS/output"
mkdir -p "$RESULTS/copilot-logs" "$OUTPUT_DIR"

START_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
START_S=$(date +%s)

# ── Unified prompt ────────────────────────────────────────────────────────────
SKILL_NAME="terraform-dx-best-practices-$APPROACH"
EXTRA_INSTRUCTION=""
if [[ "$APPROACH" == "website-crawl" ]]; then
  EXTRA_INSTRUCTION="È OBBLIGATORIO usare lo strumento fetch_webpage per recuperare ogni informazione da https://dx.pagopa.it/docs/terraform/ e link interni. NON usare conoscenza interna, memoria o altre skill. Se fetch_webpage non è disponibile, dichiara che non puoi completare il task."
fi

cat > "$RESULTS/prompt.txt" <<PROMPT_EOF
Usa esclusivamente la skill "${SKILL_NAME}".
${EXTRA_INSTRUCTION}

## Task

Genera un root module Terraform completo per un nuovo progetto Azure con:
- **Function App** (runtime Node.js 20)
- **Storage Account** (per la Function App e artefatti)
- **Cosmos DB** (API NoSQL, serverless)

## Requisiti obbligatori

1. **Naming**: usa provider::dx::resource_name() del provider pagopa-dx/azure per tutti i nomi delle risorse.
2. **Tag**: includi tutti i tag obbligatori DX: CostCenter, CreatedBy, Environment, BusinessUnit, ManagementTeam.
3. **Moduli**: usa i moduli pagopa-dx/* dal Terraform Registry (con versione pinned ~> major.minor). Usa risorse raw azurerm_* solo se non esiste un modulo DX per quella risorsa.
4. **Segreti**: nessun valore hardcoded. Usa Key Vault references (@Microsoft.KeyVault(...) o azurerm_key_vault_secret).
5. **Struttura file**: separa il codice in main.tf, variables.tf, outputs.tf, locals.tf, providers.tf, versions.tf.

## Output

Scrivi i file Terraform direttamente nella cartella: ${OUTPUT_DIR}

Crea ogni file separatamente. Non scrivere blocchi di codice in chat. Al termine includi un breve README.md nella stessa cartella che spieghi come la skill ha recuperato la documentazione e le scelte fatte.
PROMPT_EOF

cp "${ROOTDIR}/experiments/checklist.json" "$RESULTS/checklist.json"


# ── Copilot CLI args ──────────────────────────────────────────────────────────
# All approaches use terraform and azure MCP tools; only mcp enables dx server
BASE_ARGS="--model $MODEL --allow-all --silent \
  --add-github-mcp-tool terraform --add-github-mcp-tool azure \
  --log-dir $RESULTS/copilot-logs --log-level debug \
  --share $RESULTS/copilot-session.md \
  --disable-mcp-server dx"

case "$APPROACH" in
  local)
    COPILOT_ARGS="$BASE_ARGS --add-dir ${ROOTDIR}/apps/website/docs/terraform"
    ;;
  mcp)
    # Enable DX MCP server for mcp approach (keep terraform + azure)
    COPILOT_ARGS="--model $MODEL --allow-all --silent \
      --add-github-mcp-tool terraform --add-github-mcp-tool azure \
      --log-dir $RESULTS/copilot-logs --log-level debug \
      --share $RESULTS/copilot-session.md"
    ;;
  *)
    COPILOT_ARGS="$BASE_ARGS"
    ;;
esac

# ── Run Copilot ───────────────────────────────────────────────────────────────
echo "[INFO] approach=$APPROACH run=$RUN_N model=$MODEL" | tee "$RESULTS/run.log"
echo "[INFO] output_dir=$OUTPUT_DIR" >> "$RESULTS/run.log"

# Clean output directory to avoid Copilot using previous run artifacts
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
echo "[INFO] Cleaned output directory before run" >> "$RESULTS/run.log"

if copilot -p "$(cat "$RESULTS/prompt.txt")" $COPILOT_ARGS 2>> "$RESULTS/run.log"; then
  echo "[INFO] Copilot CLI completed successfully." >> "$RESULTS/run.log"
else
  echo "[WARN] Copilot CLI exited non-zero; results may be partial." >> "$RESULTS/run.log"
fi

END_S=$(date +%s)
DURATION=$((END_S - START_S))

# ── Count tool calls from log ─────────────────────────────────────────────────
LATEST_LOG=$(ls -1t "$RESULTS/copilot-logs"/process-*.log 2>/dev/null | head -n1 || true)
TOOL_CALLS=0
if [[ -f "$LATEST_LOG" ]]; then
  # Use head -1 to take only first line, handle grep errors safely
  TOOL_CALLS=$(grep -c '"type":"tool_use"' "$LATEST_LOG" 2>/dev/null | head -1 || echo "0")
fi
# Validate it's a number, default to 0 if not
if ! [[ "$TOOL_CALLS" =~ ^[0-9]+$ ]]; then
  TOOL_CALLS=0
fi

# ── Evaluate output (deterministic) ──────────────────────────────────────────
bash "${ROOTDIR}/experiments/scripts/evaluate.sh" "$OUTPUT_DIR" "$RESULTS/score.json" \
  >> "$RESULTS/run.log" 2>&1 || true

SCORE=0
if [[ -f "$RESULTS/score.json" ]]; then
  SCORE=$(python3 -c "import json; d=json.load(open('$RESULTS/score.json')); print(d['score'])" 2>/dev/null || echo "0")
fi
if ! [[ "$SCORE" =~ ^[0-9]+$ ]]; then
  SCORE=0
fi

# ── LLM Judge (qualitative) ───────────────────────────────────────────────────
bash "${ROOTDIR}/experiments/scripts/llm_judge.sh" "$OUTPUT_DIR" "$RESULTS/llm_score.json" "$JUDGE_MODEL" \
  >> "$RESULTS/run.log" 2>&1 || true

LLM_SCORE=0
if [[ -f "$RESULTS/llm_score.json" ]]; then
  LLM_SCORE=$(python3 -c "import json; d=json.load(open('$RESULTS/llm_score.json')); print(d['llm_score'])" 2>/dev/null || echo "0")
fi
if ! [[ "$LLM_SCORE" =~ ^[0-9]+$ ]]; then
  LLM_SCORE=0
fi

# ── Metrics ───────────────────────────────────────────────────────────────────
python3 << PYTHON_EOF
import json

metrics = {
    "approach": "$APPROACH",
    "run": $RUN_N,
    "model": "$MODEL",
    "judge_model": "$JUDGE_MODEL",
    "timestamp": "$START_TS",
    "duration_s": $DURATION,
    "tool_calls": $TOOL_CALLS,
    "score": $SCORE,
    "score_max": 16,
    "llm_score": $LLM_SCORE,
    "llm_score_max": 40,
}

with open("$RESULTS/metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)
PYTHON_EOF

# ── Summary via Copilot (stdin) ───────────────────────────────────────────────
if [[ -f "$LATEST_LOG" ]]; then
  echo "[INFO] Generating summary..." >> "$RESULTS/run.log"
  TMP=$(mktemp)
  SUMMARY_PROMPT="Riepiloga in modo leggibile e sintetico il seguente log Copilot, evidenziando: ragionamento, strumenti chiamati (fetch_webpage, MCP tools, bash, ecc.), errori, passaggi chiave e output generato. Scrivi in italiano. Includi una sezione 'Strumenti usati' con l'elenco dei tool call."
  copilot -p "$SUMMARY_PROMPT" \
    --model "$MODEL" --allow-all --silent \
    < "$LATEST_LOG" > "$TMP" 2>> "$RESULTS/run.log" || true
  if [[ -s "$TMP" ]]; then
    mv "$TMP" "$RESULTS/summary.md"
    echo "[INFO] summary.md written." >> "$RESULTS/run.log"
  else
    rm -f "$TMP"
    echo "[WARN] summary.md empty — Copilot returned no output." >> "$RESULTS/run.log"
  fi
fi

echo "──────────────────────────────────────────────"
echo " Experiment complete"
echo " Approach : $APPROACH  Run : $RUN_N"
echo " Score    : $SCORE/16  LLM: ${LLM_SCORE}/40  Duration: ${DURATION}s"
echo " Results  : $RESULTS"
echo "──────────────────────────────────────────────"
