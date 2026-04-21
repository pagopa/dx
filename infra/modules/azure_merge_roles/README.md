# DX - Azure Merge Roles

This module creates an Azure custom role definition by merging compatible Azure roles into a single assignable role.

It is designed for the RBAC reduction strategy: define a smaller set of reusable custom roles, then assign those roles to Entra ID groups instead of assigning many built-in roles directly to users, managed identities, or service principals.

## What This Module Does

- Resolves built-in or custom source roles at `scope` and compacts them into the single permissions object Azure custom roles accept.
- Supports roles that include `not_actions` and `not_data_actions`.
- Deduplicates merged permissions so the generated role definition remains stable.
- Requires an explicit `scope` and defaults `assignable_scopes` to `[scope]`.
- Supports role definitions created at management group scope as well as subscription scope.

## Merge Strategy

Azure RBAC computes effective permissions per role assignment as:

`Actions - NotActions`

and `NotActions` is not a deny rule across separate role assignments.

Azure custom roles, however, are created with a single permissions object made of `actions`, `not_actions`, `data_actions`, and `not_data_actions` arrays. For that reason, this module computes one merged permission set instead of copying the original source blocks verbatim.

When one source role excludes an action and another source role grants an overlapping or ambiguously overlapping action, the module drops that exclusion from the merged custom role. This applies to exact matches, broader wildcard grants, narrower subset grants under a wildcard exclusion, and partial wildcard overlaps that share a common static prefix.

The module intentionally prefers a permissive merged role over an under-permissive one when Azure's single-block custom role model cannot represent a partial override exactly. In practice, if a source role excludes a broad wildcard and another role re-grants only a narrower subset of that wildcard, or even only an ambiguously overlapping wildcard branch, the merged role drops the broader exclusion. The same permissive rule applies even if the overlapping grant block also contains its own narrower exclusions. This can over-grant compared with the original set of source assignments, but it avoids permission regressions when the merged role replaces those assignments.

When multiple exclusions overlap the same re-granted action, the current policy drops all of those overlapping exclusions rather than trying to preserve only the most specific one.

## Provider Limitation

The current implementation preserves the permission fields exposed by `azurerm_role_definition`, including `actions`, `not_actions`, `data_actions`, and `not_data_actions`, but it must compact them into one effective permissions object because Azure rejects custom roles with multiple permission objects.

Source roles are resolved at the same `scope` used to create the merged role definition. This allows the module to merge built-in roles together with custom roles already defined at that scope.

The AzureRM provider does not expose role definition `condition` and `condition_version`, so conditional built-in roles cannot currently be reproduced bit-for-bit through this module. If that scenario becomes relevant, the module should move from `azurerm_role_definition` to an ARM-level implementation such as `azapi_resource` or a dedicated provider.

## Usage

```hcl
data "azurerm_subscription" "current" {}

module "observability_reader" {
  source = "pagopa-dx/azure-merge-roles/azurerm"

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

## Examples

- See [examples/subscription_scope](./examples/subscription_scope) for a simple subscription-scoped example.
- See [examples/blob_rbac_validation](./examples/blob_rbac_validation) for an end-to-end validation scenario with Blob data permissions and managed identities.

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
| source_roles | List of Azure role names to merge into a custom role definition. Roles can be built-in or custom, as long as they are resolvable at `scope`. | list(string) | n/a | yes |
| assignable_scopes | Optional list of scopes where the custom role can be assigned. Defaults to `[scope]`. | list(string) | `null` | no |
| description | Optional custom description for the merged role definition. Defaults to a generated description based on `source_roles`. | string | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| custom_role_id | ID of the newly created custom role definition |
| custom_role_name | Display name of the newly created custom role definition |
