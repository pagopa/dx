#!/bin/bash

set -e
set -o pipefail

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Executes 'terraform apply' and filters the output after completion."
  echo "The script accepts both command-line arguments and environment variables."
  echo "Command-line arguments take precedence."
  echo
  echo "Options / Environment Variables:"
  echo "  --plan-file           (Var: PLAN_FILE) The terraform plan file to apply. (Required)"
  echo "  --sensitive-keys      (Var: SENSITIVE_KEYS) A comma-separated list of sensitive keys. (Required)"
  echo "  --test                Optional flag for testing (only output filtering will be executed)."
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

mask_output() {
  SENSITIVE_KEYS="$SENSITIVE_KEYS" perl -ne '
    BEGIN {
      @keys = grep { length } map { s/^\s+|\s+$//gr } split /,/, ($ENV{SENSITIVE_KEYS} // q{});
    }

    for my $key (@keys) {
      s/("?\Q$key\E[^"]*"?\s*=\s*)"[^"]*"(\s*->\s*)"[^"]*"/$1"[REDACTED]"$2"[REDACTED]"/ig;
      s/("?\Q$key\E[^"]*"?\s*=\s*)"[^"]*"/$1"[REDACTED]"/ig;
    }

    s/-----BEGIN\s+.*?-----.*?-----END\s+.*?-----/[REDACTED]/ig;
    s/("?[^"\s]*(AccessKey|AccountKey|Password|secret|SecretToken|AuthToken|auth_token|access_key|apiKey|api_key|connection_string)([^A-Za-z0-9]|$)"?\s*[:=]\s*)"([^"]{12,})"(\s*->\s*)"([^"]{12,})"/$1"[REDACTED]"$5"[REDACTED]"/ig;
    s/("?[^"\s]*(AccessKey|AccountKey|Password|secret|SecretToken|AuthToken|auth_token|access_key|apiKey|api_key|connection_string)([^A-Za-z0-9]|$)"?\s*[:=]\s*)"([^"]{12,})"/$1"[REDACTED]"/ig;

    print;
  '
}

echo "--- Executing Apply ---"

set +e

if [[ "$MODE" == "test" ]]; then
  mask_output
  exit 0
fi

# Applying a saved plan file is already non-interactive in CI.
RAW_OUTPUT_FILE=$(mktemp)
trap 'rm -f -- "$RAW_OUTPUT_FILE"' EXIT

terraform apply \
  -lock-timeout=120s \
  -auto-approve \
  -input=false \
  "$PLAN_FILE" >"$RAW_OUTPUT_FILE" 2>&1

APPLY_EXIT_CODE=$?

mask_output < "$RAW_OUTPUT_FILE"
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
