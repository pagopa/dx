#!/bin/bash

set -e
set -o pipefail

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Executes 'terraform apply' and filters the output in realtime."
  echo "The script accepts both command-line arguments and environment variables."
  echo "Command-line arguments take precedence."
  echo
  echo "Options / Environment Variables:"
  echo "  --plan-file           (Var: PLAN_FILE) The terraform plan file to apply. (Required)"
  echo "  --sensitive-keys      (Var: SENSITIVE_KEYS) A comma-separated list of sensitive keys. (Required)"
  echo "  --test                Optional flag for testing (only sed commands will be executed)."
  echo "  -h, --help            Show this help message."
  exit 1
}

MODE="normal"

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
    --test)
      echo "Test mode enabled."
      MODE="test"
      shift 1
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

SED_EXPRESSIONS=()

for key in $(echo "$SENSITIVE_KEYS" | tr ',' '\n'); do
  trimmed_key=$(echo "$key" | xargs)
  if [[ -n "$trimmed_key" ]]; then
    SED_EXPRESSIONS+=(-e "s/(\"?${trimmed_key}[^\"]*\"?\s*=\s*)\"[^\"]*\"/\\1\"[REDACTED]\"/I")
  fi
done

SED_EXPRESSIONS+=(
  -e "s/-----BEGIN[[:space:]]+.*?-----.*?-----END[[:space:]]+.*?-----/[REDACTED]/gI"
  -e "s/(\"?[^\"[:space:]]*(AccessKey|AccountKey|Password|secret|SecretToken|AuthToken|auth_token|access_key|apiKey|api_key|connection_string)([^A-Za-z0-9]|$)\"?\s*[:=]\s*)\"([^\"]{12,})\"/\\1\"[REDACTED]\"/I"
)

echo "--- Executing Apply ---"

set +e

if [[ "$MODE" == "test" ]]; then
  sed -E "${SED_EXPRESSIONS[@]}"
  exit 0
fi

terraform apply \
  -lock-timeout=120s \
  # -auto-approve \
  -input=false \
  "$PLAN_FILE" 2>&1 | \
  sed -E "${SED_EXPRESSIONS[@]}"

APPLY_EXIT_CODE=${PIPESTATUS[0]}
MASK_EXIT_CODE=${PIPESTATUS[1]}

set -e

if [[ "$MASK_EXIT_CODE" -ne 0 ]]; then
  echo "::error::Terraform apply output filtering failed."
  exit "$MASK_EXIT_CODE"
fi

if [[ "$APPLY_EXIT_CODE" -ne 0 ]]; then
  echo "::error::Terraform apply failed."
  exit "$APPLY_EXIT_CODE"
fi
