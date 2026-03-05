#!/usr/bin/env bash
# run_all.sh — Run all approaches × N runs and produce a comparison report.
#
# Usage:
#   bash run_all.sh [--runs N] [--model <model>] [--approaches a,b,c]
#
# Examples:
#   bash run_all.sh                      # 3 runs × 6 approaches, default model
#   bash run_all.sh --runs 1             # quick smoke test
#   bash run_all.sh --approaches mcp,rag # only specific approaches
set -euo pipefail

ROOTDIR=$(git rev-parse --show-toplevel)
SCRIPTS="$ROOTDIR/experiments/scripts"

# ── Defaults ──────────────────────────────────────────────────────────────────
N_RUNS=3
MODEL="claude-haiku-4.5"
JUDGE_MODEL="gpt-5.1-codex-mini"
ALL_APPROACHES=(inline rag local mcp subagent website-crawl)
DISABLED_APPROACHES=(mcp rag subagent inline)  # low-scoring or redundant, re-enable by removing from this list
APPROACHES=()
for _a in "${ALL_APPROACHES[@]}"; do
  _skip=false
  for _d in "${DISABLED_APPROACHES[@]}"; do [[ "$_a" == "$_d" ]] && _skip=true; done
  $_skip || APPROACHES+=("$_a")
done

# ── Arg parsing ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --runs)         N_RUNS="$2";      shift 2;;
    --model)        MODEL="$2";       shift 2;;
    --judge-model)  JUDGE_MODEL="$2"; shift 2;;
    --approaches)
      IFS=',' read -ra APPROACHES <<< "$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--runs N] [--model <model>] [--judge-model <model>] [--approaches a,b,c]"
      exit 1
      ;;
  esac
done

echo "════════════════════════════════════════════════════"
echo " DX Terraform Skill — Experiment Suite"
echo " Approaches : ${APPROACHES[*]}"
echo " Runs       : $N_RUNS per approach"
echo " Model      : $MODEL"
echo " Judge      : $JUDGE_MODEL"
echo "════════════════════════════════════════════════════"

FAILED=()

for approach in "${APPROACHES[@]}"; do
  for run in $(seq 1 "$N_RUNS"); do
    echo ""
    echo "▶ approach=$approach  run=$run"
    if bash "$SCRIPTS/run_experiment.sh" \
        --approach "$approach" \
        --run "$run" \
        --model "$MODEL" \
        --judge-model "$JUDGE_MODEL"; then
      echo "  ✓ done"
    else
      echo "  ✗ FAILED (approach=$approach run=$run)"
      FAILED+=("$approach/run-$run")
    fi
  done
done

echo ""
echo "════════════════════════════════════════════════════"
echo " All runs complete — generating comparison report"
echo "════════════════════════════════════════════════════"

REPORT="$ROOTDIR/experiments/results/comparison.md"
# Pass the active approaches to the comparison script to filter out disabled ones
python3 "$SCRIPTS/compare_results.py" --md "${APPROACHES[@]}" | tee "$REPORT"

echo ""
echo "Report written to: $REPORT"

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo ""
  echo "⚠️  Failed runs:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi
