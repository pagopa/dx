#!/bin/bash

set -e

TEST_DIR="./tests"
SCRIPT_TO_TEST="./run_plan.sh"
TEST_COUNT=0
FAIL_COUNT=0

# Create a temporary file that will be deleted at the end
TMP_OUTPUT_FILE=$(mktemp)
trap 'rm -f -- "$TMP_OUTPUT_FILE"' EXIT

for input_file in "$TEST_DIR"/*.input; do
  test_name=$(basename "$input_file" .input)
  expected_file="$TEST_DIR/$test_name.expected"

  echo "▶️ Running test: $test_name"
  TEST_COUNT=$((TEST_COUNT + 1))

  # Execute script and save the result in tmp file
  cat "$input_file" | "$SCRIPT_TO_TEST" --plan-file "test.txt" --sensitive-keys "hidden-link" --test > "$TMP_OUTPUT_FILE"

  # Check diff between tmp file and expected result file
  if ! diff -u "$TMP_OUTPUT_FILE" "$expected_file"; then
    echo "❌ FAILED: $test_name"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  else
    echo "✅ PASSED: $test_name"
  fi
  echo "----------------------------------------"
done

# Summary
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo -e "\n🔥 Test run finished. $FAIL_COUNT/$TEST_COUNT tests failed."
  exit 1
else
  echo -e "\n🎉 All $TEST_COUNT tests passed successfully!"
  exit 0
fi
