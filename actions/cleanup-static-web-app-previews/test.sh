#!/usr/bin/env bash
# Exercise cleanup using the flattened Azure CLI response without contacting APIs.
set -euo pipefail

action_dir="$(cd "$(dirname "$0")" && pwd)"
test_dir="$(mktemp -d)"
trap 'rm -f "$test_dir/deleted" "$test_dir/output"; rmdir "$test_dir"' EXIT

export GITHUB_REPOSITORY=example/website
export STATIC_WEB_APP_NAME=test-app RESOURCE_GROUP_NAME=test-rg GH_TOKEN=test-token
export DELETE_LOG="$test_dir/deleted"

az() {
  case "$1 $2 $3" in
    "staticwebapp environment list")
      cat <<'JSON'
[
  {"buildId":"default","pullRequestTitle":null},
  {"buildId":"preview","pullRequestTitle":"Named environment"},
  {"buildId":101,"pullRequestTitle":"Closed PR"},
  {"buildId":"202","pullRequestTitle":"Open PR"}
]
JSON
      ;;
    "staticwebapp environment delete")
      while [[ "$1" != "--environment-name" ]]; do shift; done
      echo "$2" >> "$DELETE_LOG"
      ;;
    *) return 1 ;;
  esac
}

gh() {
  if [[ "${FAIL_GITHUB:-false}" == "true" ]]; then
    echo "GitHub API unavailable" >&2
    return 1
  fi
  case "$2" in
    repos/example/website/pulls/101) echo closed ;;
    repos/example/website/pulls/202) echo open ;;
    *) return 1 ;;
  esac
}
export -f az gh

DRY_RUN=true bash "$action_dir/cleanup.sh" > "$test_dir/output"
grep -Fq 'Would delete preview environment for closed PR #101.' "$test_dir/output"
test ! -e "$DELETE_LOG"

bash "$action_dir/cleanup.sh" > "$test_dir/output"
test "$(cat "$DELETE_LOG")" = 101
grep -Fq 'Keeping preview environment for open PR #202.' "$test_dir/output"

: > "$DELETE_LOG"
if FAIL_GITHUB=true bash "$action_dir/cleanup.sh" > "$test_dir/output" 2>&1; then
  echo "Expected a GitHub API failure to stop cleanup." >&2
  exit 1
fi
test ! -s "$DELETE_LOG"

echo "Preview cleanup tests passed."
