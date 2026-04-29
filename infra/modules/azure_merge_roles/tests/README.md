# Tests for azure_merge_roles

This module currently provides fast local coverage through mocked Terraform tests:

- `tests/unit.tftest.hcl` verifies single-block permission compaction, description generation, assignable scope defaults, and exact exclusion overrides that Azure custom roles can represent.
- `tests/contract.tftest.hcl` verifies variable validations.
- `tests/e2e_test.go` validates both real Blob data-plane permissions and blob container control-plane permissions with user-assigned managed identities and merged custom roles.

## Run Locally

From the module directory:

```bash
pnpm run tf-init
pnpm run test:unit
pnpm run test:contract
pnpm run test:e2e
```

From the workspace root:

```bash
pnpm nx run azure_merge_roles:test:unit
pnpm nx run azure_merge_roles:test:contract
pnpm nx run azure_merge_roles:test:e2e
```

## Notes

- `tests/unit.tftest.hcl` and `tests/contract.tftest.hcl` use `mock_provider "azurerm" {}` for fast local validation and do not call Azure; `tests/e2e_test.go` is a real end-to-end test that requires Azure infrastructure.
- The exclusion scenario is intentionally covered because Azure custom roles only accept one permissions object, so the module must calculate the effective merged result instead of copying source blocks verbatim.
- The real Azure E2E now locks two behaviors: the permissive wildcard-override policy on Blob delete restore, and the analogous control-plane behavior on blob container resource delete restore.
- The E2E scenario uses Azure Container Instances as probe runners because the repo already uses that pattern for managed-identity tests. This is a pragmatic test-only choice; Azure Container Apps remains the preferred runtime for production workloads.
- The E2E scenario requires a published probe image and real Azure infrastructure, so it should not be executed during normal local development.
