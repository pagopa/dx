#!/usr/bin/env bash
set -euo pipefail

# Detect modified config files and OpenAPI specifications
# Inputs:
#   CONFIG_PATTERN - Glob pattern to find dashboard config files
#   BASE_REF - Base git reference for change detection (commit SHA or ref)
# Outputs:
#   Sets GITHUB_OUTPUT: changed_dashboards (JSON array)

# Helper function to normalize paths (realpath fallback for macOS compatibility)
# The -m flag (for non-existent paths) is a GNU extension not available on macOS
normalize_path() {
  local path="${1}"

  # Try GNU realpath with -m flag first (for non-existent paths)
  if realpath -m "${path}" 2>/dev/null; then
    return 0
  fi

  # Fallback for systems without GNU realpath -m (e.g., macOS)
  # Manually construct the absolute path without requiring the file to exist
  if [[ "${path}" = /* ]]; then
    # Absolute path - just normalize it
    echo "${path}"
  else
    # Relative path - make it absolute
    echo "$(cd "$(dirname "${path}")" && pwd)/$(basename "${path}")"
  fi
}

# Validate CONFIG_PATTERN to prevent injection attacks
if [[ "${CONFIG_PATTERN}" =~ [\;\|\&\`\$\(\)] ]]; then
  echo "::error::Invalid characters in config_pattern: ${CONFIG_PATTERN}"
  echo "::error::Pattern must not contain: ; | & \` $ ( )"
  exit 1
fi

# Get list of changed files using provided BASE_REF
if [ -z "${BASE_REF:-}" ]; then
  echo "::error::BASE_REF environment variable is required"
  exit 1
fi

# Validate BASE_REF to prevent injection attacks
if [[ "${BASE_REF}" =~ [^A-Za-z0-9/_^-] ]]; then
  echo "::error::Invalid characters in BASE_REF: ${BASE_REF}"
  echo "::error::BASE_REF may only contain: alphanumeric, hyphen (-), underscore (_), forward slash (/), caret (^)"
  exit 1
fi
# Validate BASE_REF to prevent injection attacks
if [[ "${BASE_REF}" =~ [^A-Za-z0-9/_^-] ]]; then
  echo "::error::Invalid characters in BASE_REF: ${BASE_REF}"
  echo "::error::BASE_REF may only contain: alphanumeric, hyphen (-), underscore (_), forward slash (/), caret (^)"
  exit 1
fi
CHANGED_FILES=$(git diff --name-only HEAD "${BASE_REF}" 2>/dev/null || echo "")

echo "Changed files:"
echo "${CHANGED_FILES}"

# Find all config files matching the pattern(s)
# CONFIG_PATTERN can be multiple patterns (newline-separated)
CONFIG_FILES=""
while IFS= read -r pattern; do
  # Skip empty lines
  if [ -z "${pattern}" ]; then
    continue
  fi

  # Find files matching this pattern
  PATTERN_FILES=$(find . -path "./${pattern}" -type f 2>/dev/null | sed 's|^\./||' || echo "")

  if [ -n "${PATTERN_FILES}" ]; then
    CONFIG_FILES="${CONFIG_FILES}${PATTERN_FILES}"$'\n'
  fi
done <<< "${CONFIG_PATTERN}"

# Remove trailing newline and duplicates
CONFIG_FILES=$(echo "${CONFIG_FILES}" | grep -v '^$' | sort -u)

echo "Found config files:"
echo "${CONFIG_FILES}"

CHANGED_DASHBOARDS="[]"
WORKSPACE_ROOT=$(pwd)

while IFS= read -r config; do
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
    if command -v yq >/dev/null 2>&1; then
      OA3_SPEC=$(yq -r '.oa3_spec // ""' "${config}" 2>/dev/null | tr -d '"' | tr -d "'" | xargs)
    else
      OA3_SPEC=$(grep -E "^[[:space:]]*oa3_spec:" "${config}" | sed 's/^[[:space:]]*oa3_spec:[[:space:]]*//' | tr -d '"' | tr -d "'" | xargs)
    fi

    if [ -n "${OA3_SPEC}" ]; then
      # Handle relative paths
      if [[ "${OA3_SPEC}" != /* ]] && [[ "${OA3_SPEC}" != http* ]]; then
        OA3_SPEC_FULL=$(cd "${CONFIG_DIR}" && normalize_path "${OA3_SPEC}" 2>/dev/null | sed "s|^${WORKSPACE_ROOT}/||" || echo "")

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
done <<< "${CONFIG_FILES}"

echo "changed_dashboards=${CHANGED_DASHBOARDS}" >> "${GITHUB_OUTPUT}"
echo "Dashboards to regenerate: ${CHANGED_DASHBOARDS}"
