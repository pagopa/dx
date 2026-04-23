# managed_redis

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
| ---- | ------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.23, < 5.0 |

## Providers

| Name | Version |
| ---- | ------- |
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | >= 4.23, < 5.0 |

## Modules

No modules.

## Resources

| Name | Type |
| ---- | ---- |
| [azurerm_managed_redis_access_policy_assignment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/managed_redis_access_policy_assignment) | resource |

## Inputs

| Name | Description | Type | Default | Required |
| ---- | ----------- | ---- | ------- | :------: |
| <a name="input_managed_redis"></a> [managed\_redis](#input\_managed\_redis) | List of data-plane access policy assignments for Azure Managed Redis (AMR) instances.<br/><br/>REQUIRED FIELDS:<br/>- name: Name of the Azure Managed Redis instance<br/>- resource\_group\_name: Resource group containing the instance<br/>- role: Permission level - MUST be one of: "writer", "owner". Both roles are mapped<br/>  to the built-in "default" access policy (full data-plane access). The "reader"<br/>  role is intentionally not supported because AMR has no built-in read-only<br/>  policy; read-only access requires a custom access policy declared on the AMR<br/>  database and will be addressed in a separate change.<br/>- description: Human-readable description of the role assignment purpose. | <pre>list(object({<br/>    name                = string<br/>    resource_group_name = string<br/>    role                = string<br/>    description         = string<br/>  }))</pre> | `[]` | no |
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal to which assign roles. It can be a managed identity. | `string` | n/a | yes |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | The ID of the subscription where the target Azure Managed Redis instances are located. | `string` | n/a | yes |

## Outputs

| Name | Description |
| ---- | ----------- |
| <a name="output_azurerm_managed_redis_access_policy_assignment"></a> [azurerm\_managed\_redis\_access\_policy\_assignment](#output\_azurerm\_managed\_redis\_access\_policy\_assignment) | Access policy assignments created for Azure Managed Redis instances, keyed by "{name}\|{resource\_group\_name}". |
<!-- END_TF_DOCS -->
