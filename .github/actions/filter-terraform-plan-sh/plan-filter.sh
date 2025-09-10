#!/bin/bash

set +e

# --- Script Usage ---
if [ -z "$1" ]; then
  echo "Error: Missing output filename argument." >&2
  echo "Usage: ./plan-filter.sh <output_filename>" >&2
  exit 1
fi

OUTPUT_FILE="$1"

filter_output() {
  sed -E \
    -e 's/("?hidden-link"?\s*[:=]\s*)".*?"/\1"[SENSITIVE_VALUE]"/I' \
    -e 's/("?APPINSIGHTS_INSTRUMENTATIONKEY"?\s*[:=]\s*)".*?"/\1"[SENSITIVE_VALUE]"/I'
    # --- ADD NEW SED RULES HERE ---
}

echo "--- Executing Plan in: $WORKING_DIRECTORY ---"
cd "$WORKING_DIRECTORY"

# Run terraform plan, capture its exit code
terraform plan -no-color -input=false 2>&1 | filter_output | tee "$OUTPUT_FILE"
PLAN_EXIT_CODE=${PIPESTATUS[0]}

echo "--- Plan executed with exit code: $PLAN_EXIT_CODE ---"

# Write outputs for GitHub Actions
echo "exit_code=$PLAN_EXIT_CODE" >> $GITHUB_OUTPUT

EOF_MARKER=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 16)
echo "filtered_plan<<$EOF_MARKER" >> $GITHUB_OUTPUT
cat "$PLAN_FILE" >> $GITHUB_OUTPUT
echo "" >> $GITHUB_OUTPUT
echo "$EOF_MARKER" >> $GITHUB_OUTPUT

# Cleanup
echo "--- Cleaning up temporary file ---"
rm "$PLAN_FILE"

# Decide script exit code
if [ $PLAN_EXIT_CODE -eq 1 ]; then
  echo "Error during 'terraform plan' execution." >&2
  exit 1
elif [ $PLAN_EXIT_CODE -eq 0 ]; then
  echo "No changes to infrastructure."
  exit 0
elif [ $PLAN_EXIT_CODE -eq 2 ]; then
  echo "Changes to infrastructure detected."
  exit 0
else
  echo "Unexpected exit code: $PLAN_EXIT_CODE" >&2
  exit 1
fi
