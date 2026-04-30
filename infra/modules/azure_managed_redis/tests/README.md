# Tests - Azure Managed Redis

Two layers ship with the initial module release; the integration and e2e layers are tracked as follow-ups under [CES-1909](https://pagopa.atlassian.net/browse/CES-1909).

| Layer     | File                  | Provider    | Scope                                                            |
| --------- | --------------------- | ----------- | ---------------------------------------------------------------- |
| Unit      | `unit.tftest.hcl`     | `mock`      | Asserts use_case presets, naming, identity, networking, alerts.  |
| Contract  | `contract.tftest.hcl` | `mock`      | Asserts input validation rules (use_case, SKUs, etc.).           |

Both layers run exclusively with mocked providers and do not contact Azure.

## Running locally

```bash
# From the module root
terraform init
terraform test -filter=tests/unit.tftest.hcl
terraform test -filter=tests/contract.tftest.hcl

# Or via Nx
pnpm nx run azure_managed_redis:test:unit
pnpm nx run azure_managed_redis:test:contract
```

## Mock data

The private DNS zone data source is stubbed with a valid Azure Resource ID so that the private endpoint resource plan succeeds without reaching the registry.
