#!/usr/bin/env bash
set -euo pipefail

# Generate Terraform for changed dashboard configurations
# Inputs:
#   CHANGED_DASHBOARDS - JSON array of dashboard config file paths
#   OPEX_VERSION - Version of @pagopa/opex-dashboard to use

while IFS= read -r config; do
  CONFIG_DIR=$(dirname "${config}")

  echo "Generating dashboard from: ${config}"

  # Generate Terraform in the same directory as the config
  npx "@pagopa/opex-dashboard@${OPEX_VERSION}" generate \
    -t azure-dashboard \
    -c "${config}" \
    --package "${CONFIG_DIR}"

  echo "Generated Terraform in: ${CONFIG_DIR}"
done < <(echo "${CHANGED_DASHBOARDS}" | jq -r '.[]')
