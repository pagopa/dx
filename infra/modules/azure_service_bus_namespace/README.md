# DX - Azure Service Bus Namespace

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-service-bus-namespace/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-service-bus-namespace%2Fazurerm%2Flatest)

This Terraform module deploys an Azure Service Bus namespace. Currently it supports `Premium` SKUs only.

## Features

- **Service Bus Namespace Deployment**: Deploys a Service Bus Namespace in the specified resource group.
- **Secure Authentication**: Supports authentication via Entra ID
- **Private Endpoint Integration**: (`Premium` SKU only) Creates a private DNS A record for the container app, enabling secure internal communication.

## Use cases and Configurations

| Use case | Description                                                  | Security                          |
| -------- | ------------------------------------------------------------ | --------------------------------- |
| default  | High-load production environments and all features available | Access via Private Endpoints only |

## Best Practices

Patterns and advices on how use Service Bus can be found in [DX documentation](https://dx.pagopa.it/docs/infrastructure/azure/using-service-bus).

## Usage Example

A [complete example](https://github.com/pagopa-dx/terraform-azurerm-azure-services-bus-namespace/tree/main/examples/complete) demonstrates all features.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.111.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.3 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_autoscale_setting.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting) | resource |
| [azurerm_private_endpoint.service_bus_pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_servicebus_namespace.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/servicebus_namespace) | resource |
| [azurerm_private_dns_zone.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_allowed_ips"></a> [allowed\_ips](#input\_allowed\_ips) | A list of IP addresses or CIDR blocks to allow access to the Service Bus Namespace. Use only if "use\_case" is not "default". | `list(string)` | `null` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | The name of the resource group containing the private DNS zone for private endpoints. | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | The ID of the subnet designated for private endpoints. Use only if private endpoints are enabled. | `string` | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | Specifies the use case for the Service Bus. Allowed value is 'default'. | `string` | `"default"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | The ID of the Service Bus namespace. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Service Bus namespace. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the Azure Resource Group where the Service Bus namespace is deployed. |
<!-- END_TF_DOCS -->
