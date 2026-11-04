#!/usr/bin/env bash
# Temporary, dev-only proof of credentials inherited by a mise dependency.
set +x
set -euo pipefail
umask 077

fail() {
  printf '::error::%s\n' "$1" >&2
  exit 1
}

record() {
  jq --arg key "$1" --arg value "$2" '.[$key] = $value' \
    "$PROBE_RESULTS/result.json" > "$PROBE_RESULTS/result.tmp"
  mv -- "$PROBE_RESULTS/result.tmp" "$PROBE_RESULTS/result.json"
}

finish_payload() {
  local status=$?
  trap - EXIT
  if [[ "$status" -eq 0 ]]; then
    record outcome completed
  else
    record outcome failed
  fi
  rm -f -- \
    "$private_dir/api-response.json" "$private_dir/runtime-response.json" \
    "$private_dir/api-header" "$private_dir/runtime-header" \
    "$private_dir/api-jwt" "$private_dir/runtime-jwt" \
    "$private_dir/api-credentials.json" "$private_dir/runtime-credentials.json" \
    "$private_dir/api-identity.json" "$private_dir/runtime-identity.json" \
    "$private_dir/api-error.log" "$private_dir/runtime-error.log" \
    "$private_dir/api-s3.log" "$private_dir/runtime-s3.log" \
    "$private_dir/negative-s3.log" "$private_dir/session-policy.json"
  rmdir -- "$private_dir"
  cat "$PROBE_RESULTS/result.json"
  exit "$status"
}

aws_error_code() {
  local code
  code=$(sed -n 's/^An error occurred (\([^)]*\)) when calling .*/\1/p' "$1" | head -n 1)
  if [[ "$code" =~ ^[A-Za-z0-9._-]+$ ]]; then
    printf '%s' "$code"
  else
    printf 'UnclassifiedError'
  fi
}

cloud_probe() {
  local kind=$1 access_key secret_key session_token expected_identity actual_identity
  local session_name="dx-oidc-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-${kind}"
  record "${kind}_sts" attempted
  if ! aws sts assume-role-with-web-identity \
    --no-sign-request \
    --role-arn "$ROLE_ARN" \
    --role-session-name "$session_name" \
    --web-identity-token "file://$private_dir/$kind-jwt" \
    --duration-seconds 900 \
    --policy "file://$private_dir/session-policy.json" \
    --region "$AWS_REGION" \
    --output json \
    > "$private_dir/$kind-credentials.json" 2> "$private_dir/$kind-error.log"; then
    record "${kind}_sts" denied
    record "${kind}_sts_error" "$(aws_error_code "$private_dir/$kind-error.log")"
    return
  fi

  access_key=$(jq -er '.Credentials.AccessKeyId | strings | select(length > 0)' "$private_dir/$kind-credentials.json")
  secret_key=$(jq -er '.Credentials.SecretAccessKey | strings | select(length > 0)' "$private_dir/$kind-credentials.json")
  session_token=$(jq -er '.Credentials.SessionToken | strings | select(length > 0)' "$private_dir/$kind-credentials.json")
  expected_identity=$(jq -er '.AssumedRoleUser.Arn' "$private_dir/$kind-credentials.json")
  if ! AWS_ACCESS_KEY_ID="$access_key" AWS_SECRET_ACCESS_KEY="$secret_key" AWS_SESSION_TOKEN="$session_token" \
    aws sts get-caller-identity --output json \
    > "$private_dir/$kind-identity.json" 2> "$private_dir/$kind-error.log"; then
    record "${kind}_identity" failed
    return
  fi
  actual_identity=$(jq -er '.Arn' "$private_dir/$kind-identity.json")
  [[ "$actual_identity" == "$expected_identity" ]] || fail "STS identity does not match the freshly assumed role"
  record "${kind}_sts" succeeded
  record "${kind}_identity" matched

  if AWS_ACCESS_KEY_ID="$access_key" AWS_SECRET_ACCESS_KEY="$secret_key" AWS_SESSION_TOKEN="$session_token" \
    aws s3 ls > "$private_dir/$kind-s3.log" 2> "$private_dir/$kind-error.log"; then
    record "${kind}_s3_list" succeeded
  else
    record "${kind}_s3_list" denied
    record "${kind}_s3_error" "$(aws_error_code "$private_dir/$kind-error.log")"
  fi
}

request_oidc() {
  local kind=$1 bearer=$2 status
  printf 'Authorization: bearer %s\n' "$bearer" > "$private_dir/$kind-header"
  status=$(curl --silent --show-error --connect-timeout 10 --max-time 30 \
    --output "$private_dir/$kind-response.json" --write-out '%{http_code}' \
    --header "@$private_dir/$kind-header" "$oidc_url")
  record "${kind}_oidc_http" "$status"
  case "$status" in
    200)
      jq -erj '.value | strings | select(length > 0)' \
        "$private_dir/$kind-response.json" > "$private_dir/$kind-jwt"
      cloud_probe "$kind"
      ;;
    401|403) ;;
    *) fail "OIDC endpoint returned an unexpected HTTP status" ;;
  esac
}

