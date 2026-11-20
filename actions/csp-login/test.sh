#!/bin/bash

# Exercise credential exports with dummy values and an empty environment.
set -euo pipefail

action_dir="$(cd "$(dirname "$0")" && pwd)"
test_dir="$(mktemp -d)"
github_env="$test_dir/github-env"
error_file="$test_dir/error"
trap 'rm -f "$github_env" "$error_file"; rmdir "$test_dir"' EXIT

run_export() {
  : > "$github_env"
  env -i PATH=/usr/bin:/bin GITHUB_ENV="$github_env" "$@" \
    /bin/bash "$action_dir/export-credentials.sh"
}

assert_environment() {
  if [ "$(cat "$github_env")" != "$1" ]; then
    echo "Unexpected credential export:" >&2
    cat "$github_env" >&2
    exit 1
  fi
}

run_export EXPORT_GITHUB_TOKEN=true GH_APP_TOKEN=dummy-token \
  GH_APP_CLIENT_ID=dummy-client GH_APP_KEY=dummy-key GH_APP_INSTALLATION_ID=123
assert_environment $'CSP_LIST=github\nGITHUB_TOKEN=dummy-token'

run_export EXPORT_GITHUB_TOKEN=false GH_APP_TOKEN=dummy-token \
  GH_APP_CLIENT_ID=dummy-client GH_APP_KEY=dummy-key GH_APP_INSTALLATION_ID=123
assert_environment 'CSP_LIST=github'

run_export EXPORT_GITHUB_TOKEN=false GH_APP_TOKEN=dummy-token \
  ROLE_ARN=dummy-role ARM_CLIENT_ID=dummy-client \
  ARM_TENANT_ID=dummy-tenant ARM_SUBSCRIPTION_ID=dummy-subscription \
  GH_APP_CLIENT_ID=dummy-client GH_APP_KEY=dummy-key GH_APP_INSTALLATION_ID=123
assert_environment 'CSP_LIST=aws,azure,github'

run_export EXPORT_GITHUB_TOKEN=true \
  ROLE_ARN=dummy-role ARM_CLIENT_ID=dummy-client \
  ARM_TENANT_ID=dummy-tenant ARM_SUBSCRIPTION_ID=dummy-subscription
assert_environment 'CSP_LIST=aws,azure'

run_export EXPORT_GITHUB_TOKEN=true GH_APP_CLIENT_ID=dummy-client
assert_environment 'CSP_LIST='

run_export EXPORT_GITHUB_TOKEN=false GITHUB_TOKEN=existing-token
assert_environment 'CSP_LIST='

if run_export EXPORT_GITHUB_TOKEN=invalid GH_APP_TOKEN=dummy-token 2> "$error_file"; then
  echo "Expected an invalid export-github-token value to fail." >&2
  exit 1
fi
grep -Fx '::error::export-github-token must be true or false.' "$error_file" > /dev/null
assert_environment ''

printf 'Credential export tests passed.\n'
