# AzureRM v5 module migration

The module majors below require **AzureRM >= 5.8.0, < 6.0.0**. Version 5.8.0
is the local validation baseline; v4 and v6 are excluded. This is a coordinated
major migration, not a promise that every module can support both provider
schemas. No additional AzAPI provider or authentication is introduced.

Earlier v4-compatible releases remain supported through **31 December 2026**.
The workflow warning is advisory, not an early ban on those releases. See the
[tooling lifecycle](https://dx.pagopa.it/docs/tooling-lifecycle).

## Release coverage

| Module                                         | First v5-only major |
| ---------------------------------------------- | ------------------- |
| aws_azure_vpn                                  | 3                   |
| azure_api_management                           | 5                   |
| azure_app_configuration                        | 3                   |
| azure_app_service                              | 6                   |
| azure_app_service_exposed                      | 6                   |
| azure_app_service_plan_autoscaler              | 5                   |
| azure_cdn                                      | 3                   |
| azure_container_app                            | 9                   |
| azure_container_app_environment                | 5                   |
| azure_core_infra                               | 7                   |
| azure_core_values_exporter                     | 3                   |
| azure_cosmos_account                           | 3                   |
| azure_event_hub                                | 3                   |
| azure_federated_identity_with_github           | 4                   |
| azure_function_app                             | 8                   |
| azure_function_app_exposed                     | 6                   |
| azure_github_environment_bootstrap             | 7                   |
| azure_managed_redis                            | 3                   |
| azure_merge_roles                              | 3                   |
| azure_postgres_server                          | 6                   |
| azure_role_assignments                         | 5                   |
| azure_service_bus_alerts                       | 3                   |
| azure_service_bus_namespace                    | 3                   |
| azure_storage_account                          | 5                   |
| github_selfhosted_runner_on_container_app_jobs | 4                   |

Only published roots under `infra/modules` that declare AzureRM, and their
nested modules and fixtures, are in scope. `infra/resources` and modules without
AzureRM have not been migrated.

## Before upgrading

1. Back up the state securely and retain the current configuration and provider
   lock file. Review the [upstream v5 upgrade guide](https://registry.terraform.io/providers/hashicorp/azurerm/5.8.0/docs/guides/5.0-upgrade-guide)
   for resources outside these modules too.
2. On v4, first adopt the backward-compatible preparation releases from
   [CES-2366](https://github.com/pagopa/dx/pull/2327). For Storage, **use AzureRM
   4.81 or later within v4** and review/apply that preparation before switching
   provider majors. Although `storage_account_id` exists for tables from 4.77,
   4.77-4.80 mark the selector change for replacement; 4.81 implements the
   same-account, in-place conversion. Check the actual plan rather than
   assuming upgrading a constraint migrates existing state.
3. Upgrade all AzureRM-dependent modules in a Terraform root together. Terraform
   selects one version per provider source: an old v4-only dependency cannot
   coexist with a v5-only module, even through provider aliases. Update the root
   constraint and run `terraform init -upgrade`; review and commit the resulting
   provider lock file for your deployment platforms.
4. Arrange Azure Resource Provider registration explicitly. AzureRM v5 defaults
   `resource_provider_registrations` to `none`, not `legacy`. Pre-register the
   namespaces your stack uses or configure `resource_providers_to_register`
   with an appropriately authorized identity. Modules do not silently expand
   subscription permissions or register providers for consumers. The removed
   `skip_provider_registration` and changed enhanced-validation settings must
   also be addressed in caller provider configurations.
5. Review the plan against your real state in a non-production environment.
   Stop for unexpected deletion, replacement, access-policy/RBAC changes,
   subnet endpoint removal, or DNS changes. Mocked tests and schema validation
   do **not** establish production upgrade safety.

Published dependency prerequisites must be available before dependent releases
can initialize: `azure-role-assignments` v5 before `azure-app-configuration` v3;
`azure-merge-roles` v3 before `azure-core-infra` v7 (including custom roles);
Container App Jobs runner v4 before `azure-github-environment-bootstrap` v7.
The release process must publish those prerequisites first. Their current
published versions are respectively 4.0.4, 2.0.6 and 3.0.3; the major version
plan advances them to 5, 3 and 4. The checked-in Registry references are release
prerequisites, not a claim that those versions are already published.

The examples and test fixtures in this monorepo use checkout-local sources.
Run them from a complete repository checkout, not an isolated copied example.
For deployed Registry consumers, including the usage snippets in the READMEs,
wait for the dependency majors and then their consumers to be published.

## Configuration and state changes

The existing module resource addresses are retained, except for the new
standalone Storage static website resource described below. Do not rename
module calls or remove existing resources from state as part of this upgrade.

- App Service and Function App subnets use `service_endpoint` blocks. The public
  `subnet_service_endpoints` input is unchanged; the selected service names are
  preserved. `cosmos = true` now emits the valid service name
  `Microsoft.AzureCosmosDB` instead of the invalid `Microsoft.CosmosDB`, which
  v5 rejects during planning. The Event Hub example uses the same v5 block shape.
- API Management's three private DNS A records and Core Infrastructure's private
  DNS VNet links use `private_dns_zone_id`, retaining their resource names,
  addresses and target zones. Existing zone IDs and virtual-network IDs must
  resolve to the same resources. Review their real-state plan; do not accept
  an unexpected DNS replacement.
- The preceding v4 preparation already migrated VPN `bgp_enabled`, Cosmos
  `local_authentication_enabled = false`, versionless Storage CMK URLs and
  account/container IDs. Keep automatic key rotation and authentication
  behavior unchanged.
- Storage accounts use `public_network_access = "Enabled"` or `"Disabled"`
  instead of the v5.8-deprecated boolean. The public module input
  `force_public_network_access_enabled` and its behavior are unchanged,
  including secondary replicas and Function App storage accounts.
- Front Door example rules use the v5 names (`behaviour_on_match`,
  `url_redirect`, `destination_host_name`, `host_name`, `values`). The PostgreSQL
  example explicitly retains Key Vault access-policy authorization with
  `rbac_authorization_enabled = false`; v5 makes this setting required rather
  than allowing the omitted setting to select v4's access-policy default.

### Existing Storage static websites

The removed inline `azurerm_storage_account.this.static_website` block is now
`azurerm_storage_account_static_website.this[0]`. This manages the website
settings on the **same** account; it is not a new storage account or a copy of
the `$web` container.

The `static_website` object retains its fields and disabled default. When
`enabled = true`, at least one of `index_document` and `error_404_document` is
now required. An index must be 3-255 characters with no `/`; a supplied error
document cannot be empty. Error-only configurations and error-document paths
remain valid. No filename is silently substituted. Previously valid
`enabled = true` with both documents null must be explicitly corrected before
this upgrade.

For an existing enabled website:

1. Complete the v4 preparation above while retaining the inline website and
   its current documents. Do **not** set `enabled = false`, remove an inline
   block and apply v4 as an intermediate step, or independently manage the
   same website with two resources.
2. Switch configuration to the v5-only module and initialize AzureRM v5.
   Keep `enabled = true` and the same valid document values.
3. **Before applying**, import the existing website into the new standalone
   address. Its import ID is the account's ARM resource ID, not the website
   URL or `$web` container ID. For a module call named `storage`:

   ```shell
   terraform import 'module.storage.azurerm_storage_account_static_website.this[0]' \
     '/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.Storage/storageAccounts/<account-name>'
   ```

   Adapt the full address for nested modules and `for_each` keys. A
   configuration-driven import targeting the same address/ID is also possible;
   review its plan. Import reads Azure and writes Terraform state, so it must
   be run by the authorized operator with state locking and a backup.

4. Plan and confirm the account is neither destroyed nor replaced and the
   imported documents match the existing website. There must be only one
   owner of website settings. The v5 account schema no longer manages the
   inline block; do not use `terraform state rm` on the storage account.

An inline block is not a separately addressable state resource: there is no
valid `moved` block from it to the standalone resource. If the website was
already managed by an external standalone resource, move that whole resource's
state to the module's new address instead of importing a second owner.

The standalone resource uses storage data-plane operations. Ensure the execution
identity and network can read/update website properties with the account's
chosen authentication mode. Account name, ID and web-host outputs depend on
website setup so downstream consumers wait for it. A Storage account data
source re-reads the web host after website setup: an output dependency alone
would not refresh the account's pre-website endpoint on first apply.
Turning `enabled` off after
migration destroys the standalone settings resource and **disables website
hosting**; it must be an intentional change, not an upgrade step.

This migration procedure is based on provider schemas and implementation, not
a completed live upgrade rehearsal. Test import, subsequent no-op plan and
site availability against representative non-production state before production.

## Validation and integration gate

Local validation uses AzureRM 5.8.0 with isolated, mocked unit/contract tests.
Tests and examples select v5; no tracked module lock files pin v4. Schema checks
also cover nested modules, examples and integration setup, but do not establish
Azure API behavior or detect every provider replacement condition.

Before these majors are released, run authorized integration/e2e validation
against the draft checkout, including an existing-state upgrade rehearsal for
Storage tables, static websites, subnet endpoints and DNS records/links.
Normal Nx `test-integration` and `e2e` targets provision real infrastructure:
they are **not** part of the local validation, and must be triggered separately.
The existing `_cron-terraform-integration-tests.yaml` and
`_cron-terraform-e2e-tests.yaml` workflows resolve in-scope Registry module
dependencies to checkout-local modules before running Nx. This includes
transitive Role Assignments, Merge Roles and runner dependencies, so draft
tests do not wait for their publication. Test result caching is disabled.
The repository's ordinary PR checks use the same resolver after checking
generated documentation against the original, publishable Registry sources.
External consumers of `validate-v2.yaml` do not run this repository-only step.

An authorized operator can dispatch the existing workflows on the draft branch:

```shell
gh workflow run _cron-terraform-integration-tests.yaml --repo pagopa/dx --ref ces-2367-azurerm-v5-major
gh workflow run _cron-terraform-e2e-tests.yaml --repo pagopa/dx --ref ces-2367-azurerm-v5-major
```

These commands create/destroy real test infrastructure and require the existing
UAT environment credentials/approvals. They were not run as local validation.
For equivalent manual tests, use a disposable full checkout, run
`python3 .github/scripts/use-local-terraform-modules.py infra/modules`, then the
appropriate Nx targets. Never publish or deploy the rewritten checkout; the
resolver is test-only and leaves the committed release configuration untouched.

The lifecycle communication depends on
[CES-2365](https://github.com/pagopa/dx/pull/2326). Its shared action must land on
`main` before the `@main` workflow references can execute it. The major PR
temporarily contains the prerequisite action/workflow changes, without copying
CES-2365's release plans; rebase away that overlap once the notice PR lands.
