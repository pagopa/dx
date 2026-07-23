# Terraform Permission Check Action

This GitHub Action performs a deterministic, read-only preflight of Azure RBAC
permissions required by a saved Terraform plan. It checks whether the separate
Infra CD managed identity can apply supported changes before the CD workflow
runs.

The result is advisory: permission gaps and inconclusive findings are returned
as structured outputs and Markdown, but they do not fail the action. Invalid
inputs, an unreadable Terraform plan, or other action runtime failures do fail
the action and should be handled with `continue-on-error` by advisory workflows.

## How it works

1. Runs `terraform show -json` against a binary plan generated with
   `terraform plan -out=<path>`.
2. Extracts management-plane permission requirements from supported Terraform
   resource changes.
3. Resolves the Infra CD user-assigned managed identity with the Azure SDK.
4. Reads its live role assignments and referenced role definitions at the
   applicable Azure scopes.
5. Evaluates inherited scopes, action wildcards, and `NotActions`.
6. Writes a deterministic Markdown report with the responsible DX layer and
   least-privilege remediation guidance.

The action never applies the Terraform plan and never changes Azure resources,
Terraform state, or source code.

## Current coverage

The rule catalog supports the resource changes exercised by the deterministic
PoC:

| Terraform resource         | Required Azure action                                                | Evaluation scope                                                                         |
| -------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `azurerm_role_assignment`  | `Microsoft.Authorization/roleAssignments/write` or `delete`          | Planned `scope`, or the referenced supported resource scope from Terraform configuration |
| `azurerm_resource_group`   | `Microsoft.Resources/subscriptions/resourceGroups/write` or `delete` | Subscription                                                                             |
| `azurerm_api_management`   | `Microsoft.ApiManagement/service/write` or `delete`                  | API Management service resource                                                          |
| `azurerm_cosmosdb_account` | `Microsoft.DocumentDB/databaseAccounts/write` or `delete`            | Cosmos DB account resource                                                               |
| `azurerm_private_endpoint` | `Microsoft.Network/privateEndpoints/write` or `delete`               | Private endpoint resource                                                                |

Create and update operations require `write`; delete operations require
`delete`. Replacements evaluate both actions at the old and new scopes.

The evaluator reports:

- `pass`: an unconditional applicable role assignment grants the required
  management-plane action.
- `gap`: the supported requirement has no applicable grant.
- `inconclusive`: the checker cannot safely prove either result.

An inconclusive result is never treated as safe. Typical causes include an
unsupported Terraform resource, an unknown planned scope, a conditional role
assignment, a missing role definition, or an unavailable Azure read.

## Explicit limitations

- `azurerm_role_definition` is not evaluated.
- Resources outside this rule catalog are reported as inconclusive.
- Azure data-plane actions are collected but not evaluated.
- Role-assignment conditions and Azure deny assignments are not interpreted.
- The action does not recommend broad built-in roles or make automatic changes.

## Prerequisites

- Terraform must be installed and the saved plan must remain available on the
  runner.
- Azure CLI authentication must already be established, for example with
  `pagopa/dx/actions/csp-login`. The action uses `AzureCliCredential`.
- The CI identity needs read access to the Infra CD managed identity, role
  assignments at the queried scopes, and referenced role definitions.
- The Infra CD identity name and resource group must be supplied explicitly.

If any Azure SDK read fails, the action discards partial facts and reports all
supported requirements as inconclusive.

## Usage

```yaml
- name: Terraform Plan
  id: plan
  uses: pagopa/dx/actions/sanitize-terraform-plan@main
  with:
    base-path: infra/resources/dev
    plan-file: .terraform-permission-check.tfplan
    sensitive-keys: hidden-link,APPINSIGHTS_INSTRUMENTATIONKEY

- name: Check Infra CD Terraform permissions
  id: permission-check
  continue-on-error: true
  uses: pagopa/dx/actions/terraform-permission-check@main
  with:
    terraform-plan-path: infra/resources/dev/.terraform-permission-check.tfplan
    azure-subscription-id: ${{ secrets.ARM_SUBSCRIPTION_ID }}
    cd-identity-name: dx-d-itn-example-infra-github-cd-id-01
    cd-identity-resource-group-name: dx-d-itn-example-rg-01
    working-directory: infra/resources/dev
```

## Inputs

| Input                             | Description                                                             | Required | Default                         |
| --------------------------------- | ----------------------------------------------------------------------- | -------- | ------------------------------- |
| `terraform-plan-path`             | Path to the binary Terraform plan                                       | Yes      | -                               |
| `azure-subscription-id`           | Subscription containing the Infra CD managed identity                   | Yes      | -                               |
| `cd-identity-name`                | Infra CD user-assigned managed identity name                            | Yes      | -                               |
| `cd-identity-resource-group-name` | Resource group containing the managed identity                          | Yes      | -                               |
| `working-directory`               | Terraform directory used by `terraform show` and report labels          | No       | `.`                             |
| `output-file`                     | Markdown report path, relative to the working directory unless absolute | No       | `terraform-permission-check.md` |

## Outputs

| Output                 | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `markdown-report`      | Complete deterministic Markdown report              |
| `markdown-report-file` | Absolute path to the written report                 |
| `pass-count`           | Requirements confirmed as granted                   |
| `gap-count`            | Confirmed permission gaps                           |
| `inconclusive-count`   | Requirements or changes that could not be evaluated |

## DX ownership guidance

The report maps remediation to the established ownership boundary:

- `core` for Terraform state storage.
- `bootstrapper` for subscription and resource-group baseline permissions.
- `resources` for resource-local permissions.
- `bootstrapper / DX networking` for private-networking boundaries.
- `target subscription` for cross-subscription assignments.

Every finding includes the narrow required action and target scope. Consumers
should update the owning Terraform layer rather than grant a broader role.

## Development

```bash
pnpm nx test @pagopa-dx/terraform-permission-check
pnpm nx typecheck @pagopa-dx/terraform-permission-check
pnpm nx lint @pagopa-dx/terraform-permission-check
pnpm nx build @pagopa-dx/terraform-permission-check
```
