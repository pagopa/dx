#!/bin/bash

set -e

TEST_DIR="../filter-terraform-plan/tests"
SCRIPT_TO_TEST="./mask_output.sh"
TEST_COUNT=0
FAIL_COUNT=0

TMP_OUTPUT_FILE=$(mktemp)
TMP_EXPECTED_FILE=$(mktemp)
trap 'rm -f -- "$TMP_OUTPUT_FILE" "$TMP_EXPECTED_FILE"' EXIT

for input_file in "$TEST_DIR"/*.input; do
  test_name=$(basename "$input_file" .input)
  expected_file="$TEST_DIR/$test_name.expected"

  echo "▶️ Running test: $test_name"
  TEST_COUNT=$((TEST_COUNT + 1))

  cat "$input_file" | bash "$SCRIPT_TO_TEST" --sensitive-keys "hidden-link, test-sensible-key" > "$TMP_OUTPUT_FILE"
  tail -n +3 "$expected_file" > "$TMP_EXPECTED_FILE"

  if ! diff -u "$TMP_OUTPUT_FILE" "$TMP_EXPECTED_FILE"; then
    echo "❌ FAILED: $test_name"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  else
    echo "✅ PASSED: $test_name"
  fi
  echo "----------------------------------------"
done

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo -e "\n🔥 Test run finished. $FAIL_COUNT/$TEST_COUNT tests failed."
  exit 1
else
  echo -e "\n🎉 All $TEST_COUNT tests passed successfully!"
  exit 0
fi
