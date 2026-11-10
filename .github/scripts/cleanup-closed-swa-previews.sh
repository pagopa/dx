#!/usr/bin/env bash
# Remove stale Azure Static Web App previews after checking their PR state on GitHub.
set -euo pipefail

: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}"
: "${STATIC_WEB_APP_NAME:?STATIC_WEB_APP_NAME must be set}"
: "${RESOURCE_GROUP_NAME:?RESOURCE_GROUP_NAME must be set}"
: "${GH_TOKEN:?GH_TOKEN must be set}"

# Dry runs perform the same checks but never delete an environment.
dry_run="${DRY_RUN:-false}"
if [[ "$dry_run" != "true" && "$dry_run" != "false" ]]; then
  echo "::error::DRY_RUN must be 'true' or 'false'."
  exit 1
fi

environments="$(az staticwebapp environment list \
  --name "$STATIC_WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP_NAME" \
  --output json)"

echo "Preview inventory diagnostics:"
jq '[.[] | {name, buildId, pullRequestTitle, properties: (.properties | {buildId, pullRequestTitle})}]' <<<"$environments"

# Only consider PR previews with numeric build IDs, which correspond to PR numbers.
# Production and named environments are excluded; Azure IDs may be strings or numbers.
preview_ids="$(jq -r '
    (if type == "array" then .[] else .value[] end)
    | select(.properties.pullRequestTitle != null)
    | .properties.buildId
    | select(type == "string" or type == "number")
    | tostring
    | select(test("^[1-9][0-9]*$"))
  ' <<<"$environments")"

if [[ -z "$preview_ids" ]]; then
  echo "No pull-request preview environments found."
  exit 0
fi

while IFS= read -r preview_id; do
  # GitHub reports both merged PRs and PRs closed without merging as "closed".
  # Keep open PR previews; API errors stop the script instead of assuming closure.
  state="$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${preview_id}" --jq .state)"
  if [[ "$state" == "closed" ]]; then
    if [[ "$dry_run" == "true" ]]; then
      echo "Would delete preview environment for closed PR #${preview_id}."
    else
      echo "Deleting preview environment for closed PR #${preview_id}."
      az staticwebapp environment delete \
        --name "$STATIC_WEB_APP_NAME" \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --environment-name "$preview_id" \
        --yes \
        --only-show-errors
    fi
  elif [[ "$state" == "open" ]]; then
    echo "Keeping preview environment for open PR #${preview_id}."
  else
    echo "::error::Unexpected GitHub state '${state}' for PR #${preview_id}."
    exit 1
  fi
done <<<"$preview_ids"
