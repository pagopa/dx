#!/usr/bin/env bash
set -euo pipefail

# Generate Terraform for changed dashboard configurations.
#
# Usage:
#   generate-terraform.sh --changed-dashboards <json> --opex-version <version> [--package-manager <manager>]
#
# Options:
#   --changed-dashboards <json>  JSON array of dashboard config file paths
#   --opex-version <version>     Version of @pagopa/opex-dashboard to use
#   --package-manager <manager>  Package manager to use (npm, pnpm, yarn) (default: npm)

# Parse command-line arguments
CHANGED_DASHBOARDS=""
OPEX_VERSION=""
PACKAGE_MANAGER="npm"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --changed-dashboards)
      CHANGED_DASHBOARDS="$2"
      shift 2
      ;;
    --opex-version)
      OPEX_VERSION="$2"
      shift 2
      ;;
    --package-manager)
      PACKAGE_MANAGER="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# --- Input validation ---

if [[ ! "${OPEX_VERSION}" =~ ^([0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?)$ ]]; then
  echo "::error::Invalid opex_dashboard_version format: ${OPEX_VERSION}"
  exit 1
fi

# --- Determine package manager command ---

case "${PACKAGE_MANAGER}" in
  pnpm) RUN_CMD="pnpm dlx" ;;
  yarn) RUN_CMD="yarn dlx" ;;
  *)    RUN_CMD="npx --yes" ;;
esac

echo "Using: ${PACKAGE_MANAGER} (${RUN_CMD})"

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
