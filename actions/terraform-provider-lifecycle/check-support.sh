#!/usr/bin/env bash

set -euo pipefail

if ! AZURERM_VERSION=$(terraform version -json | jq -r '.provider_selections["registry.terraform.io/hashicorp/azurerm"] // empty'); then
  echo "::warning title=AzureRM lifecycle check::Unable to determine the selected AzureRM version. Check the DX support deadlines at https://dx.pagopa.it/docs/tooling-lifecycle."
  exit 0
fi

if [[ "$AZURERM_VERSION" != 4.* ]]; then
  exit 0
fi

echo "::warning title=AzureRM v4 support::DX tooling will drop support for AzureRM v4 on 31 December 2026. Plan migration to AzureRM v5 and compatible DX module versions before this date. See https://dx.pagopa.it/docs/tooling-lifecycle."

render_notice() {
  cat <<'EOF'
## AzureRM v4 support

DX tooling will drop support for AzureRM v4 on **31 December 2026**.

Plan migration to AzureRM v5 and compatible DX module versions before this date. Check each module's `required_providers` constraints before upgrading. See the [DX tooling lifecycle](https://dx.pagopa.it/docs/tooling-lifecycle).

This notice is advisory and does not block Terraform plan or apply.
EOF
}

NOTICE=$(render_notice)

{
  echo "notice<<DX_LIFECYCLE_NOTICE"
  printf '%s\n' "$NOTICE"
  echo "DX_LIFECYCLE_NOTICE"
} >> "$GITHUB_OUTPUT"

if [[ "$WRITE_SUMMARY" == "true" ]]; then
  printf '%s\n' "$NOTICE" >> "$GITHUB_STEP_SUMMARY"
fi
