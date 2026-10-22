#!/usr/bin/env bash
#
# Azure App Service and Function App hooks for stage.sh and rollout.sh.
# Sourced by resource-type.sh; reads resource_group_name, resource_name and
# image (stage only) from the calling script.
#
# Stage:
#   1. Require a tagged image or sha256 digest and a Linux app or Function App.
#   2. Require container images (DOCKER|) on production and the staging slot.
#   3. Update only the staging slot image, using the matching Azure CLI command.
#      Leave traffic and registry authentication unchanged; do not create slots
#      or wait for health. Images without a registry use Docker Hub.
#
# Rollout:
#   1. Shift traffic to staging (step by step with a canary script).
#   2. Success: reset traffic routing to production, then swap staging into it.
#      Without a canary script, swap directly.
#   3. On a failed canary check, clear traffic routing back to production.

if [[ -z "${resource_group_name:-}" ]]; then
  echo "::error::resource_group_name is required for Microsoft.Web/sites"
  exit 1
fi

if [[ -z "${resource_name:-}" ]]; then
  echo "::error::resource_name is required for Microsoft.Web/sites"
  exit 1
fi

__stage() {
  if [[ -z "${image:-}" ]]; then
    echo "::error::image is required for Microsoft.Web/sites staging"
    return 1
  fi

  local image_pattern='^([^/@[:space:]]+/)*[^/:@[:space:]]+(:[A-Za-z0-9_][A-Za-z0-9_.-]{0,127})?(@sha256:[a-f0-9]{64})?$'
  if [[ ! "$image" =~ $image_pattern ]] || [[ -z "${BASH_REMATCH[2]}${BASH_REMATCH[3]}" ]]; then
    echo "::error::image must include a repository and a tag or sha256 digest."
    return 1
  fi

  local kind
  kind=$(az resource show \
    --resource-type Microsoft.Web/sites \
    --resource-group "$resource_group_name" \
    --name "$resource_name" \
    --query kind \
    --output tsv)

  if [[ ",$kind," != *,linux,* ]]; then
    echo "::error::Image staging requires an existing Linux container App Service or Function App."
    return 1
  fi
  local app_cli
  if [[ ",$kind," == *,functionapp,* ]]; then
    app_cli=functionapp
  elif [[ ",$kind," == *,app,* ]]; then
    app_cli=webapp
  else
    echo "::error::Image staging requires an existing Linux container App Service or Function App."
    return 1
  fi

  local linux_fx_version
  linux_fx_version=$(az "$app_cli" config show \
    --resource-group "$resource_group_name" \
    --name "$resource_name" \
    --query linuxFxVersion \
    --output tsv)

  if [[ "$linux_fx_version" != DOCKER\|?* ]]; then
    echo "::error::The production app must already be configured with a container image."
    return 1
  fi

  linux_fx_version=$(az "$app_cli" config show \
    --resource-group "$resource_group_name" \
    --name "$resource_name" \
    --slot staging \
    --query linuxFxVersion \
    --output tsv)

  if [[ "$linux_fx_version" != DOCKER\|?* ]]; then
    echo "::error::The staging slot must already be configured with a container image."
    return 1
  fi

  echo "Setting the app staging slot container image"
  az "$app_cli" config set \
    --resource-group "$resource_group_name" \
    --name "$resource_name" \
    --slot staging \
    --linux-fx-version "DOCKER|$image" \
    --output none
}

__revert_traffic() {
  az webapp traffic-routing clear \
    --resource-group "$resource_group_name" \
    --name "$resource_name"
}

__set_traffic() {
  local staging_percentage="$3"
  az webapp traffic-routing set \
    --resource-group "$resource_group_name" \
    --name "$resource_name" \
    --distribution "staging=${staging_percentage}"
}

__swap_versions() {
  echo "Swapping staging slot to production"
  az webapp deployment slot swap \
    --resource-group "$resource_group_name" \
    --name "$resource_name" \
    --slot staging \
    --target-slot production
}

__finalize() {
  echo "Finalizing rollout by setting traffic to 100% production"
  __set_traffic "$resource_group_name" "$resource_name" 0
  __swap_versions
}
