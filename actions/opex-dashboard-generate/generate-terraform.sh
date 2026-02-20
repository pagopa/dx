#!/usr/bin/env bash
set -euo pipefail

# Generate Terraform for changed dashboard configurations.
# Inputs (env vars):
#   CHANGED_DASHBOARDS - JSON array of dashboard config file paths
#   OPEX_VERSION       - Version of @pagopa/opex-dashboard to use
#   PACKAGE_MANAGER    - Package manager to use (npm, pnpm, yarn)

# --- Input validation ---

if [[ ! "${OPEX_VERSION}" =~ ^([0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?|latest)$ ]]; then
  echo "::error::Invalid opex_dashboard_version format: ${OPEX_VERSION}"
  exit 1
fi

if [[ "${OPEX_VERSION}" == "latest" ]]; then
  echo "::warning::opex_dashboard_version is set to 'latest'. Pin to an explicit version to avoid supply-chain risks."
fi

# --- Determine package manager command ---

case "${PACKAGE_MANAGER:-npm}" in
  pnpm) RUN_CMD="pnpm dlx" ;;
  yarn) RUN_CMD="yarn dlx" ;;
  *)    RUN_CMD="npx --yes" ;;
esac

echo "Using: ${PACKAGE_MANAGER:-npm} (${RUN_CMD})"

# --- Parse dashboard list upfront so jq errors stop the script under set -e ---

DASHBOARD_LIST=$(jq -er '.[]' <<< "${CHANGED_DASHBOARDS}")

# --- Generate dashboards in parallel (max 4 concurrent) ---

generate_dashboard() {
  local config="$1"
  local config_dir
  config_dir=$(dirname "${config}")
  echo "Generating dashboard from: ${config}"

  if ${RUN_CMD} "@pagopa/opex-dashboard@${OPEX_VERSION}" generate \
    -t azure-dashboard -c "${config}" --package "${config_dir}"; then
    echo "Generated Terraform in: ${config_dir}"
  else
    echo "::error::Failed to generate dashboard for: ${config}"
    return 1
  fi
}

export -f generate_dashboard
export OPEX_VERSION RUN_CMD

if ! echo "${DASHBOARD_LIST}" | xargs -r -P 4 -I {} bash -c 'generate_dashboard "$@"' _ {}; then
  echo "::error::One or more dashboards failed to generate"
  exit 1
fi
