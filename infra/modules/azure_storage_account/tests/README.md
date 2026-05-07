# Tests for azure_storage_account

This module now has four validation layers:

- `tests/unit.tftest.hcl` validates mocked module behavior, including the `delegated_access` profile defaults.
- `tests/contract.tftest.hcl` validates input contracts and expected failures.
- `tests/integration.tftest.hcl` provisions real Azure infrastructure for selected module scenarios.
- `tests/e2e_test.go` applies the local `examples/delegated-access-sas` fixture and runs the Go verifier that generates a user delegation SAS and exercises blob upload/download through the signed URL.

## Run locally

From the module directory:

```bash
pnpm run test:unit
pnpm run test:contract
pnpm run test:integration
pnpm run test:e2e
```

The e2e test requires valid Azure credentials because the verifier uses `DefaultAzureCredential` after the fixture grants the current caller the necessary Blob roles.