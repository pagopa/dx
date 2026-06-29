# ai_foundry

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_cognitive_account.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cognitive_account) | resource |
| [azurerm_cognitive_account_project.terraform_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cognitive_account_project) | resource |
| [azurerm_cognitive_deployment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cognitive_deployment) | resource |
| [azurerm_role_assignment.foundry_storage_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.openai_user](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_storage_account.foundry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_ai_user_principal_ids"></a> [ai\_user\_principal\_ids](#input\_ai\_user\_principal\_ids) | Object IDs of identities (e.g. the AI gateway managed identity) granted the Cognitive Services OpenAI User role on the account. | `list(string)` | `[]` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values used to generate resource names and location short names. | <pre>object({<br/>    prefix          = string<br/>    environment     = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = optional(string)<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group in which to create the AI Foundry account. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(string)` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
