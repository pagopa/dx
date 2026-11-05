#!/bin/bash
set -euo pipefail

request_token() {
  local api_url="$1"
  local access_token="$2"
  local description="$3"
  local token

  if ! token="$(curl --request POST --fail --silent --show-error \
    --header 'Accept: application/vnd.github+json' \
    --header "Authorization: Bearer ${access_token}" \
    --header 'X-GitHub-Api-Version: 2022-11-28' \
    "$api_url" |
    jq --exit-status --raw-output '.token | select(type == "string" and length > 0)')"; then
    echo "ERROR: Failed to generate ${description}" >&2
    return 1
  fi

  printf '%s' "$token"
}

base64_url_encode() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}

create_github_app_jwt() {
  local app_id="$1"
  local key_file="$2"
  local now
  local issued_at
  local expires_at
  local header
  local payload
  local header_payload
  local signature

  now="$(date +%s)"
  issued_at="$((now - 60))"
  expires_at="$((now + 600))"
  header="$(printf '{"alg":"RS256","typ":"JWT"}' | base64_url_encode)"
  payload="$(printf '{"iat":%s,"exp":%s,"iss":"%s"}' \
    "$issued_at" "$expires_at" "$app_id" | base64_url_encode)"
  header_payload="${header}.${payload}"
  signature="$(printf '%s' "$header_payload" |
    openssl dgst -sha256 -sign "$key_file" -binary |
    base64_url_encode)"

  printf '%s.%s' "$header_payload" "$signature"
}

remove_github_app_key() {
  if [[ -n "${github_app_key_file:-}" ]]; then
    rm -f "$github_app_key_file"
  fi
}

github_app_key_file=""
trap remove_github_app_key EXIT

REPO_URL="${REPO_URL:-${GITHUB_REPOSITORY:-}}"

if [[ -z "$REPO_URL" ]]; then
  echo "ERROR: REPO_URL is required"
  exit 1
fi

RUNNER_TOKEN="${RUNNER_TOKEN:-${GITHUB_TOKEN:-}}"

if [[ -z "$RUNNER_TOKEN" && -n "${GITHUB_PAT:-}" && -n "${REGISTRATION_TOKEN_API_URL:-}" ]]; then
  echo "Generating RUNNER_TOKEN using GITHUB_PAT..."
  RUNNER_TOKEN="$(request_token \
    "$REGISTRATION_TOKEN_API_URL" \
    "$GITHUB_PAT" \
    "runner registration token")"
  unset GITHUB_PAT
elif [[ -z "$RUNNER_TOKEN" &&
  -n "${GITHUB_APP_ID:-}" &&
  -n "${GITHUB_APP_KEY:-}" &&
  -n "${GITHUB_APP_INSTALLATION_ID:-}" &&
  -n "${REGISTRATION_TOKEN_API_URL:-}" ]]; then
  echo "Generating RUNNER_TOKEN using the GitHub App..."

  github_app_key_file="$(mktemp)"
  chmod 600 "$github_app_key_file"
  printf '%s' "$GITHUB_APP_KEY" >"$github_app_key_file"

  github_app_jwt="$(create_github_app_jwt "$GITHUB_APP_ID" "$github_app_key_file")"
  remove_github_app_key
  github_app_key_file=""

  github_app_access_token="$(request_token \
    "https://api.github.com/app/installations/${GITHUB_APP_INSTALLATION_ID}/access_tokens" \
    "$github_app_jwt" \
    "GitHub App installation access token")"
  RUNNER_TOKEN="$(request_token \
    "$REGISTRATION_TOKEN_API_URL" \
    "$github_app_access_token" \
    "runner registration token")"

  unset GITHUB_APP_KEY github_app_access_token github_app_jwt
elif [[ -z "$RUNNER_TOKEN" ]]; then
  echo "ERROR: No valid authentication method configured"
  echo "Provide one of the following:"
  echo "  - RUNNER_TOKEN"
  echo "  - GITHUB_PAT and REGISTRATION_TOKEN_API_URL"
  echo "  - GITHUB_APP_ID, GITHUB_APP_KEY, GITHUB_APP_INSTALLATION_ID, and REGISTRATION_TOKEN_API_URL"
  exit 1
fi

export REPO_URL RUNNER_TOKEN
unset GITHUB_TOKEN

cd /home/runner

# Configure the runner
if [ -z "${RUNNER_NAME:-}" ]; then
  RUNNER_NAME="$(hostname)"
  export RUNNER_NAME
fi

if [ -z "${WORK_DIR:-}" ]; then
  export WORK_DIR="_work"
fi

if [ -z "${LABELS:-}" ]; then
  export LABELS=""
fi

printf "ℹ️ Configuring GitHub Runner for %s\n\t" "$REPO_URL"
printf "ℹ️ Runner Name: %s\n\t" "$RUNNER_NAME"
printf "ℹ️ Working Directory: %s\n\t" "$WORK_DIR"

# Official GitHub Actions Runner configuration script
# https://github.com/actions/runner/blob/097ada9374c9bde944aa9fa3de59ae2e656e79cf/src/Runner.Listener/Runner.cs#L1068
if [ ! -f ".runner" ]; then
  echo "Configuring the runner..."
  ./config.sh \
    --url "$REPO_URL" \
    --token "$RUNNER_TOKEN" \
    --name "$RUNNER_NAME" \
    --work "$WORK_DIR" \
    --labels "$LABELS" \
    --unattended \
    --replace \
    --ephemeral \
    --disableupdate
fi

# Cleanup
cleanup() {
  echo "Removing runner..."
  ./config.sh remove --unattended --token "$RUNNER_TOKEN"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting runner..."
./run.sh &
wait $!
