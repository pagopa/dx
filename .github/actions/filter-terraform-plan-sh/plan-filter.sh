#!/bin/bash
set +e

# --- Script Usage ---
# Checks if the output filename argument is provided.
if [ -z "$1" ]; then
  echo "Error: Missing output filename argument." >&2
  echo "Usage: ./plan-filter.sh <output_filename>" >&2
  exit 1
fi

OUTPUT_FILE="$1"

# --- Redaction Logic ---
# This function pipes the input through a series of sed commands.
# Each sed command corresponds to a filter rule.
# The 'I' flag at the end of the 's' command makes the regex case-insensitive (GNU sed feature).
filter_output() {
  sed -E \
    -e 's/("?hidden-link"?\s*[:=]\s*)".*?"/\1"[SENSITIVE_VALUE]"/I' \
    -e 's/("?APPINSIGHTS_INSTRUMENTATIONKEY"?\s*[:=]\s*)".*?"/\1"[SENSITIVE_VALUE]"/I'
    # --- ADD NEW SED RULES HERE ---
    # -e 's/your_regex/your_replacement/I' \
}

echo "--- Executing Plan in: $WORKING_DIRECTORY ---"
cd $WORKING_DIRECTORY

# The 'tee' command is used to split the output:
# 1. It prints the filtered output to the console (stdout) for real-time logging.
# 2. It writes the same filtered output to the specified file.
terraform plan -no-color -input=false 2>&1 | filter_output | tee "$OUTPUT_FILE"

# Capture the exit code of the 'terraform plan' command (the first command in the pipeline).
PLAN_EXIT_CODE=${PIPESTATUS[0]}

echo "--- Plan executed with exit code: $PLAN_EXIT_CODE ---"

# --- Output Handling ---
# Write the exit code and the path to the filtered plan file to GitHub Actions outputs.
echo "exit_code=$PLAN_EXIT_CODE" >> $GITHUB_OUTPUT

EOF_MARKER=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 16)
echo "filtered_plan<<$EOF_MARKER" >> $GITHUB_OUTPUT
cat "$PLAN_FILE" >> $GITHUB_OUTPUT
echo "" >> $GITHUB_OUTPUT # Ensure a trailing newline before the marker
echo "$EOF_MARKER" >> $GITHUB_OUTPUT

# --- Cleanup ---
# Remove the temporary plan file to avoid clutter.
echo "--- Cleaning up temporary file ---"
rm "$PLAN_FILE"

set -e

if [ $PLAN_EXIT_CODE -eq 0 ]; then
  echo "No changes to infrastructure."
  exit 0
elif [ $PLAN_EXIT_CODE -eq 1 ]; then
  echo "Error during 'terraform plan' execution." >&2
  exit 1
else
  echo "Changes to infrastructure detected."
  exit 0
fi
