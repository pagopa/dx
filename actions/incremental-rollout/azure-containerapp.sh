#!/usr/bin/env bash

__revert_traffic() {
  local resource_group_name="$1"
  local containerapp_name="$2"
  az containerapp ingress traffic set \
    --resource-group "$resource_group_name" \
    --name "$containerapp_name" \
    --revision-weight "latest=0"
}

__set_traffic() {
  local resource_group_name="$1"
  local containerapp_name="$2"
  local staging_percentage="$3"
  az containerapp ingress traffic set \
    --resource-group "$resource_group_name" \
    --name "$containerapp_name" \
    --revision-weight "latest=${staging_percentage}"
}

__swap_versions() {
  __revert_traffic "$1" "$2"
}

__finalize() { :; }
