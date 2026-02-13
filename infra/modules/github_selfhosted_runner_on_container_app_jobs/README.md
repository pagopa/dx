# DX Typescript - GitHub SelfHosted Runner on Azure Container App Job

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/github-selfhosted-runner-on-container-app-jobs/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fgithub-selfhosted-runner-on-container-app-jobs%2Fazurerm%2Flatest)

This module creates a Container App Job to be used as a GitHub self-hosted runner. Using a self-hosted runner is essential when you need to reach private resources in terms of networking from a GitHub workflow.

## Features

- **Container App Job**: Deploys a Container App Job in the specified Azure Container App Environment.
- **Managed Identity**: Provides System Assigned Managed Identity for secure authentication with Azure resources.
- **Key Vault Access**: Grant access to the KeyVault instance with GitHub credentials.
- **Auto GitHub Registration**: Automatically scale and register as self-hosted runner in the target repository.

## Authentication Methods

This module supports two authentication methods:

1. **GitHub App Authentication (Recommended)**: Use `app_key_secret_name`, `app_id_secret_name`, and `installation_id_secret_name` in the `key_vault` variable.
2. **PAT-based Authentication (Legacy)**: Use `secret_name` in the `key_vault` variable for backward compatibility.

## Usage Example

A usage example can be found in the [examples](https://github.com/pagopa-dx/terraform-azurerm-azure-container-app/tree/main/examples/basic) directory.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                               | Version           |
| ------------------------------------------------------------------ | ----------------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm) | >= 3.110, < 5.0   |
| <a name="requirement_dx"></a> [dx](#requirement_dx)                | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name                                                                                                                                                             | Type        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [azurerm_container_app_job.github_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_job)                     | resource    |
| [azurerm_key_vault_access_policy.keyvault_containerapp](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource    |
| [azurerm_role_assignment.keyvault_containerapp](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                 | resource    |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config)                                | data source |

## Inputs

| Name                                                                                                         | Description                                                                                                                                                                                                                                       | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Default | Required |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | :------: |
| <a name="input_container_app_environment"></a> [container_app_environment](#input_container_app_environment) | Configuration for the Container App Environment.                                                                                                                                                                                                  | <pre>object({<br/> id = string<br/> location = string<br/> replica_timeout_in_seconds = optional(number, 1800)<br/> polling_interval_in_seconds = optional(number, 30)<br/> min_instances = optional(number, 0)<br/> max_instances = optional(number, 30)<br/> use_labels = optional(bool, false)<br/> override_labels = optional(list(string), [])<br/> cpu = optional(number, 1.5)<br/> memory = optional(string, "3Gi")<br/> image = optional(string, "ghcr.io/pagopa/github-self-hosted-runner-azure:latest")<br/> env_vars = optional(map(string), {})<br/> secrets = optional(map(string), {})<br/> })</pre> | n/a     |   yes    |
| <a name="input_environment"></a> [environment](#input_environment)                                           | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains.                                            | <pre>object({<br/> prefix = string<br/> env_short = string<br/> location = string<br/> instance_number = string<br/> })</pre>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | n/a     |   yes    |
| <a name="input_key_vault"></a> [key_vault](#input_key_vault)                                                 | Details of the Key Vault used to store GitHub credentials. Use 'secret_name' for PAT-based authentication (legacy) or 'app_key_secret_name', 'app_id_secret_name', and 'installation_id_secret_name' for GitHub App authentication (recommended). | <pre>object({<br/> name = string<br/> resource_group_name = string<br/> use_rbac = optional(bool, false)<br/> secret_name = optional(string, null)<br/> app_key_secret_name = optional(string, null)<br/> app_id_secret_name = optional(string, null)<br/> installation_id_secret_name = optional(string, null)<br/> })</pre>                                                                                                                                                                                                                                                                                      | n/a     |   yes    |
| <a name="input_repository"></a> [repository](#input_repository)                                              | Details of the GitHub repository, including the owner and repository name.                                                                                                                                                                        | <pre>object({<br/> owner = optional(string, "pagopa")<br/> name = string<br/> })</pre>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | n/a     |   yes    |
| <a name="input_resource_group_name"></a> [resource_group_name](#input_resource_group_name)                   | The name of the resource group where the Container App Job will be deployed. Defaults to null.                                                                                                                                                    | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `null`  |    no    |
| <a name="input_tags"></a> [tags](#input_tags)                                                                | A map of tags to assign to the resources.                                                                                                                                                                                                         | `map(any)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | n/a     |   yes    |

## Outputs

| Name                                                                                   | Description                                                                                              |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| <a name="output_container_app_job"></a> [container_app_job](#output_container_app_job) | Details of the GitHub self-hosted runner container app job, including ID, name, and resource group name. |

<!-- END_TF_DOCS -->
