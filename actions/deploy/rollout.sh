#!/usr/bin/env bash

resource_type=${1:?resource_type must be provided}  # e.g., "Microsoft.Web/sites" or "Microsoft.App/containerApps"
resource_name=${2:?resource_name must be provided}
resource_group_name=${3:-}

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck disable=SC2329,SC2317
__revert_traffic() {
  echo "::error::__revert_traffic not implemented for this resource type."
}

# shellcheck disable=SC2329,SC2317
__set_traffic() {
  echo "::error::__set_traffic not implemented for this resource type."
}

# shellcheck disable=SC2329,SC2317
__swap_versions() {
  echo "::error::__swap_versions not implemented for this resource type."
}

# shellcheck disable=SC2329,SC2317
__finalize() {
  echo "::error::__finalize not implemented for this resource type."
}

# shellcheck disable=SC1091
source "$script_dir/resource-type.sh" "$resource_type" "$resource_group_name"

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
  __revert_traffic "$resource_group_name" "$resource_name"
  log_canary_event 0
  post_canary_gh_summary "Rollout failed ❌. $reason. Traffic reverted to production."
  exit 1
}

set_traffic() {
  local staging_percentage="$1"
  local production_percentage=$((100 - staging_percentage))
  echo "Setting traffic distribution: ${staging_percentage}% staging, ${production_percentage}% production"
  __set_traffic "$resource_group_name" "$resource_name" "$staging_percentage"
  log_canary_event "$staging_percentage"
}

swap_versions() {
  __swap_versions "$resource_group_name" "$resource_name"
}

finalize() {
  __finalize "$resource_group_name" "$resource_name"
}

if [[ -r ./canary-monitor.sh ]]; then
  log_canary_event 0
  currentPercentage=0
  echo "::group::Phased Rollout of Staging Slot"
  while true; do
    echo "Current percentage: $currentPercentage%"

    # Run monitoring script with error handling
    set +e
    output=$(bash ./canary-monitor.sh "$resource_group_name" "$resource_name" "$currentPercentage")
    exitCode=$?
    set -e

    echo "::debug::Monitoring script output: $output"
    echo "::debug::Monitoring script exit code: $exitCode"

    # Check if monitoring script failed
    if [ $exitCode -ne 0 ]; then
      revert_traffic "Monitoring script failed"
    fi

    if ! monitor_values=$(jq -ers '
      select(length == 1) | .[0]
      | select(type == "object")
      | select(.nextPercentage | type == "number")
      | select(.afterMs | type == "number")
      | select(
          .nextPercentage == (.nextPercentage | floor)
          and .nextPercentage >= 0 and .nextPercentage <= 100
          and .afterMs == (.afterMs | floor)
          and .afterMs >= 0 and .afterMs <= 9007199254740991
        )
      | [(.nextPercentage | floor), (.afterMs | floor)] | @tsv
    ' <<< "$output"); then
      revert_traffic "Invalid monitoring script output: expected one JSON object with integer nextPercentage (0-100) and afterMs (0-9007199254740991)"
    fi
    read -r nextPercentage afterMs <<< "$monitor_values"

    # Set traffic distribution
    set_traffic "$nextPercentage"

    currentPercentage=$nextPercentage

    # Check if rollout is complete
    if [ "$currentPercentage" -ge 100 ]; then
      echo "Successfully shifted 100% of traffic to the staged target."
      break
    else
      delaySeconds=$((afterMs / 1000))
      echo "Waiting for $delaySeconds seconds..."
      sleep "$delaySeconds"
    fi
  done
  echo "::endgroup::"
  finalize
  echo "Rollout completed successfully. Traffic is now fully on production."
  log_canary_event 100
  post_canary_gh_summary "Rollout completed. Traffic is now fully on production."
  exit 0
fi

swap_versions

cat <<EOF > "$GITHUB_STEP_SUMMARY"
Successfully promoted the staged target to production.

> [!TIP]
> You can enable the canary deployment by creating a script named \`canary-monitor.sh\` in the root of your repository.
> Find more details in the [workflow documentation](https://dx.pagopa.it/docs/azure/application-deployment/release-azure-appsvc#canary-deployments).
EOF
