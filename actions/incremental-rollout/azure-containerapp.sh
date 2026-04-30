#!/usr/bin/env bash

__require_revision_names() {
  local current_revision_name="$1"
  local target_revision_name="$2"

  if [[ -z "$current_revision_name" || -z "$target_revision_name" ]]; then
    echo "::error::Container App rollout requires both current and target revision names."
    exit 1
  fi
}

__revert_traffic() {
  local resource_group_name="$1"
  local containerapp_name="$2"
  local current_revision_name="$3"
  local target_revision_name="$4"

  __require_revision_names "$current_revision_name" "$target_revision_name"

  az containerapp ingress traffic set \
    --resource-group "$resource_group_name" \
    --name "$containerapp_name" \
    --revision-weight "$current_revision_name"=100 "$target_revision_name"=0
}

__set_traffic() {
  local resource_group_name="$1"
  local containerapp_name="$2"
  local staging_percentage="$3"
  local current_revision_name="$4"
  local target_revision_name="$5"
  local production_percentage=$((100 - staging_percentage))

  __require_revision_names "$current_revision_name" "$target_revision_name"

  az containerapp ingress traffic set \
    --resource-group "$resource_group_name" \
    --name "$containerapp_name" \
    --revision-weight "$current_revision_name"="$production_percentage" "$target_revision_name"="$staging_percentage"
}

__swap_versions() {
  local resource_group_name="$1"
  local containerapp_name="$2"
  local current_revision_name="$3"
  local target_revision_name="$4"

  __require_revision_names "$current_revision_name" "$target_revision_name"

  az containerapp ingress traffic set \
    --resource-group "$resource_group_name" \
    --name "$containerapp_name" \
    --revision-weight "$current_revision_name"=0 "$target_revision_name"=100
}

__finalize() { :; }
