#!/usr/bin/env bash

__revert_traffic() {
  local resource_group_name="$1"
  local webapp_name="$2"
  az webapp traffic-routing clear \
    --resource-group "$resource_group_name" \
    --name "$webapp_name"
}

__set_traffic() {
  local resource_group_name="$1"
  local webapp_name="$2"
  local staging_percentage="$3"
  az webapp traffic-routing set \
    --resource-group "$resource_group_name" \
    --name "$webapp_name" \
    --distribution "staging=${staging_percentage}"
}

__swap_versions() {
  local resource_group_name="$1"
  local webapp_name="$2"
  echo "Swapping staging slot to production"
  az webapp deployment slot swap \
    --resource-group "$resource_group_name" \
    --name "$webapp_name" \
    --slot staging \
    --target-slot production
}
