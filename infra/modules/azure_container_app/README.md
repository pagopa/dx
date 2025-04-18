# DX - Azure Container APP

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-container-app/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-container-app%2Fazurerm%2Flatest)

This Terraform module deploys an Azure Container App in a provided Azure Container App Environment. It supports System Assigned Managed Identity and configurable scaling options.

## Features

- **Container App Deployment**: Deploys a containerized application in the specified Azure Container App Environment.
- **Private Endpoint Integration**: Creates a private DNS A record for the container app, enabling secure internal communication.
- **Managed Identity**: Provides System Assigned Managed Identity for secure authentication with Azure resources.
- **Health Probes**: Configurable liveness, readiness, and startup probes to monitor and ensure container health.
- **Ingress Configuration**: Supports secure ingress with options for external or internal access and target port configuration.
- **Dynamic Templates**: Allows defining multiple container templates with customizable settings, including environment variables and probes.
- **Revision Management**: Supports both `Single` and `Multiple` revision modes for managing application updates.

## Tiers and Configurations

| Tier | Description                                                    | CPU   | Memory | Replicas (Min-Max) |
|------|----------------------------------------------------------------|-------|--------|--------------------|
| xs   | Minimal configuration for testing.                             | 0.25  | 0.5Gi  | 0-1                |
| s    | Suitable for development, testing, and small-scale production. | 0.5   | 1Gi    | 1-1                |
| m    | Low-load production environments.                              | 1.25  | 2.5Gi  | 1-2                |
| l    | High-load production environments.                             | 2     | 4Gi    | 2-4                |

## Usage Example

A complete usage example can be found in the [example/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-container-app/tree/main/examples/complete) directory.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_acr_registry"></a> [acr\_registry](#input\_acr\_registry) | Indicates the Azure Container Registry to pull images from. Use this variable only if the registry service is an Azure Container Registry. Value must match the registry specified in the image name. | `string` | `null` | no |
| <a name="input_container_app_environment_id"></a> [container\_app\_environment\_id](#input\_container\_app\_environment\_id) | The ID of the Azure Container App Environment where the container app will be deployed. | `string` | n/a | yes |
| <a name="input_container_app_templates"></a> [container\_app\_templates](#input\_container\_app\_templates) | List of containers to be deployed in the Container App. Each container can have its own settings, including liveness, readiness and startup probes. The image name is mandatory, while the name is optional. If not provided, the image name will be used as the container name. | <pre>list(object({<br/>    image        = string<br/>    name         = optional(string, "")<br/>    app_settings = optional(map(string), {})<br/><br/>    liveness_probe = object({<br/>      failure_count_threshold = optional(number, 3)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      initial_delay    = optional(number, 30)<br/>      interval_seconds = optional(number, 10)<br/>      path             = string<br/>      timeout          = optional(number, 5)<br/>      transport        = optional(string, "HTTP")<br/>    })<br/><br/>    readiness_probe = optional(object({<br/>      failure_count_threshold = optional(number, 10)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      interval_seconds        = optional(number, 10)<br/>      initial_delay           = optional(number, 30)<br/>      path                    = string<br/>      success_count_threshold = optional(number, 3)<br/>      timeout                 = optional(number, 5)<br/>      transport               = optional(string, "HTTP")<br/>    }), null)<br/><br/>    startup_probe = optional(object({<br/>      failure_count_threshold = optional(number, 10)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      interval_seconds = optional(number, 10)<br/>      path             = string<br/>      timeout          = optional(number, 5)<br/>      transport        = optional(string, "HTTP")<br/>    }), null)<br/>  }))</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the Azure Resource Group where the resources will be deployed. | `string` | n/a | yes |
| <a name="input_revision_mode"></a> [revision\_mode](#input\_revision\_mode) | The revision mode for the container app. Valid values are 'Single' and 'Multiple'. | `string` | `"Multiple"` | no |
| <a name="input_secrets"></a> [secrets](#input\_secrets) | A list of Key Vault secret references to be used as environment variables in the container app. | <pre>list(object({<br/>    name                = string<br/>    key_vault_secret_id = string<br/>  }))</pre> | `[]` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_target_port"></a> [target\_port](#input\_target\_port) | The port on which the container app will listen for incoming traffic. | `number` | `8080` | no |
| <a name="input_tier"></a> [tier](#input\_tier) | The offer type for the Container. Valid values are 'xs', 's', 'm' and 'l'. | `string` | `"s"` | no |
| <a name="input_user_assigned_identity_id"></a> [user\_assigned\_identity\_id](#input\_user\_assigned\_identity\_id) | Id of the user-assigned managed identity created along with the Container App Environment. This is necessary to give identity roles (e.g. KeyVault access) to the Container App. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | The ID of the Container App resource. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Container App resource. |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | The principal ID of the system-assigned managed identity associated with this Container App. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the Azure Resource Group where the Container App is deployed. |
| <a name="output_url"></a> [url](#output\_url) | The URL of the Container App. |
<!-- END_TF_DOCS -->
