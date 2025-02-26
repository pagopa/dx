# cosmos

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_cosmosdb_sql_role_assignment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_cosmosdb_account.cosmos](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/cosmosdb_account) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_cosmos"></a> [cosmos](#input\_cosmos) | A list of CosmosDB role assignments | <pre>list(object({<br/>    account_name        = string<br/>    account_id          = optional(string, null)<br/>    resource_group_name = string<br/>    role                = string<br/>    database            = optional(string, "*")<br/>    collections         = optional(list(string), ["*"])<br/>  }))</pre> | `[]` | no |
| <a name="input_principal_id"></a> [principal\_id](#input\_principal\_id) | The ID of the principal to which assign roles. It can be a managed identity. | `string` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
