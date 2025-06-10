#!/bin/bash
set -e

if [[ -z "$GITHUB_URL" || -z "$RUNNER_TOKEN" ]]; then
  echo "ERROR: GITHUB_URL and RUNNER_TOKEN are required"
  exit 1
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

printf "ℹ️ Configuring GitHub Runner for %s\n\t" "$GITHUB_URL"
printf "ℹ️ Runner Name: %s\n\t" "$RUNNER_NAME"
printf "ℹ️ Working Directory: %s\n\t" "$WORK_DIR"

if [ ! -f ".runner" ]; then
  echo "Configuring the runner..."
  ./config.sh \
    --url "$GITHUB_URL" \
    --token "$RUNNER_TOKEN" \
    --name "$RUNNER_NAME" \
    --work "$WORK_DIR" \
    --labels "$LABELS" \
    --unattended \
    --replace
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
