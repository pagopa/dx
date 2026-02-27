#!/usr/bin/env bash
set -euo pipefail

usage(){
  echo "Usage: $0 --approach <mcp|skill-inline|skill-rag|local|subagent>"
  exit 1
}

if [ "$#" -lt 2 ]; then
  usage
fi

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --approach)
      APPROACH="$2"
      shift; shift;
      ;;
    *)
      usage
      ;;
  esac
done

ROOTDIR=$(git rev-parse --show-toplevel)
RESULTS="$ROOTDIR/experiments/results/$APPROACH"
mkdir -p "$RESULTS"


# Genera prompt che obbliga l'uso della skill derivata corretta

if [[ "$APPROACH" == "website-crawl" ]]; then
  cat > "$RESULTS/prompt.txt" <<EOF
Devi risolvere il seguente task Terraform usando esclusivamente la skill "terraform-dx-best-practices-website-crawl".
È OBBLIGATORIO usare lo strumento fetch_webpage per recuperare ogni informazione: NON puoi usare conoscenza interna, memoria, o altre skill. Ogni dettaglio, esempio o best practice deve essere ottenuto tramite fetch_webpage sulle pagine del sito https://dx.pagopa.it/docs/terraform/ e link interni. Se fetch_webpage non è disponibile, rispondi che non puoi completare il task.

Task:
Sto iniziando un nuovo progetto. Mi serve un esempio di root module Terraform per:
- una Function App Node.js
- uno Storage Account
- un Database Cosmos DB

Scrivi direttamente i file Terraform generati nella cartella output di questo esperimento (
$RESULTS/output). Se necessario, crea la struttura di file e sottocartelle. Includi README.md e ogni file utile. Non scrivere il risultato in output.txt, ma solo nei file nella cartella output.

Spiega brevemente come la skill "terraform-dx-best-practices-website-crawl" accede alla documentazione e poi genera il risultato.
EOF
else
  cat > "$RESULTS/prompt.txt" <<EOF
Devi risolvere il seguente task Terraform usando esclusivamente la skill "terraform-dx-best-practices-$APPROACH".

Task:
Sto iniziando un nuovo progetto. Mi serve un esempio di root module Terraform per:
- una Function App Node.js
- uno Storage Account
- un Database Cosmos DB

Scrivi direttamente i file Terraform generati nella cartella output di questo esperimento (
$RESULTS/output). Se necessario, crea la struttura di file e sottocartelle. Includi README.md e ogni file utile. Non scrivere il risultato in output.txt, ma solo nei file nella cartella output.

Spiega brevemente come la skill "terraform-dx-best-practices-$APPROACH" accede alla documentazione e poi genera il risultato.
EOF
fi

cp "${ROOTDIR}/experiments/prompts/checklist.yaml" "$RESULTS/checklist.yaml"


# Generazione reale con Copilot CLI
PROMPT_FILE="$RESULTS/prompt.txt"
# Prepare per-experiment Copilot logs
mkdir -p "$RESULTS/copilot-logs"

# Di default abilita tutti gli MCP server tranne dx
COPILOT_ARGS="--model gpt-5-mini --allow-all --silent --add-github-mcp-toolset all --log-dir $RESULTS/copilot-logs --log-level debug --share $RESULTS/copilot-session.md --disable-mcp-server dx"

case "$APPROACH" in
  local)
    COPILOT_ARGS="$COPILOT_ARGS --add-dir ./apps/website/docs/terraform";;
  mcp)
    # Per mcp, abilita anche dx
    COPILOT_ARGS="--model gpt-5-mini --allow-all --silent --add-github-mcp-toolset all --add-github-mcp-tool terraform --log-dir $RESULTS/copilot-logs --log-level debug --share $RESULTS/copilot-session.md";;
esac

echo "[INFO] Approach: $APPROACH" > "$RESULTS/run.log"
echo "[INFO] Invoking Copilot CLI..." >> "$RESULTS/run.log"
if copilot -p "$(cat $PROMPT_FILE)" $COPILOT_ARGS 2>> "$RESULTS/run.log"; then
  echo "[INFO] Copilot CLI completed successfully." >> "$RESULTS/run.log"
else
  echo "[ERROR] Copilot CLI failed; check $RESULTS/run.log and $RESULTS/copilot-logs" >> "$RESULTS/run.log"
fi
echo "[INFO] Copilot logs: $RESULTS/copilot-logs" >> "$RESULTS/run.log"
echo "[INFO] Copilot session saved: $RESULTS/copilot-session.md (if created)" >> "$RESULTS/run.log"

# Example: test search-api availability if approach uses RAG
if [ "$APPROACH" = "skill-rag" ] || [ "$APPROACH" = "mcp" ]; then
  echo "[INFO] Running search-api test"
  bash "${ROOTDIR}/experiments/scripts/test_search_api.sh" "Terraform code style" || true
  cp "${ROOTDIR}/results/search-api-test/response.json" "$RESULTS/" 2>/dev/null || true
fi

# run pre-commit checks on generated directory if exists
if [ -d "$ROOTDIR/generated" ]; then
  echo "[INFO] Running pre-commit on generated files"
  pre-commit run --files generated/**/*.tf || true
fi

echo "{\"approach\": \"$APPROACH\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$RESULTS/metrics.json"

# Sintesi dei log Copilot
LOGFILE=$(ls -1t "$RESULTS/copilot-logs"/process-*.log 2>/dev/null | head -n1)
echo "[DEBUG] LOGFILE scelto per sintesi: $LOGFILE" >> "$RESULTS/run.log"
echo "[DEBUG] Elenco file in copilot-logs:" >> "$RESULTS/run.log"
ls -l "$RESULTS/copilot-logs" >> "$RESULTS/run.log"
if [[ -f "$LOGFILE" ]]; then
  echo "[INFO] Sintetizzo i log Copilot in $RESULTS/summary.md"
  TMP_SUMMARY=$(mktemp)
  copilot -p "Riepiloga in modo leggibile e sintetico il seguente log Copilot, evidenziando ragionamento, errori, passaggi chiave e output generato. Scrivi in italiano." < "$LOGFILE" > "$TMP_SUMMARY" 2>> "$RESULTS/run.log"
  if [[ -s "$TMP_SUMMARY" ]]; then
    mv "$TMP_SUMMARY" "$RESULTS/summary.md"
  else
    echo "[WARN] Sintesi Copilot vuota, controlla log e input." >> "$RESULTS/run.log"
    rm "$TMP_SUMMARY"
  fi
else
  echo "[ERROR] Nessun log Copilot trovato per la sintesi." >> "$RESULTS/run.log"
fi

echo "Experiment scaffold complete. Results in $RESULTS"
