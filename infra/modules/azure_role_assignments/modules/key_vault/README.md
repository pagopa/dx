# key_vault

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
| [azurerm_key_vault_access_policy.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_role_assignment.certificates](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.keys](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.secrets](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | A list of key vault role assignments. The description is set only for rbac supported key vaults. | <pre>list(object({<br/>    name                = string<br/>    resource_group_name = string<br/>    has_rbac_support    = optional(bool, true)<br/>    description         = string<br/>    roles = object({<br/>      secrets      = optional(string, "")<br/>      certificates = optional(string, "")<br/>      keys         = optional(string, "")<br/>    })<br/><br/>    override_roles = optional(object({<br/>      secrets      = optional(list(string), [])<br/>      certificates = optional(list(string), [])<br/>      keys         = optional(list(string), [])<br/>      }), {<br/>      secrets      = []<br/>      certificates = []<br/>      keys         = []<br/>    })<br/>  }))</pre> | `[]` | no |
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal to which assign roles. It can be a managed identity. | `string` | n/a | yes |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | The ID of the subscription where the target resources are located | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_access_policy"></a> [access\_policy](#output\_access\_policy) | n/a |
| <a name="output_certificates_role_assignment"></a> [certificates\_role\_assignment](#output\_certificates\_role\_assignment) | n/a |
| <a name="output_keys_role_assignment"></a> [keys\_role\_assignment](#output\_keys\_role\_assignment) | n/a |
| <a name="output_secrets_role_assignment"></a> [secrets\_role\_assignment](#output\_secrets\_role\_assignment) | n/a |
<!-- END_TF_DOCS -->
