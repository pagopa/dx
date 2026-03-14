# Tests — azure_storage_account

This directory contains the test suite for the `azure_storage_account` Terraform module,
organized in three layers following the HashiCorp Testing Framework best practices.

## Test Layers

| Layer       | File                     | Purpose                                             | Infrastructure             |
| ----------- | ------------------------ | --------------------------------------------------- | -------------------------- |
| Unit        | `unit.tftest.hcl`        | Verify module logic and defaults                    | Mocked (no real resources) |
| Contract    | `contract.tftest.hcl`    | Validate variable constraints and expected failures | Mocked (no real resources) |
| Integration | `integration.tftest.hcl` | Provision real resources and verify behavior        | Real Azure subscription    |

## Running Tests

```bash
# Unit tests (fast, no Azure credentials needed)
nx run azure_storage_account:test:unit

# Contract tests (fast, no Azure credentials needed)
nx run azure_storage_account:test:contract

# Integration tests (requires a real Azure subscription)
nx run azure_storage_account:test:integration
```

## Unit Tests (`unit.tftest.hcl`)

18 run blocks covering all use cases and feature flags:

| #   | Run block                                            | Verifies                                                                                     |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | `storage_account_security_defaults`                  | TLS 1.2, HTTPS-only, no cross-tenant, StorageV2                                              |
| 2   | `storage_account_default_use_case`                   | Standard + ZRS, no infra encryption, shared key enabled                                      |
| 3   | `storage_account_development_use_case`               | LRS, no infra encryption, no alerts                                                          |
| 4   | `storage_account_delegated_access_use_case`          | Shared key disabled, public access, Defender enabled                                         |
| 5   | `storage_account_audit_use_case`                     | Infra encryption, OAuth, ZRS, immutability, lifecycle policy, secondary replica, diagnostics |
| 6   | `storage_account_archive_use_case`                   | LRS, immutability, lifecycle policy, secondary replica                                       |
| 7   | `storage_account_public_network`                     | Public access, no PEP, Defender enabled                                                      |
| 8   | `storage_account_private_network`                    | Private access, PEP blob created                                                             |
| 9   | `storage_account_immutability_forces_versioning`     | Versioning and change feed forced on when immutability enabled                               |
| 10  | `storage_account_blob_retention`                     | Delete retention policy days set correctly                                                   |
| 11  | `storage_account_containers_subresources`            | Containers, tables and queues counts                                                         |
| 12  | `storage_account_container_immutability`             | Container-level immutability only for containers with policy                                 |
| 13  | `storage_account_alerts_created`                     | Health check alert created for default use case                                              |
| 14  | `storage_account_no_alerts_development`              | No alerts for development use case                                                           |
| 15  | `storage_account_cmk_system_identity`                | SystemAssigned identity when no user-assigned identity                                       |
| 16  | `storage_account_cmk_user_assigned_identity`         | SystemAssigned+UserAssigned identity when UAI provided                                       |
| 17  | `storage_account_static_website`                     | Static website index and 404 document                                                        |
| 18  | `storage_account_override_infrastructure_encryption` | Deprecated override disables infra encryption                                                |

## Contract Tests (`contract.tftest.hcl`)

16 run blocks, one-to-one mapping with `validation {}` blocks in `variables.tf`:

| #   | Run block                                       | Variable validated         |
| --- | ----------------------------------------------- | -------------------------- |
| 1   | `invalid_use_case`                              | `var.use_case`             |
| 2   | `missing_subnet_pep_for_private_storage`        | `var.subnet_pep_id`        |
| 3   | `audit_requires_cmk`                            | `var.customer_managed_key` |
| 4   | `audit_requires_diagnostic_settings_with_law`   | `var.diagnostic_settings`  |
| 5   | `audit_no_diagnostic_settings_at_all`           | `var.diagnostic_settings`  |
| 6   | `audit_subservices_require_blob_or_file`        | `var.subservices_enabled`  |
| 7   | `audit_only_table_not_enough`                   | `var.subservices_enabled`  |
| 8   | `immutability_incompatible_with_restore_policy` | `var.blob_features`        |
| 9   | `invalid_immutability_state`                    | `var.blob_features`        |
| 10  | `delete_retention_days_out_of_range`            | `var.blob_features`        |
| 11  | `restore_policy_days_out_of_range`              | `var.blob_features`        |
| 12  | `audit_with_nonzero_delete_retention`           | `var.blob_features`        |
| 13  | `archive_with_nonzero_restore_policy`           | `var.blob_features`        |
| 14  | `invalid_container_access_type`                 | `var.containers`           |
| 15  | `container_immutability_period_too_low`         | `var.containers`           |
| 16  | `audit_retention_days_out_of_range`             | `var.audit_retention_days` |

## Integration Tests (`integration.tftest.hcl`)

5 run blocks that provision real Azure resources:

| #   | Run block                | Scenario                                                  |
| --- | ------------------------ | --------------------------------------------------------- |
| 1   | `setup`                  | Provisions shared test infrastructure via `./tests/setup` |
| 2   | `apply_default`          | Default use case (ZRS, private endpoints)                 |
| 3   | `apply_development`      | Development use case (LRS, public access)                 |
| 4   | `apply_delegated_access` | Delegated access (no shared key, public, Defender)        |
| 5   | `apply_public_network`   | Forced public network (no PEPs, Defender)                 |

> **Note**: Integration tests require a real Azure subscription and pre-provisioned test
> infrastructure. They are only run on CI/CD. Do not run locally unless you have the
> required Azure environment.

## Setup Module (`setup/`)

Provides shared infrastructure for integration tests only. See `setup/README.md` for details.
