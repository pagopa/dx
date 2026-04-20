# DX - Azure Merge Roles

This module creates an Azure custom role definition by merging compatible built-in roles into a single assignable role.

It is designed for the RBAC reduction strategy described in the RFC: define a smaller set of reusable custom roles, then assign those roles to Entra ID groups instead of assigning many built-in roles directly to users, managed identities, or service principals.

## What This Module Does

- Preserves every source `permissions` block returned by each built-in role definition.
- Supports roles that include `not_actions` and `not_data_actions`.
- Deduplicates identical permission blocks so the generated role definition remains stable.
- Requires an explicit `scope` and defaults `assignable_scopes` to `[scope]`.
- Supports role definitions created at management group scope as well as subscription scope.

## Merge Strategy

Azure RBAC computes effective permissions per permission block as:

`Actions - NotActions`

and `NotActions` is not a deny rule across separate role assignments.

For that reason, this module does not collapse all source permissions into one flat block. Instead, it copies each source permission block into the custom role definition as a separate `permissions` block. This preserves the original semantics even when one source role excludes an action and another source role grants it explicitly.

## Provider Limitation

The current implementation preserves the permission model exposed by `azurerm_role_definition`, including `actions`, `not_actions`, `data_actions`, and `not_data_actions`.

The AzureRM provider does not expose role definition `condition` and `condition_version`, so conditional built-in roles cannot currently be reproduced bit-for-bit through this module. If that scenario becomes relevant, the module should move from `azurerm_role_definition` to an ARM-level implementation such as `azapi_resource` or a dedicated provider.

## Usage

```hcl
data "azurerm_subscription" "current" {}

module "observability_reader" {
  source = "pagopa-dx/azure-merge-modules/azurerm"

  scope      = data.azurerm_subscription.current.id
  role_name  = "dx-observability-reader"
  source_roles = [
    "Reader",
    "Monitoring Reader",
  ]

  description = "Custom role for observability read access"
}

resource "azurerm_role_assignment" "observability_reader" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = module.observability_reader.custom_role_name
  principal_id         = var.principal_id
  principal_type       = var.principal_type
}
```

The `scope` input can also point to a management group, for example:

```hcl
scope = "/providers/Microsoft.Management/managementGroups/dx-platform"
```

## Assigning The Generated Role

When you want to assign the custom role in the same Terraform apply, using
`module.<name>.custom_role_name` is enough. The reference creates an implicit
dependency, so Terraform will create the role definition before it creates the
role assignment.

If you prefer a stricter reference, `role_definition_id = module.<name>.custom_role_id`
also works.

If the role definition is created at management group scope, the role can still
be assigned at supported descendant scopes through `assignable_scopes`. The
module validates management group inputs conservatively because Terraform cannot
infer management group membership from a subscription ARM ID alone.

When the assignee principal is new, always set `principal_type` on
`azurerm_role_assignment`. Microsoft documents that this reduces intermittent
replication errors for newly created users, groups, service principals, and
managed identities.

## Propagation And Sleep

I would not add a `time_sleep` to this module by default.

- Creating the role definition and then the role assignment in the same plan does not need an artificial wait if the assignment references the module output.
- Azure RBAC changes can still be eventually consistent after the assignment is created. Microsoft documents that role assignment changes can take up to about 10 minutes to become effective.
- That delay matters for follow-up operations that immediately try to use the granted permissions, especially data-plane operations.
- If a caller creates a role assignment and then immediately performs privileged operations with the assigned principal in the same apply, any wait should be added in the caller, not inside this module.

## Examples

- See [examples/subscription_scope](./examples/subscription_scope) for a complete local example.

## Notes

- This module only creates the custom role definition.
- It does not create Entra ID groups.
- It does not create role assignments.

## Requirements

| Name | Version |
|------|---------|
| azurerm | >= 3.114, < 5.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| scope | ARM scope where the custom role definition is created. Use a management group, subscription, resource group, or resource scope ID. | string | n/a | yes |
| role_name | Name of the custom role definition to create. | string | n/a | yes |
| source_roles | List of built-in Azure role names to merge into a custom role definition. | list(string) | n/a | yes |
| assignable_scopes | Optional list of scopes where the custom role can be assigned. Defaults to `[scope]`. | list(string) | `null` | no |
| description | Optional custom description for the merged role definition. Defaults to a generated description based on `source_roles`. | string | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| custom_role_id | ID of the newly created custom role definition |
| custom_role_name | Name of the newly created custom role definition |