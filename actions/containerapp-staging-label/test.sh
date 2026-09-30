#!/usr/bin/env bash

set -euo pipefail

ACTION_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
export ACTION_DIR
test_dir=$(mktemp -d)
export MOCK_STATE="$test_dir/state.json"
export MOCK_LOG="$test_dir/az.log"
export GITHUB_OUTPUT="$test_dir/output"
export GITHUB_STEP_SUMMARY="$test_dir/summary"
result="$test_dir/result"
trap 'rm -f "$MOCK_STATE" "$MOCK_STATE.next" "$MOCK_LOG" "$GITHUB_OUTPUT" "$GITHUB_STEP_SUMMARY" "$result"; rmdir "$test_dir"' EXIT

az() {
  bash "$ACTION_DIR/tests/mock-az.sh" "$@"
}
export -f az

reset_state() {
  cat > "$MOCK_STATE" <<'JSON'
{
  "fqdn": "my-app.example.azurecontainerapps.io",
  "latestRevisionName": "my-app--new",
  "traffic": [
    {"revisionName": "my-app--old", "weight": 100, "label": "blue"},
    {"revisionName": "my-app--new", "weight": 0}
  ]
}
JSON
  : > "$MOCK_LOG"
  : > "$GITHUB_OUTPUT"
  : > "$GITHUB_STEP_SUMMARY"
}

update_state() {
  jq "$1" "$MOCK_STATE" > "$MOCK_STATE.next"
  mv "$MOCK_STATE.next" "$MOCK_STATE"
}

run_success() {
  if ! bash "$ACTION_DIR/staging-label.sh" "$1" my-app my-rg my-app--new > "$result" 2>&1; then
    cat "$result" >&2
    echo "Expected success: $1" >&2
    exit 1
  fi
}

run_failure() {
  if bash "$ACTION_DIR/staging-label.sh" "$1" my-app my-rg my-app--new > "$result" 2>&1; then
    echo "Expected failure: $1" >&2
    exit 1
  fi
  grep -q "$2" "$result"
}

assert_state() {
  if ! jq -e "$1" "$MOCK_STATE" > /dev/null; then
    echo "State assertion failed: $1" >&2
    cat "$MOCK_STATE" >&2
    exit 1
  fi
}

reset_state
run_success add
assert_state '.traffic[0].weight == 100 and .traffic[0].label == "blue" and .traffic[1].weight == 0 and .traffic[1].label == "staging"'
grep -qx 'staging_url=https://my-app---staging.example.azurecontainerapps.io' "$GITHUB_OUTPUT"
grep -q 'my-app--new' "$GITHUB_STEP_SUMMARY"
echo "PASS: assign staging without changing traffic or other labels"

reset_state
update_state '.traffic[0].label = "staging"'
run_success add
assert_state '.traffic[0].weight == 100 and (.traffic[0] | has("label") | not) and .traffic[1].weight == 0 and .traffic[1].label == "staging"'
grep -q -- '--yes' "$MOCK_LOG"
if grep -q 'label remove' "$MOCK_LOG"; then exit 1; fi
echo "PASS: transfer staging without removing it first"

run_success add
assert_state '.traffic[1].label == "staging"'
echo "PASS: repeat assignment"

reset_state
update_state '.traffic = [.traffic[0]]'
run_success add
assert_state '.traffic[0].weight == 100 and .traffic[1].revisionName == "my-app--new" and .traffic[1].weight == 0'
echo "PASS: assign a candidate without an existing traffic entry"

reset_state
MOCK_FAIL=add run_failure add 'Azure label mutation failed'
[[ ! -s "$GITHUB_OUTPUT" ]]
echo "PASS: surface label assignment errors"

reset_state
MOCK_FAIL=show run_failure add 'Azure query failed'
[[ ! -s "$GITHUB_OUTPUT" ]]
echo "PASS: surface assignment readback errors"

reset_state
MOCK_RETAIN_LABEL=true run_failure add 'does not target candidate'
[[ ! -s "$GITHUB_OUTPUT" ]]
echo "PASS: reject incorrect assignment readback"

reset_state
update_state '.traffic[1].label = "staging"'
run_success remove
assert_state '.traffic[0].weight == 100 and .traffic[0].label == "blue" and .traffic[1].weight == 0 and (.traffic[1] | has("label") | not)'
[[ ! -s "$GITHUB_OUTPUT" ]]
echo "PASS: remove only staging and preserve traffic"

run_success remove
[[ $(grep -c 'label remove' "$MOCK_LOG") -eq 1 ]]
echo "PASS: absent staging is an idempotent no-op"

reset_state
update_state '.traffic[0].label = "staging"'
run_success remove
assert_state '.traffic[0].label == "staging"'
if grep -q 'label remove' "$MOCK_LOG"; then exit 1; fi
echo "PASS: never remove staging owned by another revision"

reset_state
update_state '.traffic[1] = {latestRevision: true, weight: 0, label: "staging"}'
run_success remove
assert_state '(.traffic[1] | has("label") | not) and .traffic[1].weight == 0'
echo "PASS: resolve ownership of a latest-revision traffic entry"

reset_state
update_state '.traffic[1] = {latestRevision: true, weight: 0, label: "staging"} | .latestRevisionName = "my-app--other"'
run_success remove
assert_state '.traffic[1].label == "staging"'
if grep -q 'label remove' "$MOCK_LOG"; then exit 1; fi
echo "PASS: leave another latest revision label unchanged"

reset_state
MOCK_FAIL=show run_failure remove 'Azure query failed'
if grep -q 'label remove' "$MOCK_LOG"; then exit 1; fi
echo "PASS: do not interpret query failure as an absent label"

reset_state
update_state '.traffic[1].label = "staging"'
MOCK_FAIL=remove run_failure remove 'Azure label mutation failed'
echo "PASS: surface label removal errors"

MOCK_RETAIN_LABEL=true run_failure remove 'still assigned after removal'
echo "PASS: reject incorrect removal readback"

reset_state
update_state '.traffic = null'
run_failure remove 'Expected Container App ingress traffic'
echo "PASS: reject invalid ingress response"

reset_state
update_state '.traffic[1].label = "staging" | del(.traffic[1].revisionName)'
run_failure remove 'Cannot identify the staging revision'
echo "PASS: reject unidentified label ownership"

reset_state
update_state '.fqdn = "unexpected.example.azurecontainerapps.io"'
run_failure add 'Cannot derive the staging URL'
[[ ! -s "$GITHUB_OUTPUT" ]]
echo "PASS: reject an unexpected FQDN"

reset_state
run_failure invalid 'Unsupported label operation'
if bash "$ACTION_DIR/staging-label.sh" add my-app my-rg latest > "$result" 2>&1; then exit 1; fi
grep -q 'explicit revision name' "$result"
[[ ! -s "$MOCK_LOG" ]]
echo "PASS: reject invalid operations and implicit revisions"