payload() {
  : "${PROBE_RESULTS:?}" "${EXPECT_OIDC:?}" "${API_TOKEN_PROFILE:?}" "${GITHUB_TOKEN:?}" "${ROLE_ARN:?}" "${RUNNER_TEMP:?}"
  [[ "$EXPECT_OIDC" == true || "$EXPECT_OIDC" == false ]] || fail "Invalid OIDC expectation"
  [[ "$API_TOKEN_PROFILE" == actions || "$API_TOKEN_PROFILE" == app-metadata ]] || fail "Invalid API token profile"
  mkdir -p -- "$PROBE_RESULTS"
  jq -n --arg profile "$API_TOKEN_PROFILE" --arg expected "$EXPECT_OIDC" \
    '{api_token_profile: $profile, expect_oidc: $expected, environment: "infra-dev-ci", via_mise_deps: true, session_seconds: 900, session_policy: "s3:ListAllMyBuckets only", outcome: "started"}' \
    > "$PROBE_RESULTS/result.json"
  private_dir=$(mktemp -d "$RUNNER_TEMP/dx-oidc-private.XXXXXX")
  trap finish_payload EXIT

  [[ -z "${GH_APP_KEY:-}" ]] || fail "App private key must not be exposed to the dependency payload"
  if [[ -n "${AWS_ACCESS_KEY_ID:-}${AWS_SECRET_ACCESS_KEY:-}${AWS_SESSION_TOKEN:-}${AWS_SECURITY_TOKEN:-}${AWS_WEB_IDENTITY_TOKEN_FILE:-}${AWS_ROLE_ARN:-}" ]]; then
    record ambient_credentials present
    fail "Ambient AWS credentials found; refusing a potentially misleading proof"
  fi
  record ambient_credentials absent
  unset AWS_PROFILE AWS_DEFAULT_PROFILE AWS_CONTAINER_CREDENTIALS_RELATIVE_URI \
    AWS_CONTAINER_CREDENTIALS_FULL_URI AWS_CONTAINER_AUTHORIZATION_TOKEN \
    AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE AWS_ENDPOINT_URL AWS_ENDPOINT_URL_STS AWS_ENDPOINT_URL_S3
  export AWS_CONFIG_FILE=/dev/null AWS_SHARED_CREDENTIALS_FILE=/dev/null
  export AWS_EC2_METADATA_DISABLED=true AWS_PAGER="" AWS_CLI_AUTO_PROMPT=off AWS_MAX_ATTEMPTS=1
  export AWS_REGION="${AWS_REGION:-eu-south-1}"
  export AWS_DEFAULT_REGION="$AWS_REGION"
  jq -n '{Version: "2012-10-17", Statement: [{Effect: "Allow", Action: "s3:ListAllMyBuckets", Resource: "*"}]}' \
    > "$private_dir/session-policy.json"

  if [[ -z "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" || -z "${ACTIONS_ID_TOKEN_REQUEST_TOKEN:-}" ]]; then
    record runtime_oidc unavailable
    [[ "$EXPECT_OIDC" == false ]] || fail "OIDC runtime credentials are unexpectedly unavailable"
    if aws s3 ls > "$private_dir/negative-s3.log" 2> "$private_dir/runtime-error.log"; then
      fail "Negative control unexpectedly accessed S3 without OIDC or AWS credentials"
    fi
    record unauthenticated_s3_list blocked
    return
  fi

  record runtime_oidc available
  oidc_url="${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=sts.amazonaws.com"
  request_oidc api "$GITHUB_TOKEN"
  request_oidc runtime "$ACTIONS_ID_TOKEN_REQUEST_TOKEN"

  if [[ "$EXPECT_OIDC" == true ]]; then
    [[ "$(jq -r '.runtime_oidc_http' "$PROBE_RESULTS/result.json")" == 200 ]] || fail "Runtime OIDC request was denied"
    [[ "$(jq -r '.runtime_sts' "$PROBE_RESULTS/result.json")" == succeeded ]] || fail "Runtime OIDC could not federate into the authorized dev role"
  else
    [[ "$(jq -r '.runtime_oidc_http' "$PROBE_RESULTS/result.json")" != 200 ]] || fail "OIDC was available despite the caller disabling it"
  fi
}

invoke() {
  : "${RUNNER_TEMP:?}" "${GITHUB_WORKSPACE:?}"
  fixture_dir=$(mktemp -d "$RUNNER_TEMP/dx-oidc-mise.XXXXXX")
  trap 'rm -f -- "$fixture_dir/mise.toml"; rmdir -- "$fixture_dir"' EXIT
  export PROBE_SCRIPT="$GITHUB_WORKSPACE/.github/scripts/oidc-cloud-probe.sh"
  cat > "$fixture_dir/mise.toml" <<'TOML'
[settings]
experimental = true
lockfile = false

[deps.tflint]
run = 'bash "$PROBE_SCRIPT" payload'
TOML
  MISE_TRUSTED_CONFIG_PATHS="$fixture_dir" mise deps --skip pnpm --cd "$fixture_dir"
}

case "${1:-}" in
  invoke) invoke ;;
  payload) payload ;;
  *) fail "Expected invoke or payload" ;;
esac
