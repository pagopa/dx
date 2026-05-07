# DX - Azure Merge Roles

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-merge-roles/azurerm?label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-merge-roles%2Fazurerm%2Flatest&logo=terraform)

This module creates an Azure custom role definition by merging two or more compatible Azure roles into a single assignable role.

It is designed for the RBAC reduction strategy: define a smaller set of reusable custom roles, then assign those roles to Entra ID groups instead of assigning many built-in roles directly to users, managed identities, or service principals.

## What This Module Does

- Resolves built-in or custom source roles at `scope` and compacts them into the single permissions object Azure custom roles accept.
- Requires at least two source roles, so callers do not create a custom role that is equivalent to assigning one existing role directly.
- Requires a caller-provided `reason` so generated custom roles keep explicit business context instead of a bare auto-generated description.
- Supports roles that include `not_actions` and `not_data_actions`.
- Deduplicates merged permissions so the generated role definition remains stable.
- Supports caller-provided `additional_actions` when the merged role must grant extra control-plane permissions beyond the merged source roles.
- Supports caller-provided `additional_data_actions` when the merged role must grant extra data-plane permissions beyond the merged source roles.
- Requires an explicit `scope` and always uses that same scope as the role's only assignable scope.
- Supports role definitions created at management group scope as well as subscription scope.

## Choosing Additional Permissions

Most callers should start with `source_roles` only and leave both `additional_*` inputs empty.

Use `additional_actions` only when the merged role still misses Azure management-plane operations, such as reading or writing role assignments, locks, or resource settings.

Use `additional_data_actions` only when the merged role still misses permissions on the resource contents themselves, such as reading, writing, or deleting blob data.

In this module, `additional` means permissions that are not already granted by the selected `source_roles`, but that you still want in the final merged custom role.

## Merge Strategy

Azure RBAC computes effective permissions per role assignment as:

`Actions - NotActions` and `NotActions` is not a deny rule across separate role assignments.

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

  scope       = data.azurerm_subscription.current.id
  role_name   = "dx-observability-reader"
  source_roles = [
    "Reader",
    "Monitoring Reader",
  ]
  additional_actions = [
    "Microsoft.Authorization/roleAssignments/read",
  ]
  additional_data_actions = [
    "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read",
  ]

  reason = "Grant observability read access without repeating multiple role assignments"
}

resource "azurerm_role_assignment" "observability_reader" {
  scope              = data.azurerm_subscription.current.id
  role_definition_id = module.observability_reader.custom_role_id
  principal_id       = var.principal_id
  principal_type     = var.principal_type
}
```

The `scope` input can also point to a management group, for example:

```hcl
scope = "/providers/Microsoft.Management/managementGroups/dx-platform"
```

Use `additional_actions` only for extra control-plane grants that are not already included in `source_roles`. The module deduplicates them against the merged source actions and applies the same permissive overlap policy used for `not_actions`.

Use `additional_data_actions` only for extra data-plane grants that are not already included in `source_roles`. The module deduplicates them against the merged source data actions and applies the same permissive overlap policy used for `not_data_actions`.

Both inputs accept only Azure RBAC action characters: letters, digits, `/`, `.`, and `*`.

## Assigning The Generated Role

When you want to assign the custom role in the same Terraform apply, prefer
`role_definition_id = module.<name>.custom_role_id`. The reference creates an
implicit dependency, so Terraform will create the role definition before it
creates the role assignment.

The module always sets `assignable_scopes = [scope]`. With a subscription scope,
the resulting custom role stays assignable within that subscription hierarchy.
With a management group scope, it stays assignable within that management group
hierarchy.

## Examples

- See [examples/subscription_scope](./examples/subscription_scope) for a simple subscription-scoped example.
- See [examples/blob_rbac_validation](./examples/blob_rbac_validation) for an end-to-end validation scenario with Blob data permissions and managed identities.

## Notes

- This module only creates the custom role definition.
- It does not create Entra ID groups.
- It does not create role assignments.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_role_definition.merged](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_definition) | resource |
| [azurerm_role_definition.source](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/role_definition) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_additional_actions"></a> [additional\_actions](#input\_additional\_actions) | Optional list of extra control-plane actions to add when the merged source roles still miss specific management-plane permissions. | `list(string)` | `[]` | no |
| <a name="input_additional_data_actions"></a> [additional\_data\_actions](#input\_additional\_data\_actions) | Optional list of extra data-plane actions to add when the merged source roles still miss specific permissions on resource contents. | `list(string)` | `[]` | no |
| <a name="input_reason"></a> [reason](#input\_reason) | Short explanation of why this merged role exists. Used to build the custom role description together with the merged source role names. | `string` | n/a | yes |
| <a name="input_role_name"></a> [role\_name](#input\_role\_name) | Name of the custom role definition to create. | `string` | n/a | yes |
| <a name="input_scope"></a> [scope](#input\_scope) | ARM scope where the custom role definition is created. Use a management group, subscription, resource group, or resource scope ID. | `string` | n/a | yes |
| <a name="input_source_roles"></a> [source\_roles](#input\_source\_roles) | List of at least two Azure role names to merge into a custom role definition. Roles can be built-in or custom, as long as they are resolvable at scope. | `list(string)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_custom_role_id"></a> [custom\_role\_id](#output\_custom\_role\_id) | ID of the newly created custom role definition |
| <a name="output_custom_role_name"></a> [custom\_role\_name](#output\_custom\_role\_name) | Display name of the newly created custom role definition |
<!-- END_TF_DOCS -->
