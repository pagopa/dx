#!/usr/bin/env bash
#
# Azure Container Apps hooks for stage.sh and rollout.sh.
# Sourced by resource-type.sh; reads resource_group_name, resource_name and
# image (stage only) from the calling script. Requires multiple revision mode.
#
# Stage:
#   1. Copy the most recent active revision with the new image.
#   2. Keep 100% of traffic on the current revision, 0% on the new one.
#   3. Wait for the new revision to be healthy (30 checks, 3s apart).
#   4. Healthy: add the `staging` label. Unhealthy: deactivate it and fail.
#
# Rollout:
#   1. Find the `staging` revision and the previous one (100% traffic, no
#      label). Without a `staging` label there is nothing to roll out.
#   2. Shift traffic to the `latest` revision (step by step with a canary
#      script, otherwise all at once).
#   3. Success: remove the `staging` label and deactivate the previous revision.
#   4. Any failure: move all traffic back to the previous revision and
#      deactivate the staged one.

if [[ -z "${resource_group_name:-}" ]]; then
  echo "::error::resource_group_name is required for Microsoft.App/containerApps"
  exit 1
fi

if [[ -z "${resource_name:-}" ]]; then
  echo "::error::resource_name is required for Microsoft.App/containerApps"
  exit 1
fi

az config set extension.use_dynamic_install=yes_without_prompt

# Default resource group for every az command in this process.
export AZURE_DEFAULTS_GROUP="$resource_group_name"

__stage() {
  if [[ -z "${image:-}" ]]; then
    echo "::error::image is required for Microsoft.App/containerApps staging"
    return 1
  fi

  local revision_mode
  revision_mode=$(az containerapp show \
    --name "$resource_name" \
    --query "properties.configuration.activeRevisionsMode" \
    --output tsv)
  if [[ "$revision_mode" != "Multiple" ]]; then
    echo "::error::Container App must use multiple revision mode (current: $revision_mode)"
    return 1
  fi

  local current_revision
  # shellcheck disable=SC2016
  current_revision=$(az containerapp revision list \
    --name "$resource_name" \
    --query 'reverse(sort_by([].{Revision:name,Active:properties.active,Created:properties.createdTime}[?Active!=`false`], &Created))| [0].Revision' \
    --output tsv)
  echo "::notice::Current revision: $current_revision"

  local new_revision
  new_revision=$(az containerapp revision copy \
    --name "$resource_name" \
    --image "$image" \
    --from-revision "$current_revision" \
    --query "properties.latestRevisionName" \
    --output tsv)
  echo "::notice::New revision: $new_revision"

  if [[ "$current_revision" == "$new_revision" ]]; then
    echo "::warning::No deployment needed - current revision is already using the latest image"
    return 0
  fi

  az containerapp ingress traffic set \
    --name "$resource_name" \
    --revision-weight "$current_revision=100" "$new_revision=0" \
    --output table

  local max_attempts=30
  local attempt=0
  local health_state=""
  echo "::notice::Waiting for new revision ($new_revision) to be healthy..."
  while [[ "$health_state" != "Healthy" && $attempt -lt $max_attempts ]]; do
    health_state=$(az containerapp revision list \
      --name "$resource_name" \
      --query "[?contains(name, '$new_revision')].{Health:properties.healthState}|[0].Health" \
      --output tsv)
    echo "::notice::Current health state: $health_state (attempt $((attempt + 1))/$max_attempts)"
    if [[ "$health_state" == "Healthy" ]]; then
      echo "::notice::New revision is now healthy!"
      break
    fi
    attempt=$((attempt + 1))
    sleep 3
  done

  if [[ "$health_state" != "Healthy" ]]; then
    echo "::error::New revision did not become healthy within the timeout period"
    az containerapp ingress traffic set \
      --name "$resource_name" \
      --revision-weight "$current_revision=100" "$new_revision=0" \
      --output table
    az containerapp revision deactivate \
      --name "$resource_name" \
      --revision "$new_revision"
    return 1
  fi

  az containerapp revision label add \
    --name "$resource_name" \
    --revision "$new_revision" \
    --label staging \
    --yes \
    --output none
}

# Finds the staged and previous revisions before rollout, and reverts on any failure.
__prepare_rollout() {
  local traffic
  traffic=$(az containerapp ingress traffic show \
    --name "$resource_name" \
    --output json)

  staged_revision=$(jq -r '[.[] | select(.label == "staging")][0].revisionName // empty' <<< "$traffic")
  if [[ -z "$staged_revision" ]]; then
    echo "::warning::No revision has the staging label - nothing to roll out"
    exit 0
  fi

  previous_revision=$(jq -r '[.[] | select(.weight == 100 and .label != "staging")][0].revisionName // empty' <<< "$traffic")
  if [[ -z "$previous_revision" ]]; then
    echo "::error::No revision other than the staged one receives 100% of traffic"
    exit 1
  fi

  echo "::notice::Previous revision: $previous_revision"
  echo "::notice::Staged revision: $staged_revision"
  rollout_completed=false
  traffic_reverted=false
  trap on_rollout_exit EXIT
}

on_rollout_exit() {
  local status=$?
  if [[ $status -ne 0 && "$rollout_completed" != true && "$traffic_reverted" != true ]]; then
    __revert_traffic || true
  fi
}

__revert_traffic() {
  traffic_reverted=true
  az containerapp ingress traffic set \
    --name "$resource_name" \
    --revision-weight "$previous_revision=100" "$staged_revision=0" \
    --output table

  az containerapp revision deactivate \
    --name "$resource_name" \
    --revision "$staged_revision"
}

__set_traffic() {
  local staging_percentage="$3"
  az containerapp ingress traffic set \
    --name "$resource_name" \
    --revision-weight "latest=${staging_percentage}"
}

__swap_versions() {
  __set_traffic "$resource_group_name" "$resource_name" 100
  __finalize
}

__finalize() {
  az containerapp revision label remove \
    --name "$resource_name" \
    --label staging \
    --output none

  az containerapp revision deactivate \
    --name "$resource_name" \
    --revision "$previous_revision"
  rollout_completed=true
}
