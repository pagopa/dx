# DX - Azure App Service Module

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-app-service/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-app-service%2Fazurerm%2Flatest)

This module deploys an AppService with a strong opinionated configuration in terms of networking and deployment strategy. This module is ideal when you need your AppService to remain inaccessible from the public internet.

## Features

- **AppService**: An AppService instance running Java or TypeScript code, or a container image
- **AppService Slot**: A slot named `Staging` to test code before switching to production
- **App Service Plan**: A Linux-based Plan
- **Private Endpoint**: To allow only private incoming connections
- **Subnet**: To allow outbound connections in a VNet

## Use cases Comparison

| Use case  | Description                      | SLA    | Staging Slot | Autoscaling | Multi AZ |
| --------- | -------------------------------- | ------ | ------------ | ----------- | -------- |
| default   | Above average production tier    | 99.95% | Yes          | Max 30      | Yes      |
| high_load | High-performance production tier | 99.95% | Yes          | Max 30      | Yes      |

### Allowed Sizes

The SKU name is determined by the use case, but if you want to override it, you can set the `size` variable.
The allowed sizes are:

- P0v3
- P1v3
- P2v3

## Usage Example

For a complete example of how to use this module, refer to the [examples/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-app-service/tree/main/examples/complete) folder in the module repository.

## Diagram

