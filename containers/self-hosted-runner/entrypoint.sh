#!/bin/bash
set -e

if [[ -z "$REPO_URL" ]]; then
  echo "ERROR: REPO_URL is required"
  exit 1
fi

if [[ -z "$RUNNER_TOKEN" ]]; then
  if [[ -z "$GITHUB_PAT" || -z "$REGISTRATION_TOKEN_API_URL" ]]; then
    echo "ERROR: RUNNER_TOKEN is required, or provide GITHUB_PAT and REGISTRATION_TOKEN_API_URL to generate it"
    exit 1
  else
    echo "Generating RUNNER_TOKEN using GITHUB_PAT and REGISTRATION_TOKEN_API_URL..."
    RUNNER_TOKEN="$(curl -X POST -fsSL \
      -H 'Accept: application/vnd.github.v3+json' \
      -H "Authorization: Bearer $GITHUB_PAT" \
      -H 'X-GitHub-Api-Version: 2022-11-28' \
      "$REGISTRATION_TOKEN_API_URL" \
      | jq -r '.token')"
    
    if [[ -z "$RUNNER_TOKEN" || "$RUNNER_TOKEN" == "null" ]]; then
      echo "ERROR: Failed to generate RUNNER_TOKEN"
      exit 1
    fi

    export RUNNER_TOKEN
    unset GITHUB_PAT
  fi
fi

cd /home/runner

# Configure the runner
if [ -z "$RUNNER_NAME" ]; then
  RUNNER_NAME="$(hostname)"
  export RUNNER_NAME
fi

if [ -z "$WORK_DIR" ]; then
  export WORK_DIR="_work"
fi

if [ -z "$LABELS" ]; then
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
