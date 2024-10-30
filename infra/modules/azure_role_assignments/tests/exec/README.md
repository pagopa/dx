# setup

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | <= 3.116.0 |
| <a name="requirement_local"></a> [local](#requirement\_local) | 2.5.2 |
| <a name="requirement_null"></a> [null](#requirement\_null) | 3.2.3 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [null_resource.get_role_assignments](https://registry.terraform.io/providers/hashicorp/null/3.2.3/docs/resources/resource) | resource |
| [local_file.role_assignments](https://registry.terraform.io/providers/hashicorp/local/2.5.2/docs/data-sources/file) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | n/a | `string` | n/a | yes |
| <a name="input_resource"></a> [resource](#input\_resource) | n/a | `string` | n/a | yes |
| <a name="input_type"></a> [type](#input\_type) | n/a | `string` | `"rbac"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_role_assignments"></a> [role\_assignments](#output\_role\_assignments) | n/a |
<!-- END_TF_DOCS -->
