#!/usr/bin/env bash
set -euo pipefail

# Generate Terraform for changed dashboard configurations
# Inputs:
#   CHANGED_DASHBOARDS - JSON array of dashboard config file paths
#   OPEX_VERSION - Version of @pagopa/opex-dashboard to use
#   PACKAGE_MANAGER - Package manager to use (npm, pnpm, yarn)

# Validate OPEX_VERSION format to prevent command injection
if [[ ! "${OPEX_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$|^latest$ ]]; then
  echo "::error::Invalid opex_dashboard_version format: ${OPEX_VERSION}"
  echo "::error::Expected semantic version (e.g., 1.2.3) or 'latest'"
  exit 1
fi

# Determine the appropriate command based on package manager
case "${PACKAGE_MANAGER:-npm}" in
  pnpm)
    RUN_CMD="pnpm dlx"
    ;;
  yarn)
    RUN_CMD="yarn dlx"
    ;;
  npm|*)
    RUN_CMD="npx --yes"
    ;;
esac

echo "Using package manager: ${PACKAGE_MANAGER:-npm} (command: ${RUN_CMD})"

# Function to generate a single dashboard
generate_dashboard() {
  local config=$1
  local CONFIG_DIR
  CONFIG_DIR=$(dirname "${config}")

  echo "Generating dashboard from: ${config}"

  # Generate Terraform in the same directory as the config
  if ${RUN_CMD} "@pagopa/opex-dashboard@${OPEX_VERSION}" generate \
    -t azure-dashboard \
    -c "${config}" \
    --package "${CONFIG_DIR}"; then
    echo "✓ Generated Terraform in: ${CONFIG_DIR}"
  else
    echo "::error::Failed to generate dashboard for: ${config}"
    return 1
  fi
}

export -f generate_dashboard
export OPEX_VERSION
export RUN_CMD

# Generate dashboards in parallel (max 4 concurrent)
echo "${CHANGED_DASHBOARDS}" | jq -r '.[]' | xargs -P 4 -I {} bash -c 'generate_dashboard "$@"' _ {}
