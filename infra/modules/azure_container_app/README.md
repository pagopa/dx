# DX - Azure Container APP

## Overview

This Terraform module deploys an Azure Container App along with an Azure Container App Environment. It supports System Assigned Managed Identity, Key Vault integration for secrets, and configurable scaling options.

## Resources Created

- `azurerm_container_app_environment`: If don't exist defines the environment for Container Apps.
- `azurerm_container_app`: Deploys a containerized application in the specified environment.

## Features

- Dynamically creates a Container App Environment if no `container_app_environment_id` is provided.
- Supports environment variables via a map (`container_app_template.envs`).
- Key Vault secret integration when a Key Vault is specified.
- With tier specification (s, m, l or xl) creates container app with different replicas, CPU, and memory settings:

  ```json
  "s" = {
    cpu    = 0.25
    memory = "0.5Gi"
    replicas = {
      min = 0
      max = 1
    }
  }
  "m" = {
    cpu    = 0.5
    memory = "1Gi"
    replicas = {
      min = 1
      max = 1
    }
  }
  "l" = {
    cpu : 1
    memory : "2Gi"
    replicas = {
      min = 1
      max = 1
    }
  }
  "xl" = {
    cpu : 1.25
    memory : "2.5Gi"
    replicas = {
      min = 1
      max = 2
    }
  }
  ```
  
- Managed Identity (System Assigned) for secure authentication.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.110, < 5.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | pagopa/dx-azure-naming-convention/azurerm | ~> 0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app) | resource |
| [azurerm_container_app_environment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_environment) | resource |
| [azurerm_key_vault_access_policy.kv_ca_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_role_assignment.kv_ca_role](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_key_vault.kv](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_container_app_environment_id"></a> [container\_app\_environment\_id](#input\_container\_app\_environment\_id) | The ID of the container app environment to deploy the container app to. If not provided, a new container app environment will be created. | `string` | `null` | no |
| <a name="input_container_app_template"></a> [container\_app\_template](#input\_container\_app\_template) | The template for the container app to deploy | <pre>object({<br/>    image = string<br/>    name  = string<br/>    envs  = optional(map(string), {})<br/>  })</pre> | n/a | yes |
| <a name="input_create_container_app_environment"></a> [create\_container\_app\_environment](#input\_create\_container\_app\_environment) | Determines whether to create a new Container App Environment | `bool` | `false` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | Details of the KeyVault holding secrets for this Container | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>    use_rbac            = optional(bool, false)<br/>    secret_name         = string<br/>  })</pre> | `null` | no |
| <a name="input_log_analytics_workspace_id"></a> [log\_analytics\_workspace\_id](#input\_log\_analytics\_workspace\_id) | The ID of the Log Analytics workspace to use for the container app environment. | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | The offer type for the Container. Valid values are 's', 'm', 'l' and 'xl'. | `string` | `"s"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | n/a |
<!-- END_TF_DOCS -->
