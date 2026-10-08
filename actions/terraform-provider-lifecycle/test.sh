#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
OUTPUT_FILE=$(mktemp)
GITHUB_STEP_SUMMARY=$(mktemp)
export GITHUB_STEP_SUMMARY
trap 'rm -f -- "$OUTPUT_FILE" "$GITHUB_STEP_SUMMARY"' EXIT

terraform() {
  if [[ "$*" != "version -json" ]]; then
    echo "Unexpected Terraform command: $*" >&2
    return 1
  fi
  printf '%s\n' "$TERRAFORM_OUTPUT"
  return "${TERRAFORM_EXIT_CODE:-0}"
}
export -f terraform

run_check() {
  : > "$OUTPUT_FILE"
  printf 'Existing summary\n' > "$GITHUB_STEP_SUMMARY"
  bash "$SCRIPT_DIR/check-support.sh" > "$OUTPUT_FILE"
  grep -qx 'Existing summary' "$GITHUB_STEP_SUMMARY"
}

for version in 4.0.0 4.99.1; do
  export TERRAFORM_OUTPUT="{\"provider_selections\":{\"registry.terraform.io/hashicorp/azurerm\":\"$version\",\"registry.terraform.io/hashicorp/aws\":\"6.0.0\"}}"
  run_check
  grep -q '^::warning title=AzureRM v4 support::' "$OUTPUT_FILE"
  grep -q '31 December 2026' "$OUTPUT_FILE"
  grep -q '31 December 2026' "$GITHUB_STEP_SUMMARY"
  grep -q 'https://dx.pagopa.it/docs/tooling-lifecycle' "$GITHUB_STEP_SUMMARY"
  grep -q 'does not block Terraform plan or apply' "$GITHUB_STEP_SUMMARY"
done

for version in 3.117.1 5.0.0 14.0.0; do
  export TERRAFORM_OUTPUT="{\"provider_selections\":{\"registry.terraform.io/hashicorp/azurerm\":\"$version\"}}"
  run_check
  test ! -s "$OUTPUT_FILE"
  test "$(cat "$GITHUB_STEP_SUMMARY")" = "Existing summary"
done

for providers in '{}' '{"registry.terraform.io/hashicorp/aws":"4.0.0"}' '{"example.com/other/azurerm":"4.0.0"}'; do
  export TERRAFORM_OUTPUT="{\"provider_selections\":$providers}"
  run_check
  test ! -s "$OUTPUT_FILE"
  test "$(cat "$GITHUB_STEP_SUMMARY")" = "Existing summary"
done

export TERRAFORM_OUTPUT='not JSON'
run_check
grep -q '^::warning title=AzureRM lifecycle check::Unable to determine' "$OUTPUT_FILE"
test "$(cat "$GITHUB_STEP_SUMMARY")" = "Existing summary"

export TERRAFORM_OUTPUT='{"provider_selections":{"registry.terraform.io/hashicorp/azurerm":"4.0.0"}}'
export TERRAFORM_EXIT_CODE=1
run_check
grep -q '^::warning title=AzureRM lifecycle check::Unable to determine' "$OUTPUT_FILE"
test "$(cat "$GITHUB_STEP_SUMMARY")" = "Existing summary"

echo "All Terraform provider lifecycle checks passed."
