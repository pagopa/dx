#!/usr/bin/env bash
set -euo pipefail

# Detect modified config files and OpenAPI specifications
# Inputs:
#   CONFIG_PATTERN - Glob pattern to find dashboard config files
#   BASE_REF - Base branch reference for diff
#   EVENT_NAME - GitHub event name (pull_request or other)
# Outputs:
#   Sets GITHUB_OUTPUT: changed_dashboards (JSON array)

# Get list of changed files
if [ "${EVENT_NAME}" == "pull_request" ]; then
  CHANGED_FILES=$(git diff --name-only "origin/${BASE_REF}"...HEAD)
else
  CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
fi

echo "Changed files:"
echo "${CHANGED_FILES}"

# Find all config files matching the pattern
CONFIG_FILES=$(find . -path "./${CONFIG_PATTERN}" -type f 2>/dev/null | sed 's|^\./||' || echo "")

echo "Found config files:"
echo "${CONFIG_FILES}"

CHANGED_DASHBOARDS="[]"
WORKSPACE_ROOT=$(pwd)

for config in ${CONFIG_FILES}; do
  if [ -z "${config}" ]; then
    continue
  fi

  CONFIG_DIR=$(dirname "${config}")
  SHOULD_REGENERATE=false

  # Check if config itself was modified
  if echo "${CHANGED_FILES}" | grep -q "^${config}$"; then
    echo "Config modified: ${config}"
    SHOULD_REGENERATE=true
  fi

  # Extract oa3_spec path from config and check if it was modified
  if [ -f "${config}" ]; then
    OA3_SPEC=$(grep -E "^oa3_spec:" "${config}" | sed 's/oa3_spec:\s*//' | tr -d '"' | tr -d "'" | xargs)

    if [ -n "${OA3_SPEC}" ]; then
      # Handle relative paths
      if [[ "${OA3_SPEC}" != /* ]] && [[ "${OA3_SPEC}" != http* ]]; then
        OA3_SPEC_FULL=$(cd "${CONFIG_DIR}" && realpath -m "${OA3_SPEC}" 2>/dev/null | sed "s|^${WORKSPACE_ROOT}/||" || echo "")

        if [ -n "${OA3_SPEC_FULL}" ] && echo "${CHANGED_FILES}" | grep -q "^${OA3_SPEC_FULL}$"; then
          echo "OpenAPI spec modified: ${OA3_SPEC_FULL} (referenced by ${config})"
          SHOULD_REGENERATE=true
        fi
      fi
    fi
  fi

  if [ "${SHOULD_REGENERATE}" = true ]; then
    CHANGED_DASHBOARDS=$(echo "${CHANGED_DASHBOARDS}" | jq --arg c "${config}" '. + [$c]')
  fi
done

echo "changed_dashboards=${CHANGED_DASHBOARDS}" >> "${GITHUB_OUTPUT}"
echo "Dashboards to regenerate: ${CHANGED_DASHBOARDS}"
