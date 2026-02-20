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

# --- Determine package manager command ---

case "${PACKAGE_MANAGER:-npm}" in
  pnpm) RUN_CMD="pnpm dlx" ;;
  yarn) RUN_CMD="yarn dlx" ;;
  *)    RUN_CMD="npx --yes" ;;
esac

echo "Using: ${PACKAGE_MANAGER:-npm} (${RUN_CMD})"

# --- Generate dashboards ---

failures=0

while IFS= read -r config; do
  [[ -z "${config}" ]] && continue

  config_dir=$(dirname "${config}")
  echo "Generating dashboard from: ${config}"

  if ${RUN_CMD} "@pagopa/opex-dashboard@${OPEX_VERSION}" generate \
    -t azure-dashboard -c "${config}" --package "${config_dir}"; then
    echo "Generated Terraform in: ${config_dir}"
  else
    echo "::error::Failed to generate dashboard for: ${config}"
    failures=$((failures + 1))
  fi
done < <(jq -r '.[]' <<< "${CHANGED_DASHBOARDS}")

if [[ ${failures} -gt 0 ]]; then
  echo "::error::${failures} dashboard(s) failed to generate"
  exit 1
fi
