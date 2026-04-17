#!/bin/bash

set -e
set -o pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Executes 'terraform apply' and filters the output after completion."
  echo "The script accepts both command-line arguments and environment variables."
  echo "Command-line arguments take precedence."
  echo
  echo "Options / Environment Variables:"
  echo "  --plan-file           (Var: PLAN_FILE) The terraform plan file to apply. (Required)"
  echo "  --sensitive-keys      (Var: SENSITIVE_KEYS) A comma-separated list of sensitive keys. (Required)"
  echo "  -h, --help            Show this help message."
  exit 1
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --plan-file)
      PLAN_FILE="$2"
      shift 2
      ;;
    --sensitive-keys)
      SENSITIVE_KEYS="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Error: Unrecognized option: $1"
      usage
      ;;
  esac
done

if [[ -z "${PLAN_FILE:-}" || -z "${SENSITIVE_KEYS:-}" ]]; then
  echo "::error::The following parameters are required (via arguments or environment variables): --plan-file, --sensitive-keys"
  usage
fi

echo "--- Executing Apply ---"

set +e

# Applying a saved plan file is already non-interactive in CI.
RAW_OUTPUT_FILE=$(mktemp)
trap 'rm -f -- "$RAW_OUTPUT_FILE"' EXIT

terraform apply \
  -lock-timeout=120s \
  -no-color \
  -auto-approve \
  -input=false \
  "$PLAN_FILE" >"$RAW_OUTPUT_FILE" 2>&1

APPLY_EXIT_CODE=$?

bash "$SCRIPT_DIR/mask_output.sh" --sensitive-keys "$SENSITIVE_KEYS" < "$RAW_OUTPUT_FILE"
MASK_EXIT_CODE=$?

set -e

if [[ "$MASK_EXIT_CODE" -ne 0 ]]; then
  echo "::error::Terraform apply output filtering failed."
  exit "$MASK_EXIT_CODE"
fi

if [[ "$APPLY_EXIT_CODE" -ne 0 ]]; then
  echo "::error::Terraform apply failed."
  exit "$APPLY_EXIT_CODE"
fi
