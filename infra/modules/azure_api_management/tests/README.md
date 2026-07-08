# Azure API Management tests

This module uses Terraform's native testing framework with separate test layers.

| Layer | File | Purpose | Local execution |
| --- | --- | --- | --- |
| Unit | `unit.tftest.hcl` | Mocked provider tests for use-case defaults, generated subnet/public IP behavior, hostname normalization, and Application Insights wiring. | `terraform test -filter=tests/unit.tftest.hcl` |
| Contract | `contract.tftest.hcl` | Mocked provider tests for validation failures and accepted simplified contract inputs. | `terraform test -filter=tests/contract.tftest.hcl` |
| Integration | `integration.tftest.hcl` | Real Azure apply scenarios using `tests/setup` for shared infrastructure. | Run only in CI/scheduled integration jobs. |

The `tests/setup` module reads the shared test resource group, virtual network, and Log Analytics workspace, and emits random instance numbers to isolate integration runs.
