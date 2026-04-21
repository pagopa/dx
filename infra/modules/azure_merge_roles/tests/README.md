# Tests for azure_merge_roles

This module currently provides fast local coverage through mocked Terraform tests:

- `tests/unit.tftest.hcl` verifies permission block preservation, description generation, assignable scope defaults, and preservation of `not_actions` and `not_data_actions` through separate permission blocks.
- `tests/contract.tftest.hcl` verifies variable validations.

## Run Locally

From the module directory:

```bash
pnpm run tf-init
pnpm run test:unit
pnpm run test:contract
```

From the workspace root:

```bash
pnpm nx run azure_merge_roles:test:unit
pnpm nx run azure_merge_roles:test:contract
```

## Notes

- Tests use `mock_provider "azurerm" {}` and never call Azure.
- The exclusion scenario is intentionally covered because the module now preserves each source permission block instead of collapsing all permissions into a single custom-role block.