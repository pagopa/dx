# managed_redis

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
| ---- | ------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.23 |

## Modules

No modules.

## Resources

| Name | Type |
| ---- | ---- |
| [azurerm_managed_redis_access_policy_assignment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/managed_redis_access_policy_assignment) | resource |

## Inputs

| Name | Description | Type | Default | Required |
| ---- | ----------- | ---- | ------- | :------: |
| <a name="input_managed_redis"></a> [managed\_redis](#input\_managed\_redis) | List of Azure Managed Redis (AMR) instance resource IDs to grant data-plane access to.<br/><br/>Each entry is a full Azure resource ID, e.g.:<br/>  /subscriptions/{subId}/resourceGroups/{rgName}/providers/Microsoft.Cache/redisEnterprise/{name}<br/><br/>AMR assigns the built-in "default" access policy (full data-plane access).<br/>There are no role choices; access is binary (granted or not). | `list(string)` | `[]` | no |
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal to which assign roles. It can be a managed identity. | `string` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