![diagram](https://raw.githubusercontent.com/pagopa/dx/main/infra/modules/azure_app_service/diagram.svg)

## Container Images

Set `container_image` to run the App Service and its staging slot from a container image instead of a deployment package:

```hcl
module "app_service" {
  source  = "pagopa-dx/azure-app-service/azurerm"
  version = "~> 5.1"

  # ...
  container_image          = "myacr.azurecr.io/my-app:1.0.0"
}
```

- The image must include a tag. Images without a registry are pulled from Docker Hub.
- When a container image is used, `stack`, `node_version` and `java_version` are ignored and `WEBSITE_RUN_FROM_PACKAGE` is not set.
- After creation, the image is not managed by Terraform; CD pipelines are expected to update it.
- When the registry hostname in `container_image` ends in `.azurecr.io`, the App Service and staging slot automatically use their system-assigned managed identities to pull the image. Custom registry domains are not inferred. The module does not assign permissions on the registry, so grant the `AcrPull` role to both identities:

  ```hcl
  resource "azurerm_role_assignment" "app_service_acr_pull" {
    scope                = var.acr_id
    role_definition_name = "AcrPull"
    principal_id         = module.app_service.app_service.app_service.principal_id
  }

  resource "azurerm_role_assignment" "app_service_slot_acr_pull" {
    scope                = var.acr_id
    role_definition_name = "AcrPull"
    principal_id         = module.app_service.app_service.app_service.slot.principal_id
  }
  ```

  `var.acr_id` is the Azure Container Registry resource ID.

### Migrating from ZIP deployment

An App Service configured for ZIP deployment cannot be converted in place to run a container image. The module intentionally ignores Docker image changes after creation so CD pipelines can own subsequent image updates. Create a separate App Service with a unique `environment.instance_number`, migrate to it, and retire the ZIP-based app after cutover.

1. Confirm the tagged image is available and choose an `instance_number` that produces a unique App Service name.
2. Add a second module instance using the same application configuration, a different `environment.instance_number`, and `container_image`. For standard ACR login server hostnames ending in `.azurecr.io`, managed identity pulls are enabled automatically. Grant `AcrPull` to the new App Service and staging slot identities before expecting private image pulls to succeed.
3. Create and validate the container-based App Service and its staging slot while the existing ZIP-based app remains available. Migrate required application settings, data, integrations, DNS or routing, and any other dependencies; test the new app before directing traffic to it.
4. Cut over traffic to the new App Service. Once the cutover is verified and rollback is no longer needed, remove the old ZIP-based module instance and review the Terraform plan before applying its deletion.

Keep `container_image` configured on the new module instance as the bootstrap image. Docker changes remain ignored by Terraform, so CD pipelines retain ownership of subsequent production and staging image updates.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
| ---- | ------- |
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.15.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.58 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.12 |

## Modules

No modules.

## Resources

| Name | Type |
| ---- | ---- |
| [azurerm_linux_web_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app) | resource |
| [azurerm_linux_web_app_slot.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app_slot) | resource |
| [azurerm_monitor_diagnostic_setting.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_private_endpoint.app_service_sites](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.staging_app_service_sites](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_service_plan.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan) | resource |
| [azurerm_subnet.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_private_dns_zone.app_service](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_virtual_network.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

| Name | Description | Type | Default | Required |
| ---- | ----------- | ---- | ------- | :------: |
| <a name="input_app_service_plan_id"></a> [app\_service\_plan\_id](#input\_app\_service\_plan\_id) | ID of the AppService plan where the application will be hosted. | `string` | `null` | no |
| <a name="input_app_settings"></a> [app\_settings](#input\_app\_settings) | Application settings as a map of key-value pairs. | `map(string)` | n/a | yes |
| <a name="input_application_insights_connection_string"></a> [application\_insights\_connection\_string](#input\_application\_insights\_connection\_string) | Application Insights connection string. | `string` | `null` | no |
| <a name="input_application_insights_sampling_percentage"></a> [application\_insights\_sampling\_percentage](#input\_application\_insights\_sampling\_percentage) | Sampling percentage for Application Insights. Default is 5. | `number` | `5` | no |
| <a name="input_container_image"></a> [container\_image](#input\_container\_image) | Container image used to run the App Service and its staging slot instead of a deployment package (e.g. "myacr.azurecr.io/my-app:1.0.0").<br/>When set, "stack", "node\_version" and "java\_version" are ignored and WEBSITE\_RUN\_FROM\_PACKAGE is not configured.<br/>Images without a registry are pulled from Docker Hub. The image must specify a tag.<br/>The image is not managed by Terraform after creation, but instead updated by CD pipelines. | `string` | `null` | no |
| <a name="input_diagnostic_settings"></a> [diagnostic\_settings](#input\_diagnostic\_settings) | Define if diagnostic settings should be enabled.<br/>If enabled, specifies the ID of a Log Analytics Workspace where Diagnostics Data should be sent and<br/>optionally the ID of the Storage Account where logs should be sent. | <pre>object({<br/>    enabled                                   = bool<br/>    log_analytics_workspace_id                = optional(string)<br/>    diagnostic_setting_destination_storage_id = optional(string)<br/>  })</pre> | <pre>{<br/>  "diagnostic_setting_destination_storage_id": null,<br/>  "enabled": false,<br/>  "log_analytics_workspace_id": null<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_health_check_path"></a> [health\_check\_path](#input\_health\_check\_path) | Path of the endpoint where health probe is exposed. | `string` | n/a | yes |
| <a name="input_java_version"></a> [java\_version](#input\_java\_version) | Java version to use. | `string` | `17` | no |
| <a name="input_node_version"></a> [node\_version](#input\_node\_version) | Node.js version to use. Supported versions: 22, 24. | `number` | `22` | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Name of the resource group containing the private DNS zone for private endpoints. Default is the resource group of the virtual network. | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_size"></a> [size](#input\_size) | App Service Plan size. Allowed values: 'P0v3', 'P1v3', 'P2v3'. If not set, it will be determined by the use\_case. | `string` | `null` | no |
| <a name="input_slot_app_settings"></a> [slot\_app\_settings](#input\_slot\_app\_settings) | Application settings for the staging slot. | `map(string)` | `{}` | no |
| <a name="input_stack"></a> [stack](#input\_stack) | Technology stack to use. Allowed values: 'node', 'java'. | `string` | `"node"` | no |
| <a name="input_sticky_app_setting_names"></a> [sticky\_app\_setting\_names](#input\_sticky\_app\_setting\_names) | List of application setting names that are not swapped between slots. | `list(string)` | `[]` | no |
| <a name="input_subnet_cidr"></a> [subnet\_cidr](#input\_subnet\_cidr) | CIDR block for the subnet used by the AppService for outbound connectivity. Mandatory if 'subnet\_id' is not set. | `string` | `null` | no |
| <a name="input_subnet_id"></a> [subnet\_id](#input\_subnet\_id) | ID of the subnet where the application will be hosted. | `string` | `null` | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | ID of the subnet hosting private endpoints. | `string` | n/a | yes |
| <a name="input_subnet_service_endpoints"></a> [subnet\_service\_endpoints](#input\_subnet\_service\_endpoints) | Enable service endpoints for the underlying subnet. Should only be set if dependencies do not use private endpoints. | <pre>object({<br/>    cosmos  = optional(bool, false)<br/>    storage = optional(bool, false)<br/>    web     = optional(bool, false)<br/>  })</pre> | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Map of tags to apply to all created resources. | `map(any)` | n/a | yes |
| <a name="input_tls_version"></a> [tls\_version](#input\_tls\_version) | Minimum TLS version for the App Service. | `number` | `1.2` | no |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | App Service use case. Allowed values: 'default', 'high\_load'. | `string` | `"default"` | no |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Virtual network where the subnet will be created. | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
| ---- | ----------- |
| <a name="output_app_service"></a> [app\_service](#output\_app\_service) | Details of the App Service, including its resource group, plan, and slot information. |
| <a name="output_diagnostic_settings"></a> [diagnostic\_settings](#output\_diagnostic\_settings) | Details of the diagnostic settings configured for the App Service. |
| <a name="output_subnet"></a> [subnet](#output\_subnet) | Details of the subnet used, including its ID and name. |
<!-- END_TF_DOCS -->
