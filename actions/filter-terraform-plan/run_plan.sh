#!/bin/bash

set -e
set -o pipefail

# --- Help Function ---
usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Executes 'terraform plan' and filters the output."
  echo "The script accepts both command-line arguments and environment variables."
  echo "Command-line arguments take precedence."
  echo
  echo "Options / Environment Variables:"
  echo "  --plan-file           (Var: PLAN_FILE) The name of the output file. (Required)"
  echo "  --sensitive-keys      (Var: SENSITIVE_KEYS) A comma-separated list of sensitive keys. (Required)"
  echo "  --no-refresh          (Var: NO_REFRESH) Optional, if set to 'true', adds the -refresh=false -lock=false flags to the plan command."
  echo "  --additional-flags    (Var: ADDITIONAL_FLAGS) Optional flags for the plan command."
  echo "  -h, --help            Show this help message."
  exit 1
}

# --- Parse Command-Line Arguments (overwrites environment variables) ---
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
    --no-refresh)
      NO_REFRESH="$2"
      shift 2
      ;;
    --additional-flags)
      ADDITIONAL_FLAGS="$2"
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

# --- Validation of required parameters ---
if [[ -z "$SENSITIVE_KEYS" || -z "$PLAN_FILE" ]]; then
  echo "::error::The following parameters are required (via arguments or environment variables): --working-directory, --plan-file, --sensitive-keys"
  usage
fi

# --- Dynamically build the sed filter expressions ---
# Builds an array of sed filter expressions from the comma-separated SENSITIVE_KEYS.

SED_EXPRESSIONS=()

for key in $(echo "$SENSITIVE_KEYS" | tr ',' '\n'); do
  trimmed_key=$(echo "$key" | xargs)
  if [[ -n "$trimmed_key" ]]; then
    # Matches an optional-quoted key followed by : or =, then a quoted value;
    # it captures the left side and replaces the value with "[REDACTED]" (non-greedy match, case-insensitive).
    SED_EXPRESSIONS+=(-e "s/(\"?${trimmed_key}\"?\s*[:=]\s*)\".*?\"/\\1\"[REDACTED]\"/I")
  fi
done

# --- Add generic regex filters for high-risk patterns ---
SED_EXPRESSIONS+=(
  # Anything that looks like a private key block (keep - very specific)
  -e "s/-----BEGIN[[:space:]]+.*?-----.*?-----END[[:space:]]+.*?-----/[REDACTED]/gI"

  # Named secret/key assignments: only redact when the left-hand side is a known secret name
  # Matches constructs like: Password=abcd..., "api_key": "abcd...", SharedAccessKey:abcd...
  -e "s/(\"?[^\"[:space:]]*(AccessKey|AccountKey|Password|secret|SecretToken|AuthToken|auth_token|access_key|api_key|connection_string)([^A-Za-z0-9]|$)\"?\s*[:=]\s*)\"([^\"]{12,})\"/\\1\"[REDACTED]\"/I"
)

echo "--- Executing Plan ---"

# Run terraform plan, capture its exit code
set +e

if [[ "$NO_REFRESH" == "true" ]]; then
  ADDITIONAL_FLAGS="$ADDITIONAL_FLAGS -refresh=false -lock=false"
fi

# shellcheck disable=2086
terraform plan \
  -no-color \
  -lock-timeout=120s \
  $ADDITIONAL_FLAGS \
  -input=false 2>&1 | \
  sed -E "${SED_EXPRESSIONS[@]}" | \
  tee "$PLAN_FILE"

PLAN_EXIT_CODE=${PIPESTATUS[0]}
set -e

echo "--- Plan executed with exit code: $PLAN_EXIT_CODE ---"

# --- Handle Exit Code ---
# The step should FAIL ONLY on a true error (exit code 1)
# It should SUCCEED for no changes (0) and changes detected (2)
if [[ "$PLAN_EXIT_CODE" -eq 1 ]]; then
  echo "::error::Terraform plan failed with a critical error."
  exit 1
fi

# --- Reduce file size ---
# Extracts only the diff section from the Plan by skipping everything before the resource changes,
# and filters out non-essential log lines like state refreshes and reads.
if [ -s "$PLAN_FILE" ]; then
  sed -n '/^  #/,$p' "$PLAN_FILE" | grep -Ev "Refreshing state|state lock|Reading|Read" > "${PLAN_FILE}.tmp" || echo "No changes detected." > "${PLAN_FILE}.tmp"
else
  echo "No plan output available." > "${PLAN_FILE}.tmp"
fi
mv "${PLAN_FILE}.tmp" "$PLAN_FILE"

# --- Extract Summary Line ---
# The summary with number of resources to be added, changed, or destroyed (will be used in case the plan output is too long)
SUMMARY_LINE=$(grep -E "^Plan: [0-9]+ to (add|change|destroy|import)" "$PLAN_FILE" || echo "No changes.")

# shellcheck disable=2086
if [[ -n "$GITHUB_OUTPUT" ]]; then
  echo "summary_line=$SUMMARY_LINE" >> $GITHUB_OUTPUT
else
  echo "$SUMMARY_LINE"
fi
