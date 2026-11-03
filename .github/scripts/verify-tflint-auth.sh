#!/bin/bash

set -euo pipefail

: "${GITHUB_TOKEN:?GITHUB_TOKEN must be provided by the workflow step}"
: "${RUNNER_TEMP:?RUNNER_TEMP must be provided by GitHub Actions}"

test_dir="$(mktemp -d "$RUNNER_TEMP/tflint-auth.XXXXXX")"
trap 'rm -rf -- "$test_dir"' EXIT

curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $GITHUB_TOKEN" \
  --dump-header "$test_dir/headers" \
  --output /dev/null \
  https://api.github.com/repos/terraform-linters/tflint-ruleset-azurerm/releases/tags/v0.27.0

limit="$(awk 'tolower($1) == "x-ratelimit-limit:" { gsub(/\r/, "", $2); print $2 }' "$test_dir/headers")"
if ! [[ "$limit" =~ ^[0-9]+$ ]] || [ "$limit" -le 60 ]; then
  echo "::error::Expected an authenticated GitHub API rate-limit bucket; received '$limit'." >&2
  exit 1
fi
printf 'Authenticated GitHub API rate limit: %s requests per hour.\n' "$limit"

export TFLINT_PLUGIN_DIR="$test_dir/plugins"
test ! -e "$TFLINT_PLUGIN_DIR"
printf 'Installing TFLint plugins into a fresh temporary directory.\n'
tflint --init
test -x "$TFLINT_PLUGIN_DIR/github.com/terraform-linters/tflint-ruleset-azurerm/0.27.0/tflint-ruleset-azurerm"
tflint --version
printf 'Cold-cache TFLint download and GitHub API authentication checks passed.\n'
