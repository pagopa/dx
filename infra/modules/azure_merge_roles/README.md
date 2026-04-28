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
- Requires an explicit `scope` and always uses that same scope as the role's only assignable scope.
- Supports role definitions created at management group scope as well as subscription scope.

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

  scope      = data.azurerm_subscription.current.id
  role_name  = "dx-observability-reader"
  source_roles = [
    "Reader",
    "Monitoring Reader",
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
