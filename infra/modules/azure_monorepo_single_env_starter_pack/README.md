# DX - Azure MonoRepository Single Environment Starter Pack

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~>4.0 |
| <a name="requirement_github"></a> [github](#requirement\_github) | ~>6.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | ../azure_naming_convention | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app_job.github_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_job) | resource |
| [azurerm_federated_identity_credential.github_app_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential) | resource |
| [azurerm_federated_identity_credential.github_infra_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential) | resource |
| [azurerm_federated_identity_credential.github_infra_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential) | resource |
| [azurerm_federated_identity_credential.github_opex_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential) | resource |
| [azurerm_federated_identity_credential.github_opex_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential) | resource |
| [azurerm_key_vault_access_policy.infra_cd_kv_common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_key_vault_access_policy.infra_ci_kv_common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_key_vault_access_policy.keyvault_containerapp](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_resource_group.main](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_role_assignment.admins_apim_service_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.admins_group_rg](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.admins_group_rg_kv_admin](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.admins_group_rg_kv_data](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.admins_group_st_tf](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.admins_vnet_network_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.app_cd_rg_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.app_cd_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.app_cd_tf_rg_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.devs_apim_service_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.devs_group_rg](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.devs_group_tf_rg_kv_cert](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.devs_group_tf_rg_kv_secr](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.devs_group_tf_st](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.externals_group_rg](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.externals_group_tf_rg](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_apim_service_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_rg_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_rg_ext_network_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_rg_kv_cert](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_rg_kv_crypto](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_rg_kv_secr](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_rg_rbac_admin](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_rg_st_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_st_tf_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_vnet_network_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_rg_ext_pagopa_dns_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_rg_kv_cert](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_rg_kv_crypto](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_rg_kv_secr](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_rg_st_blob_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_rg_st_queue_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_rg_st_queue_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_subscription_cosmos_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_subscription_data_access](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_subscription_pagopa_iac_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_ci_tf_st_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.opex_cd_rg_monitoring_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.opex_cd_rg_opex_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.opex_cd_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.opex_cd_tf_rg_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.opex_cd_tf_rg_blob_data_access](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.opex_ci_subscription_data_access](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.opex_ci_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.opex_ci_tf_rg_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_user_assigned_identity.app_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [azurerm_user_assigned_identity.infra_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [azurerm_user_assigned_identity.infra_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [azurerm_user_assigned_identity.opex_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [azurerm_user_assigned_identity.opex_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity) | resource |
| [github_actions_environment_secret.app_prod_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret) | resource |
| [github_actions_environment_secret.infra_prod_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret) | resource |
| [github_actions_environment_secret.infra_prod_ci](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret) | resource |
| [github_actions_environment_secret.opex_prod_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret) | resource |
| [github_actions_environment_secret.opex_prod_ci](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret) | resource |
| [github_actions_secret.repo_secrets](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret) | resource |
| [github_branch_default.main](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_default) | resource |
| [github_branch_protection.main](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection) | resource |
| [github_repository.this](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository) | resource |
| [github_repository_environment.app_prod_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment) | resource |
| [github_repository_environment.infra_prod_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment) | resource |
| [github_repository_environment.infra_prod_ci](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment) | resource |
| [github_repository_environment.opex_prod_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment) | resource |
| [github_repository_environment.opex_prod_ci](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment) | resource |
| [github_repository_environment_deployment_policy.app_prod_cd_branch](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment_deployment_policy) | resource |
| [github_repository_environment_deployment_policy.app_prod_cd_tag](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment_deployment_policy) | resource |
| [github_repository_environment_deployment_policy.infra_prod_cd_branch](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment_deployment_policy) | resource |
| [github_repository_environment_deployment_policy.infra_prod_cd_tag](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment_deployment_policy) | resource |
| [github_repository_environment_deployment_policy.opex_prod_cd_branch](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment_deployment_policy) | resource |
| [github_repository_environment_deployment_policy.opex_prod_cd_tag](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment_deployment_policy) | resource |
| [azurerm_key_vault.runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |
| [github_organization_teams.all](https://registry.terraform.io/providers/integrations/github/latest/docs/data-sources/organization_teams) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_apim_id"></a> [apim\_id](#input\_apim\_id) | (Optional) ID of the APIM instance | `string` | `null` | no |
| <a name="input_dns_zone_resource_group_id"></a> [dns\_zone\_resource\_group\_id](#input\_dns\_zone\_resource\_group\_id) | Id of the resource group holding public DNS zone | `string` | n/a | yes |
| <a name="input_entraid_groups"></a> [entraid\_groups](#input\_entraid\_groups) | Azure Entra Id groups to give role to | <pre>object({<br/>    admins_object_id    = string<br/>    devs_object_id      = string<br/>    externals_object_id = optional(string, null)<br/>  })</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_github_private_runner"></a> [github\_private\_runner](#input\_github\_private\_runner) | n/a | <pre>object({<br/>    container_app_environment_id       = string<br/>    container_app_environment_location = string<br/>    polling_interval_in_seconds        = optional(number, 30)<br/>    min_instances                      = optional(number, 0)<br/>    max_instances                      = optional(number, 30)<br/>    labels                             = optional(list(string), [])<br/>    key_vault = object({<br/>      name                = string<br/>      resource_group_name = string<br/>      secret_name         = optional(string, "github-runner-pat")<br/>    })<br/>    cpu    = optional(number, 0.5)<br/>    memory = optional(string, "1Gi")<br/>  })</pre> | n/a | yes |
| <a name="input_keyvault_common_ids"></a> [keyvault\_common\_ids](#input\_keyvault\_common\_ids) | Id of the KeyVault containing common secrets | `list(string)` | `[]` | no |
| <a name="input_opex_resource_group_id"></a> [opex\_resource\_group\_id](#input\_opex\_resource\_group\_id) | Id of the resource group containing Opex dashboards | `string` | n/a | yes |
| <a name="input_pep_vnet_id"></a> [pep\_vnet\_id](#input\_pep\_vnet\_id) | ID of the VNet holding Private Endpoint-dedicated subnet | `string` | n/a | yes |
| <a name="input_repository"></a> [repository](#input\_repository) | Information about this repository | <pre>object({<br/>    owner                    = optional(string, "pagopa")<br/>    name                     = string<br/>    description              = string<br/>    topics                   = list(string)<br/>    reviewers_teams          = list(string)<br/>    default_branch_name      = optional(string, "main")<br/>    infra_cd_policy_branches = optional(set(string), ["main"])<br/>    opex_cd_policy_branches  = optional(set(string), ["main"])<br/>    app_cd_policy_branches   = optional(set(string), ["main"])<br/>    infra_cd_policy_tags     = optional(set(string), [])<br/>    opex_cd_policy_tags      = optional(set(string), [])<br/>    app_cd_policy_tags       = optional(set(string), [])<br/>  })</pre> | n/a | yes |
| <a name="input_subscription_id"></a> [subscription\_id](#input\_subscription\_id) | The subscription ID where resources are created | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(string)` | n/a | yes |
| <a name="input_tenant_id"></a> [tenant\_id](#input\_tenant\_id) | The tenant ID where resources are created | `string` | n/a | yes |
| <a name="input_terraform_storage_account"></a> [terraform\_storage\_account](#input\_terraform\_storage\_account) | Name and resource group name of the Storage Account hosting the Terraform state file | <pre>object({<br/>    resource_group_name = string<br/>    name                = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_github_private_runner"></a> [github\_private\_runner](#output\_github\_private\_runner) | n/a |
| <a name="output_repository"></a> [repository](#output\_repository) | n/a |
| <a name="output_resource_group"></a> [resource\_group](#output\_resource\_group) | n/a |
<!-- END_TF_DOCS -->
