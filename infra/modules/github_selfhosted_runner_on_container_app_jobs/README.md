# DX Typescript - GitHub SelfHosted Runner on Azure Container App Job

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/github-selfhosted-runner-on-container-app-jobs/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fgithub-selfhosted-runner-on-container-app-jobs%2Fazurerm%2Flatest)

This module creates a Container App Job to be used as a GitHub self-hosted runner. Using a self-hosted runner is essential when you need to reach private resources in terms of networking from a GitHub workflow.

## Features

- **Container App Job**: Deploys a Container App Job in the specified Azure Container App Environment.
- **Managed Identity**: Provides System Assigned Managed Identity for secure authentication with Azure resources.
- **Key Vault Access**: Grant access to the KeyVault instance with GitHub credentials (PAT token)
- **Auto GitHub Registration**: Automatically scale and register as self-hosted runner in the target repository.

## Usage Example

A usage example can be found in the [examples](https://github.com/pagopa-dx/terraform-azurerm-azure-container-app/tree/main/examples/basic) directory.
<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.110, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app_job.github_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_job) | resource |
| [azurerm_key_vault_access_policy.keyvault_containerapp](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_role_assignment.keyvault_containerapp](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_container_app_environment"></a> [container\_app\_environment](#input\_container\_app\_environment) | Configuration for the Container App Environment. | <pre>object({<br/>    id                          = string<br/>    location                    = string<br/>    replica_timeout_in_seconds  = optional(number, 1800)<br/>    polling_interval_in_seconds = optional(number, 30)<br/>    min_instances               = optional(number, 0)<br/>    max_instances               = optional(number, 30)<br/>    use_labels                  = optional(bool, false)<br/>    override_labels             = optional(list(string), [])<br/>    cpu                         = optional(number, 1.5)<br/>    memory                      = optional(string, "3Gi")<br/>    image                       = optional(string, "ghcr.io/pagopa/github-self-hosted-runner-azure:latest")<br/>    env_vars                    = optional(map(string), {})<br/>    secrets                     = optional(map(string), {})<br/>  })</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | Details of the Key Vault used to store secrets for the Container App Job. | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>    use_rbac            = optional(bool, false)<br/>    secret_name         = optional(string, "github-runner-pat")<br/>  })</pre> | n/a | yes |
| <a name="input_repository"></a> [repository](#input\_repository) | Details of the GitHub repository, including the owner and repository name. | <pre>object({<br/>    owner = optional(string, "pagopa")<br/>    name  = string<br/>  })</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where the Container App Job will be deployed. Defaults to null. | `string` | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_container_app_job"></a> [container\_app\_job](#output\_container\_app\_job) | Details of the GitHub self-hosted runner container app job, including ID, name, and resource group name. |
<!-- END_TF_DOCS -->
