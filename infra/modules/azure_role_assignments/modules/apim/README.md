# apim

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
| [azurerm_role_assignment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_apim"></a> [apim](#input\_apim) | A list of APIM role assignments | <pre>list(object({<br/>    id          = string<br/>    role        = string<br/>    description = string<br/>  }))</pre> | `[]` | no |
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal to which assign roles. It can be a managed identity. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_azurerm_role_assignment"></a> [azurerm\_role\_assignment](#output\_azurerm\_role\_assignment) | n/a |
<!-- END_TF_DOCS -->
