#!/usr/bin/env bash
set -euo pipefail

# Detect modified dashboard configs and their referenced OpenAPI specifications.
# Inputs (env vars):
#   CONFIG_PATTERN - Glob pattern(s) to find dashboard config files (newline-separated)
#   BASE_REF       - Base git reference for change detection
# Output (GITHUB_OUTPUT):
#   changed_dashboards - JSON array of config file paths that need regeneration

# --- Input validation ---

if [[ "${CONFIG_PATTERN}" =~ [\;\|\&\`\$\(\)] ]]; then
  echo "::error::Invalid characters in config_pattern: ${CONFIG_PATTERN}"
  exit 1
fi

if [[ -z "${BASE_REF:-}" ]]; then
  echo "::error::BASE_REF environment variable is required"
  exit 1
fi

if [[ "${BASE_REF}" =~ [^A-Za-z0-9/_^~.-] ]]; then
  echo "::error::Invalid characters in BASE_REF: ${BASE_REF}"
  exit 1
fi

# --- Gather changed files and config files ---

CHANGED_FILES=$(git diff --name-only "${BASE_REF}" HEAD 2>/dev/null || echo "")
echo "Changed files:"
echo "${CHANGED_FILES}"

# Find config files matching all provided patterns (newline-separated)
CONFIG_FILES=$(
  while IFS= read -r pattern; do
    [[ -z "${pattern}" ]] && continue
    find . -path "./${pattern}" -type f 2>/dev/null | sed 's|^\./||'
  done <<< "${CONFIG_PATTERN}" | sort -u
)

echo "Found config files:"
echo "${CONFIG_FILES}"

# --- Identify configs that need regeneration ---

changed=()

while IFS= read -r config; do
  [[ -z "${config}" ]] && continue

  should_regenerate=false

  # Check if the config file itself was modified
  if grep -Fqx "${config}" <<< "${CHANGED_FILES}"; then
    echo "Config modified: ${config}"
    should_regenerate=true
  fi

  # Check if the referenced OpenAPI spec was modified
  if [[ -f "${config}" ]]; then
    oa3_spec=$(
      grep -E "^[[:space:]]*oa3_spec:" "${config}" \
        | sed 's/^[[:space:]]*oa3_spec:[[:space:]]*//' \
        | tr -d "\"'" \
        | xargs
    )

    # Only check local (non-HTTP) spec files
    if [[ -n "${oa3_spec}" && "${oa3_spec}" != http* ]]; then
      # Strip leading / to normalize to a workspace-relative path
      spec_path="${oa3_spec#/}"

      if grep -Fqx "${spec_path}" <<< "${CHANGED_FILES}"; then
        echo "OpenAPI spec modified: ${spec_path} (referenced by ${config})"
        should_regenerate=true
      fi
    fi
  fi

  if [[ "${should_regenerate}" == true ]]; then
    changed+=("${config}")
  fi
done <<< "${CONFIG_FILES}"

# --- Build JSON output (single jq invocation instead of per-item jq calls) ---

if [[ ${#changed[@]} -eq 0 ]]; then
  CHANGED_JSON="[]"
else
  CHANGED_JSON=$(printf '%s\n' "${changed[@]}" | jq -R -s -c 'split("\n") | map(select(length > 0))')
fi

echo "changed_dashboards=${CHANGED_JSON}" >> "${GITHUB_OUTPUT}"
echo "Dashboards to regenerate: ${CHANGED_JSON}"
