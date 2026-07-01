# ai_gateway

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azuredx"></a> [azuredx](#requirement\_azuredx) | ~> 0.8 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.23 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_apim"></a> [apim](#module\_apim) | pagopa-dx/azure-api-management/azurerm | ~> 2.1 |

## Resources

| Name | Type |
|------|------|
| [azuredx_dx_available_subnet_cidr.apim](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/dx_available_subnet_cidr) | resource |
| [azurerm_api_management_api.foundry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api) | resource |
| [azurerm_api_management_api_operation.responses](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation) | resource |
| [azurerm_api_management_api_operation_tag.responses](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_tag) | resource |
| [azurerm_api_management_api_policy.foundry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_policy) | resource |
| [azurerm_api_management_api_version_set.foundry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_version_set) | resource |
| [azurerm_api_management_backend.foundry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_backend) | resource |
| [azurerm_role_assignment.apim_foundry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_subnet.apim](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_application_insights"></a> [application\_insights](#input\_application\_insights) | The core Application Insights instance used by API Management for request diagnostics. | <pre>object({<br/>    id                = string<br/>    connection_string = string<br/>  })</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values used to generate resource names and location short names. | <pre>object({<br/>    prefix          = string<br/>    environment     = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = optional(string)<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_foundry"></a> [foundry](#input\_foundry) | The AI Foundry project the gateway proxies to: project ID (for RBAC), project endpoint, and the model deployment name. | <pre>object({<br/>    project_id            = string<br/>    project_endpoint      = string<br/>    model_deployment_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group in which to create the API Management gateway. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(string)` | n/a | yes |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | The common virtual network hosting the gateway. The APIM subnet is created here and the gateway is reachable only from within this network. | <pre>object({<br/>    id                  = string<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
