# managed_redis

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.60 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_managed_redis_access_policy_assignment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/managed_redis_access_policy_assignment) | resource |
| [azurerm_role_assignment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_managed_redis"></a> [managed\_redis](#input\_managed\_redis) | List of Azure Managed Redis (AMR) role assignments.<br/><br/>Each entry contains:<br/>- id:          Full Azure resource ID of the AMR instance<br/>- role:        One of "reader", "writer", or "owner"<br/>- description: Human-readable description of the role assignment purpose<br/><br/>Role mapping:<br/>- reader → Azure Managed Redis Reader (control-plane read-only)<br/>- writer → data-plane "default" access policy (Redis commands)<br/>- owner  → Azure Managed Redis Contributor (control-plane) + data-plane "default" access policy | <pre>list(object({<br/>    id          = string<br/>    role        = string<br/>    description = string<br/>  }))</pre> | `[]` | no |
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal to which assign roles. It can be a managed identity. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_azurerm_managed_redis_access_policy_assignment"></a> [azurerm\_managed\_redis\_access\_policy\_assignment](#output\_azurerm\_managed\_redis\_access\_policy\_assignment) | n/a |
| <a name="output_azurerm_role_assignment"></a> [azurerm\_role\_assignment](#output\_azurerm\_role\_assignment) | n/a |
<!-- END_TF_DOCS -->
