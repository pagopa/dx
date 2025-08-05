#!/usr/bin/env bash

resource_group_name=$1
web_app_name=$2

set -euo pipefail

revert_traffic() {
  local reason="$1"
  echo "::error::$reason. Reverting traffic to production."
  az webapp traffic-routing clear \
    --resource-group "$resource_group_name" \
    --name "$web_app_name"
  exit 1
}

set_traffic() {
  local staging_percentage="$1"
  local production_percentage=$((100 - staging_percentage))

  echo "::notice::Setting traffic distribution: ${staging_percentage}% staging, ${production_percentage}% production"
  az webapp traffic-routing set \
    --resource-group "$resource_group_name" \
    --name "$web_app_name" \
    --distribution "staging=${staging_percentage},production=${production_percentage}"
}

currentPercentage=0

while [[ -r ./canary-monitor.sh ]]; do
  echo "::debug::Current percentage: $currentPercentage%"

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

  echo "::notice::Next traffic percentage: $nextPercentage% to staging"

  # Set traffic distribution
  set_traffic "$nextPercentage"

  currentPercentage=$nextPercentage

  # Check if rollout is complete
  if [ "$currentPercentage" -ge 100 ]; then
    echo "::notice::Successfully shifted 100% traffic to staging slot"
    break
  else
    delaySeconds=$((afterMs / 1000))
    echo "::notice::Waiting for $delaySeconds seconds..."
    sleep "$delaySeconds"
  fi
done

echo "::notice::Finalizing rollout by setting traffic to 100% production"

set_traffic 0

echo "::notice::Swapping staging slot to production"

az webapp deployment slot swap \
  --resource-group "$resource_group_name" \
  --name "$web_app_name" \
  --slot staging \
  --target-slot production

echo "::notice::Rollout completed successfully. Traffic is now fully on production."

