#!/usr/bin/env bash

resource_group_name=$1
web_app_name=$2

set -euo pipefail

log_canary_event() {
  local staging_percentage="$1"
  # shellcheck disable=SC2086
  jq -nr \
    --argjson canary $staging_percentage \
    --arg time "$(date -u +'%H:%M:%SZ')" \
    '{canary: $canary, time: $time}' >> events.json
}

post_canary_gh_summary() {
  local message=$1

  local x_axis
  local y_axis

  x_axis=$(jq -src [.[].time] events.json)
  y_axis=$(jq -src [.[].canary] events.json)

  cat <<EOF > "$GITHUB_STEP_SUMMARY"
### Canary Deployment Rollout
$message

\`\`\`mermaid
---
config:
  theme: dark
---
xychart-beta
    title "Phased rollout of the new version"
    x-axis $x_axis
    y-axis "Canary %" 0 --> 100
    line $y_axis
\`\`\`
EOF
}

revert_traffic() {
  local reason="$1"
  echo "::error::$reason. Reverting traffic to production."
  az webapp traffic-routing clear \
    --resource-group "$resource_group_name" \
    --name "$web_app_name"
  log_canary_event 0
  post_gh_summary "Rollout failed ❌. $reason. Traffic reverted to production."
  exit 1
}

set_traffic() {
  local staging_percentage="$1"
  local production_percentage=$((100 - staging_percentage))

  echo "Setting traffic distribution: ${staging_percentage}% staging, ${production_percentage}% production"

  az webapp traffic-routing set \
    --resource-group "$resource_group_name" \
    --name "$web_app_name" \
    --distribution "staging=${staging_percentage}"

  log_canary_event "$staging_percentage"
}

swap_slots() {
  echo "Swapping staging slot to production"
  az webapp deployment slot swap \
    --resource-group "$resource_group_name" \
    --name "$web_app_name" \
    --slot staging \
    --target-slot production
}

if [[ -r ./canary-monitor.sh ]]; then
  log_canary_event 0
  currentPercentage=0
  echo "::group::Phased Rollout of Staging Slot"
  while true; do
    echo "Current percentage: $currentPercentage%"

    # Run monitoring script with error handling
    set +e
    output=$(bash ./canary-monitor.sh "$resource_group_name" "$web_app_name" "$currentPercentage")
    exitCode=$?
    set -e

    echo "::debug::Monitoring script output: $output"
    echo "::debug::Monitoring script exit code: $exitCode"

    # Check if monitoring script failed
    if [ $exitCode -ne 0 ]; then
      revert_traffic "Monitoring script failed"
    fi

    # Parse JSON output with validation
    nextPercentage=$(echo "$output" | jq -r '.nextPercentage // empty')
    afterMs=$(echo "$output" | jq -r '.afterMs // empty')

    # Validate that values exist
    if [ -z "$nextPercentage" ] || [ -z "$afterMs" ]; then
      revert_traffic "Invalid output from script (missing nextPercentage or afterMs)"
    fi

    # Validate percentage range
    if [ "$nextPercentage" -lt 0 ] || [ "$nextPercentage" -gt 100 ]; then
      revert_traffic "nextPercentage ($nextPercentage) must be between 0 and 100"
    fi

    # Set traffic distribution
    set_traffic "$nextPercentage"

    currentPercentage=$nextPercentage

    # Check if rollout is complete
    if [ "$currentPercentage" -ge 100 ]; then
      echo "Successfully shifted 100% traffic to staging slot"
      break
    else
      delaySeconds=$((afterMs / 1000))
      echo "Waiting for $delaySeconds seconds..."
      sleep "$delaySeconds"
    fi
  done
  echo "::endgroup::"
  echo "Finalizing rollout by setting traffic to 100% production"
  set_traffic 0
  swap_slots
  echo "Rollout completed successfully. Traffic is now fully on production."
  log_canary_event 100
  post_canary_gh_summary "Rollout completed. Traffic is now fully on production."
  exit 0
fi

swap_slots

cat <<EOF > "$GITHUB_STEP_SUMMARY"
Successfully swapped staging slot to production.

> [!TIP]
> You can enable the canary deployment by creating a script named \`canary-monitor.sh\` in the root of your repository.
> Find more details in the [workflow documentation](https://pagopa.github.io/dx/docs/pipelines/release-azure-appsvc#canary-deployments).
EOF



