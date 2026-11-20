#!/bin/bash

# Export provider discovery and, when requested, the legacy job-wide App token.
set -euo pipefail

case "$EXPORT_GITHUB_TOKEN" in
  true|false) ;;
  *)
    echo "::error::export-github-token must be true or false." >&2
    exit 1
    ;;
esac

csp_list=()
if [ -n "${ROLE_ARN:-}" ]; then
  csp_list+=("aws")
fi
if [ -n "${ARM_CLIENT_ID:-}" ] && [ -n "${ARM_TENANT_ID:-}" ] && [ -n "${ARM_SUBSCRIPTION_ID:-}" ]; then
  csp_list+=("azure")
fi
if [ -n "${GH_APP_CLIENT_ID:-}" ] && [ -n "${GH_APP_KEY:-}" ] && [ -n "${GH_APP_INSTALLATION_ID:-}" ]; then
  csp_list+=("github")
fi

printf -v csp_list_joined '%s,' "${csp_list[@]:-}"
csp_list_joined="${csp_list_joined%,}"
printf 'CSP_LIST=%s\n' "$csp_list_joined" >> "$GITHUB_ENV"
if [ "$EXPORT_GITHUB_TOKEN" = "true" ] && [ -n "${GH_APP_TOKEN:-}" ]; then
  printf 'GITHUB_TOKEN=%s\n' "$GH_APP_TOKEN" >> "$GITHUB_ENV"
fi
