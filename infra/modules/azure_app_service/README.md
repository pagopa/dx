# DX - Azure App Service Module

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-app-service/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-app-service%2Fazurerm%2Flatest)

This module deploys an AppService with a strong opinionated configuration in terms of networking and deployment strategy. This module is ideal when you need your AppService to remain inaccessible from the public internet.

## Features

- **AppService**: An AppService instance running Java or TypeScript code
- **AppService Slot**: A slot named `Staging` to test code before switching to production
- **App Service Plan**: A Linux-based Plan
- **Private Endpoint**: To allow only private incoming connections
- **Subnet**: To allow outbound connections in a VNet

## Tiers and Configuration

| Tier | Description                      | SLA    | Staging Slot | Autoscaling | Multi AZ |
| ---- | -------------------------------- | ------ | ------------ | ----------- | -------- |
| s    | Non-production tier              | 99.95% | No           | Max 3       | No       |
| m    | Standard production tier         | 99.95% | Yes          | Max 30      | Yes      |
| l    | Above average production tier    | 99.95% | Yes          | Max 30      | Yes      |
| xl   | High-performance production tier | 99.95% | Yes          | Max 30      | Yex      |

## Usage Example

For a complete example of how to use this module, refer to the [examples/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-app-service/tree/main/examples/complete) folder in the module repository.

## Testing

This module includes a comprehensive test suite following HashiCorp's testing framework guidelines. The tests are organized using the testing pyramid approach:

- **Unit tests** - Fast, isolated tests of individual components
- **Integration tests** - Tests that verify how components work together  
- **Validation tests** - Tests that verify input validation and error conditions

To run the tests, see the [tests/README.md](./tests/README.md) for detailed instructions.

```bash
# Run all tests
terraform test

# Run specific test categories
terraform test -filter=unit-*
terraform test -filter=integration-*
terraform test -filter=validation-*
```

## Testing Coverage

The test suite covers:
- All tier configurations (s, m, l, xl) and legacy mappings
- Technology stacks (Node.js, Java) with version management
- Networking scenarios (subnets, service endpoints, private endpoints)
- Security configurations (TLS, HTTPS, network access)
- Application settings and Application Insights integration
- Staging slot creation and configuration
- Input validation and error conditions
- Module outputs verification

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.8.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_linux_web_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app) | resource |
| [azurerm_linux_web_app_slot.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app_slot) | resource |
| [azurerm_private_endpoint.app_service_sites](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.staging_app_service_sites](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_service_plan.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan) | resource |
| [azurerm_subnet.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_private_dns_zone.app_service](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_virtual_network.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_app_service_plan_id"></a> [app\_service\_plan\_id](#input\_app\_service\_plan\_id) | ID of the AppService plan where the application will be hosted. | `string` | `null` | no |
| <a name="input_app_settings"></a> [app\_settings](#input\_app\_settings) | Application settings as a map of key-value pairs. | `map(string)` | n/a | yes |
| <a name="input_application_insights_connection_string"></a> [application\_insights\_connection\_string](#input\_application\_insights\_connection\_string) | Application Insights connection string. | `string` | `null` | no |
| <a name="input_application_insights_sampling_percentage"></a> [application\_insights\_sampling\_percentage](#input\_application\_insights\_sampling\_percentage) | Sampling percentage for Application Insights. Default is 5. | `number` | `5` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_health_check_path"></a> [health\_check\_path](#input\_health\_check\_path) | Path of the endpoint where health probe is exposed. | `string` | n/a | yes |
| <a name="input_java_version"></a> [java\_version](#input\_java\_version) | Java version to use. | `string` | `17` | no |
| <a name="input_node_version"></a> [node\_version](#input\_node\_version) | Node.js version to use. | `number` | `20` | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Name of the resource group containing the private DNS zone for private endpoints. Default is the resource group of the virtual network. | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_slot_app_settings"></a> [slot\_app\_settings](#input\_slot\_app\_settings) | Application settings for the staging slot. | `map(string)` | `{}` | no |
| <a name="input_stack"></a> [stack](#input\_stack) | Technology stack to use. Allowed values: 'node', 'java'. | `string` | `"node"` | no |
| <a name="input_sticky_app_setting_names"></a> [sticky\_app\_setting\_names](#input\_sticky\_app\_setting\_names) | List of application setting names that are not swapped between slots. | `list(string)` | `[]` | no |
| <a name="input_subnet_cidr"></a> [subnet\_cidr](#input\_subnet\_cidr) | CIDR block for the subnet used by the AppService for outbound connectivity. Mandatory if 'subnet\_id' is not set. | `string` | `null` | no |
| <a name="input_subnet_id"></a> [subnet\_id](#input\_subnet\_id) | ID of the subnet where the application will be hosted. | `string` | `null` | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | ID of the subnet hosting private endpoints. | `string` | n/a | yes |
| <a name="input_subnet_service_endpoints"></a> [subnet\_service\_endpoints](#input\_subnet\_service\_endpoints) | Enable service endpoints for the underlying subnet. Should only be set if dependencies do not use private endpoints. | <pre>object({<br/>    cosmos  = optional(bool, false)<br/>    storage = optional(bool, false)<br/>    web     = optional(bool, false)<br/>  })</pre> | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Map of tags to apply to all created resources. | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tier based on workload. Allowed values: 's', 'm', 'l', 'xl'. Legacy values: 'premium', 'standard', 'test'. | `string` | `"l"` | no |
| <a name="input_tls_version"></a> [tls\_version](#input\_tls\_version) | Minimum TLS version for the App Service. | `number` | `1.2` | no |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Virtual network where the subnet will be created. | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_app_service"></a> [app\_service](#output\_app\_service) | Details of the App Service, including its resource group, plan, and slot information. |
| <a name="output_subnet"></a> [subnet](#output\_subnet) | Details of the subnet used, including its ID and name. |
<!-- END_TF_DOCS -->
