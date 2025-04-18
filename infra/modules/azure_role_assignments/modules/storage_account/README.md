# storage_account

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.114, < 5.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_role_assignment.blob](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.queue](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.table](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal to which assign roles. It can be a managed identity. | `string` | n/a | yes |
| <a name="input_storage_blob"></a> [storage\_blob](#input\_storage\_blob) | A list of storage blob role assignments | <pre>list(object({<br/>    storage_account_name = string<br/>    resource_group_name  = string<br/>    container_name       = optional(string, "*")<br/>    role                 = string<br/>    description          = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_queue"></a> [storage\_queue](#input\_storage\_queue) | A list of storage queue role assignments | <pre>list(object({<br/>    storage_account_name = string<br/>    resource_group_name  = string<br/>    queue_name           = optional(string, "*")<br/>    role                 = string<br/>    description          = string<br/>  }))</pre> | `[]` | no |
| <a name="input_storage_table"></a> [storage\_table](#input\_storage\_table) | A list of storage table role assignments | <pre>list(object({<br/>    storage_account_name = string<br/>    resource_group_name  = string<br/>    table_name           = optional(string, "*")<br/>    role                 = string<br/>    description          = string<br/>  }))</pre> | `[]` | no |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | The ID of the subscription where the target resources are located | `string` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
