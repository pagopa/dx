#!/usr/bin/env bash

set -euo pipefail

if ! AZURERM_VERSION=$(terraform version -json | jq -r '.provider_selections["registry.terraform.io/hashicorp/azurerm"] // empty'); then
  echo "::warning title=AzureRM lifecycle check::Unable to determine the selected AzureRM version. Check the DX support deadlines at https://dx.pagopa.it/docs/tooling-lifecycle."
  exit 0
fi

if [[ "$AZURERM_VERSION" != 4.* ]]; then
  exit 0
fi

echo "::warning title=AzureRM v4 support::Earlier v4-compatible DX module releases remain supported through 31 December 2026. New AzureRM v5-only module majors require AzureRM >= 5.8.0, < 6.0.0. Upgrade related modules together; review the migration guide before applying. See https://dx.pagopa.it/docs/tooling-lifecycle."

render_notice() {
  cat <<'EOF'
## AzureRM v4 support

Earlier v4-compatible DX module releases remain supported through **31 December 2026**. DX tooling drops AzureRM v4 support after this deadline.

New AzureRM v5-only module majors require **AzureRM >= 5.8.0, < 6.0.0**. Upgrade all AzureRM-dependent modules in a Terraform root together; do not mix v4-only and v5-only releases. Check each module's `required_providers` constraints and the [migration guide](https://github.com/pagopa/dx/blob/main/infra/modules/AZURERM_V5_MIGRATION.md), including the intermediate v4.81 storage upgrade and static website state import, before applying. See the [DX tooling lifecycle](https://dx.pagopa.it/docs/tooling-lifecycle).

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
