#!/usr/bin/env bash

set -euo pipefail

operation=${1:?Label operation is required}
container_app_name=${2:?Container App name is required}
resource_group_name=${3:?Resource group name is required}
revision_name=${4:?Candidate revision name is required}

if [[ "$operation" != "add" && "$operation" != "remove" ]]; then
  echo "::error::Unsupported label operation: $operation" >&2
  exit 1
fi

if [[ "$revision_name" != "$container_app_name"--* ]]; then
  echo "::error::An explicit revision name belonging to $container_app_name is required." >&2
  exit 1
fi

read_staging_revision() {
  app=$(az containerapp show \
    --name "$container_app_name" \
    --resource-group "$resource_group_name" \
    --query '{fqdn:properties.configuration.ingress.fqdn,latestRevisionName:properties.latestRevisionName,traffic:properties.configuration.ingress.traffic}' \
    --output json)

  staging_revision=$(jq -er '
    . as $app |
    if (.traffic | type) != "array" then
      error("Expected Container App ingress traffic")
    else
      [.traffic[] | select(.label == "staging") |
        if .latestRevision == true then $app.latestRevisionName else .revisionName end
      ] |
      if length == 0 then ""
      elif length == 1 and (.[0] | type) == "string" and .[0] != "" then .[0]
      else error("Cannot identify the staging revision")
      end
    end
  ' <<< "$app")
}

if [[ "$operation" == "add" ]]; then
  az containerapp revision label add \
    --name "$container_app_name" \
    --resource-group "$resource_group_name" \
    --revision "$revision_name" \
    --label staging \
    --yes \
    --output none

  read_staging_revision
  if [[ "$staging_revision" != "$revision_name" ]]; then
    echo "::error::The staging label does not target candidate revision $revision_name." >&2
    exit 1
  fi

  fqdn=$(jq -er '.fqdn | select(type == "string" and length > 0)' <<< "$app")
  if [[ "$fqdn" != "$container_app_name".* ]]; then
    echo "::error::Cannot derive the staging URL from Container App FQDN: $fqdn" >&2
    exit 1
  fi
  staging_url="https://${container_app_name}---staging.${fqdn#*.}"
  echo "staging_url=$staging_url" >> "${GITHUB_OUTPUT:?}"
  printf "### Staging revision\n\nRevision: \`%s\`\n\nTest URL: %s\n" \
    "$revision_name" "$staging_url" >> "${GITHUB_STEP_SUMMARY:?}"
else
  read_staging_revision
  if [[ "$staging_revision" != "$revision_name" ]]; then
    echo "::notice::Candidate $revision_name does not own staging; leaving labels unchanged."
    exit 0
  fi

  az containerapp revision label remove \
    --name "$container_app_name" \
    --resource-group "$resource_group_name" \
    --label staging \
    --output none

  read_staging_revision
  if [[ -n "$staging_revision" ]]; then
    echo "::error::The staging label is still assigned after removal." >&2
    exit 1
  fi
fi
