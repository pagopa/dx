# DX - Azure Container APP

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

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | pagopa-dx/azure-naming-convention/azurerm | ~> 0.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_container_app_environment_id"></a> [container\_app\_environment\_id](#input\_container\_app\_environment\_id) | The container app environemnt id. | `string` | n/a | yes |
| <a name="input_container_app_templates"></a> [container\_app\_templates](#input\_container\_app\_templates) | List of containers to be deployed in the Container App. Each container can have its own settings, including liveness, readiness and startup probes. The image name is mandatory, while the name is optional. If not provided, the image name will be used as the container name. | <pre>list(object({<br/>    image        = string<br/>    name         = optional(string, "")<br/>    app_settings = optional(map(string), {})<br/><br/>    liveness_probe = object({<br/>      failure_count_threshold = optional(number, 3)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      initial_delay    = optional(number, 30)<br/>      interval_seconds = optional(number, 10)<br/>      path             = string<br/>      timeout          = optional(number, 5)<br/>      transport        = optional(string, "HTTP")<br/>    })<br/><br/>    readiness_probe = optional(object({<br/>      failure_count_threshold = optional(number, 10)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      interval_seconds        = optional(number, 10)<br/>      path                    = string<br/>      success_count_threshold = optional(number, 3)<br/>      timeout                 = optional(number, 5)<br/>      transport               = optional(string, "HTTP")<br/>    }), null)<br/><br/>    startup_probe = optional(object({<br/>      failure_count_threshold = optional(number, 10)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      interval_seconds = optional(number, 10)<br/>      path             = string<br/>      timeout          = optional(number, 5)<br/>      transport        = optional(string, "HTTP")<br/>    }), null)<br/>  }))</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_revision_mode"></a> [revision\_mode](#input\_revision\_mode) | The revision mode for the container app. Valid values are 'Single' and 'Multiple'. | `string` | `"Multiple"` | no |
| <a name="input_secrets"></a> [secrets](#input\_secrets) | Key Vault secret references to be used in all the containers of this Container App. | <pre>list(object({<br/>    name                = string<br/>    key_vault_secret_id = string<br/>  }))</pre> | `[]` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_target_port"></a> [target\_port](#input\_target\_port) | The target port for the Container App. | `number` | `8080` | no |
| <a name="input_tier"></a> [tier](#input\_tier) | The offer type for the Container. Valid values are 'xs', 's', 'm' and 'l'. | `string` | `"s"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | n/a |
| <a name="output_url"></a> [url](#output\_url) | n/a |
<!-- END_TF_DOCS -->
