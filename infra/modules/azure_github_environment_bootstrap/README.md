# DX - Azure GitHub Environment Bootstrap

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-github-environment-bootstrap/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-github-environment-bootstrap%2Fazurerm%2Flatest)

The Azure GitHub Environment Bootstrap module is designed for users who have just created a new GitHub repository and want to quickly focus on their goals without spending hours on setup. It is particularly useful for mono repositories.

The module performs the following actions:

- Creates the **GitHub Private Runner** associated with the repository.
- Creates Azure user-assigned **Managed Identities** to let GitHub workflows deploy:
  1. Infrastructure resources (IaC).
  2. Applications.
  3. Opex dashboards.
- Assigns **IAM roles** to allow workflows to work properly.
- Creates an Azure **resource group** tied with the Cloud Resources defined
  within the repository.

## Quick Start

Here's a minimal example to get started:

```hcl
module "bootstrap" {
  source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
  version = "~> 3.0"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "myapp"
    instance_number = "01"
  }

  subscription_id = data.azurerm_subscription.current.id
  tenant_id       = data.azurerm_client_config.current.tenant_id

  entraid_groups = {
    admins_object_id = data.azuread_group.admins.object_id
    devs_object_id   = data.azuread_group.developers.object_id
  }

  terraform_storage_account = {
    name                = "mytfstateaccount"
    resource_group_name = "terraform-state-rg"
  }

  repository = {
    owner = "pagopa"
    name  = "my-repository"
  }

  github_private_runner = {
    container_app_environment_id       = data.azurerm_container_app_environment.runner.id
    container_app_environment_location = "italynorth"
    key_vault = {
      name                = "my-keyvault"
      resource_group_name = "common-rg"
    }
  }

  pep_vnet_id                        = data.azurerm_virtual_network.common.id
  private_dns_zone_resource_group_id = data.azurerm_resource_group.network.id
  opex_resource_group_id             = data.azurerm_resource_group.dashboards.id

  tags = {
    Environment = "Dev"
    CreatedBy   = "Terraform"
  }
}
```

## Using with Core Values Exporter

Many input values for this module can be automatically retrieved using the companion module [`pagopa-dx/azure-core-values-exporter/azurerm`](https://registry.terraform.io/modules/pagopa-dx/azure-core-values-exporter/azurerm/latest). This module reads core infrastructure values from a shared Terraform state, eliminating the need to hardcode or manually look up resource IDs.

### Core Values Exporter Integration

```hcl
# First, retrieve core infrastructure values from the shared state
module "core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"

  core_state = {
    resource_group_name  = "dx-d-itn-tfstate-rg-01"
    storage_account_name = "dxditntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.dev.tfstate"
  }
}

# Then use the exported values in the bootstrap module
module "bootstrap" {
  source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
  version = "~> 3.0"

  # ... other required variables ...

  github_private_runner = {
    container_app_environment_id       = module.core_values.github_runner.environment_id
    container_app_environment_location = var.environment.location
    labels                             = ["dev"]
    key_vault = {
      name                = module.core_values.common_key_vault.name
      resource_group_name = module.core_values.common_key_vault.resource_group_name
    }
  }

  pep_vnet_id                        = module.core_values.common_vnet.id
  private_dns_zone_resource_group_id = module.core_values.network_resource_group_id
  opex_resource_group_id             = module.core_values.opex_resource_group_id

  additional_resource_group_ids = [
    module.core_values.common_resource_group_id,
  ]

  tags = local.tags
}
```

### Core Values Mapping

The following table shows which bootstrap module inputs can be populated from Core Values Exporter outputs:

| Bootstrap Module Input                                | Core Values Exporter Output                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `github_private_runner.container_app_environment_id`  | `module.core_values.github_runner.environment_id`                                          |
| `github_private_runner.key_vault.name`                | `module.core_values.common_key_vault.name`                                                 |
| `github_private_runner.key_vault.resource_group_name` | `module.core_values.common_key_vault.resource_group_name`                                  |
| `pep_vnet_id`                                         | `module.core_values.common_vnet.id`                                                        |
| `private_dns_zone_resource_group_id`                  | `module.core_values.network_resource_group_id`                                             |
| `opex_resource_group_id`                              | `module.core_values.opex_resource_group_id`                                                |
| `additional_resource_group_ids`                       | `module.core_values.common_resource_group_id`, `module.core_values.test_resource_group_id` |

For a complete production example using Core Values Exporter, see the [DX bootstrapper implementation](https://github.com/pagopa/dx/tree/main/infra/bootstrapper/_modules/azure).

## Variables Reference

### Summary Table

| Variable                             | Type         | Required | Description                                            |
| ------------------------------------ | ------------ | :------: | ------------------------------------------------------ |
| `environment`                        | object       |    ✅    | Naming conventions and resource location configuration |
| `entraid_groups`                     | object       |    ✅    | Azure Entra ID security groups for RBAC                |
| `terraform_storage_account`          | object       |    ✅    | Storage account for Terraform state files              |
| `repository`                         | object       |    ✅    | GitHub repository details                              |
| `github_private_runner`              | object       |    ✅    | Self-hosted runner configuration                       |
| `pep_vnet_id`                        | string       |    ✅    | VNet ID for private endpoints                          |
| `private_dns_zone_resource_group_id` | string       |    ✅    | Resource group with private DNS zones                  |
| `opex_resource_group_id`             | string       |    ✅    | Resource group for Opex dashboards                     |
| `subscription_id`                    | string       |    ✅    | Azure subscription ID                                  |
| `tenant_id`                          | string       |    ✅    | Azure tenant ID                                        |
| `tags`                               | map(string)  |    ✅    | Tags for all resources                                 |
| `additional_resource_group_ids`      | set(string)  |    ❌    | Extra resource groups for role assignments             |
| `apim_id`                            | string       |    ❌    | API Management instance ID                             |
| `sbns_id`                            | string       |    ❌    | Service Bus Namespace ID                               |
| `log_analytics_workspace_id`         | string       |    ❌    | Log Analytics Workspace ID                             |
| `nat_gateway_resource_group_id`      | string       |    ❌    | NAT Gateway resource group ID                          |
| `keyvault_common_ids`                | list(string) |    ❌    | Common Key Vault IDs                                   |

### Required Variables

#### `environment`

Defines naming conventions and resource location. All generated resources will follow the pattern: `{prefix}-{env_short}-{location_short}-{domain}-{resource_type}-{instance_number}`.

```hcl
environment = {
  prefix          = "dx"           # Project prefix (2-4 chars)
  env_short       = "d"            # Environment: d=dev, u=uat, p=prod
  location        = "italynorth"   # Azure region
  domain          = "myapp"        # Domain/application name
  instance_number = "01"           # Instance identifier
}
```

#### `entraid_groups`

Azure Entra ID (formerly Azure AD) security groups for RBAC assignments. These groups will receive appropriate roles on the created resources.

```hcl
entraid_groups = {
  admins_object_id    = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Full admin access
  devs_object_id      = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Developer access
  externals_object_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Optional: external collaborators
}
```

#### `terraform_storage_account`

The Azure Storage Account where Terraform state files are stored. The module will assign appropriate roles for the managed identities to access this account.

```hcl
terraform_storage_account = {
  name                = "mytfstateaccount"
  resource_group_name = "terraform-state-rg"
}
```

#### `repository`

GitHub repository details for configuring federated credentials and GitHub Actions secrets.

```hcl
repository = {
  owner = "pagopa"           # GitHub organization or user
  name  = "my-repository"    # Repository name
}
```

#### `github_private_runner`

Configuration for the GitHub Actions self-hosted runner deployed on Azure Container Apps.

```hcl
github_private_runner = {
  # Required: Container App Environment where the runner will be deployed
  container_app_environment_id       = data.azurerm_container_app_environment.runner.id
  container_app_environment_location = "italynorth"

  # Required: Key Vault containing the GitHub PAT for runner registration
  key_vault = {
    name                = "my-keyvault"
    resource_group_name = "common-rg"
    secret_name         = "github-runner-pat"  # Optional, defaults to "github-runner-pat"
    use_rbac            = false                 # Optional, set true if KV uses RBAC
  }

  # Optional: Scaling configuration
  min_instances                = 0       # Minimum runners (default: 0)
  max_instances                = 30      # Maximum runners (default: 30)
  polling_interval_in_seconds  = 30      # Job polling interval (default: 30)
  replica_timeout_in_seconds   = 1800    # Max job duration in seconds (default: 1800)

  # Optional: Runner labels for job targeting
  labels = ["dev", "my-app"]

  # Optional: Resource allocation
  cpu    = 1.5      # CPU cores (default: 1.5)
  memory = "3Gi"    # Memory (default: "3Gi")
}
```

#### `pep_vnet_id`

The ID of the Virtual Network containing private endpoints. Required for network contributor role assignment.

```hcl
pep_vnet_id = data.azurerm_virtual_network.common.id
```

#### `private_dns_zone_resource_group_id`

Resource group containing private DNS zones. The module assigns DNS zone contributor role for private endpoint DNS registration.

```hcl
private_dns_zone_resource_group_id = data.azurerm_resource_group.network.id
```

#### `opex_resource_group_id`

Resource group for operational dashboards. The Opex managed identity receives contributor access here.

```hcl
opex_resource_group_id = data.azurerm_resource_group.dashboards.id
```

#### `subscription_id` and `tenant_id`

Azure subscription and tenant identifiers.

```hcl
subscription_id = data.azurerm_subscription.current.id
tenant_id       = data.azurerm_client_config.current.tenant_id
```

#### `tags`

Tags applied to all created resources.

```hcl
tags = {
  CostCenter     = "TS000 - Technology"
  CreatedBy      = "Terraform"
  Environment    = "Dev"
  ManagementTeam = "My Team"
  Source         = "https://github.com/pagopa/my-repo"
}
```

### Optional Variables

#### `additional_resource_group_ids`

Additional resource groups where the managed identities should have access. Useful when your application spans multiple resource groups.

```hcl
additional_resource_group_ids = [
  azurerm_resource_group.custom_rg_01.id,
  azurerm_resource_group.custom_rg_02.id,
]
```

#### `apim_id`

Azure API Management instance ID. When provided, the infra CD identity receives API Management Service Contributor role.

```hcl
apim_id = data.azurerm_api_management.main.id
```

#### `sbns_id`

Azure Service Bus Namespace ID. When provided, the infra CD identity receives Service Bus contributor role.

```hcl
sbns_id = data.azurerm_servicebus_namespace.main.id
```

#### `log_analytics_workspace_id`

Log Analytics Workspace ID. When provided, the infra CD identity receives Log Analytics Contributor role.

```hcl
log_analytics_workspace_id = data.azurerm_log_analytics_workspace.main.id
```

#### `nat_gateway_resource_group_id`

Resource group containing NAT Gateways. When provided, the infra CD identity receives Network Contributor role.

```hcl
nat_gateway_resource_group_id = data.azurerm_resource_group.nat.id
```

#### `keyvault_common_ids`

List of common Key Vault IDs. When provided, access policies are created for the managed identities.

```hcl
keyvault_common_ids = [
  data.azurerm_key_vault.common.id,
]
```

## Gotchas

### Ensure Necessary Azure Permissions

The Azure principal (user or managed identity) executing the `terraform apply` command must have the **Role Based Access Control Administrator** and **Contributor** roles on the target Azure subscription. This is required to create and assign necessary IAM roles.

### Use Entra Id to Authenticate Connections to Storage Accounts

Entra Id should be used as the authentication method for Storage Accounts, replacing
access keys.

Storage Account with Terraform state file:

```hcl
backend "azurerm" {
  resource_group_name  = "<value>"
  storage_account_name = "<value>"
  container_name       = "<value>"
  key                  = "<repo-name>.repository.tfstate"
  use_azuread_auth     = true
}
```

Other Storage Accounts:

```hcl
provider "azurerm" {
  features {
  }
  storage_use_azuread = true
}
```

## Extending the module for custom needs

The module provides the basic configuration adhering to DX and Technology standards. However, it can be extended according to new needs. In fact, the module export all the ids and names of the resources that creates, so it is straightforward to add further resources.

### Managing multiple resource groups

This module includes a pre-configured resource group for deploying Azure resources. If you need additional resource groups, you can easily create them; the module will automatically assign all necessary roles.

```hcl
resource "azurerm_resource_group" "new_rg01" {
  name     = "dx-d-itn-custom-rg-01"
  location = "italynorth"

  tags = local.tags
}

resource "azurerm_resource_group" "new_rg02" {
  name     = "dx-d-itn-custom-rg-02"
  location = "italynorth"

  tags = local.tags
}

module "bootstrapper" {
  source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
  version = "~>x.0"

  additional_resource_group_ids = [
    azurerm_resource_group.new_rg01.id,
    azurerm_resource_group.new_rg02.id,
  ]
}
```

### Managing roles to common resources

The module facilitates the role assignment to resources that are generally, by their nature, centralized and shared by the entire product. These are the following ones:

- API Management
- Service Bus Namespace
- Log Analytics Workspace
- NAT Gateway

For each of these resources, the module provides an optional variable to which their IDs can be passed. Utilizing these IDs ensures that the requisite roles for operating on the resources are assigned to the Managed Identities associated with the repository's workflows.

## Examples

This module includes practical examples to help you get started quickly:

- **Mono-environment example**: You can find a simple mono-environment setup example in the `examples/` folder of this module, which demonstrates basic usage for a single environment configuration.
- **Multi-environment example**: For a complete, production-ready multi-environment setup, check out the live example in the [DX bootstrapper](https://github.com/pagopa/dx/tree/main/infra/bootstrapper), which shows how to manage multiple environments (dev, prod, etc.) using this module.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                               | Version           |
| ------------------------------------------------------------------ | ----------------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm) | ~>4               |
| <a name="requirement_dx"></a> [dx](#requirement_dx)                | >= 0.0.7, < 1.0.0 |
| <a name="requirement_github"></a> [github](#requirement_github)    | ~>6               |

## Modules

| Name                                                                       | Source                                                           | Version |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------- |
| <a name="module_github_runner"></a> [github_runner](#module_github_runner) | pagopa-dx/github-selfhosted-runner-on-container-app-jobs/azurerm | ~> 1.0  |

## Resources

| Name                                                                                                                                                                    | Type     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [azurerm_federated_identity_credential.github_app_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential)    | resource |
| [azurerm_federated_identity_credential.github_app_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential)    | resource |
| [azurerm_federated_identity_credential.github_infra_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential)  | resource |
| [azurerm_federated_identity_credential.github_infra_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential)  | resource |
| [azurerm_federated_identity_credential.github_opex_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential)   | resource |
| [azurerm_federated_identity_credential.github_opex_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/federated_identity_credential)   | resource |
| [azurerm_key_vault_access_policy.infra_cd_kv_common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy)           | resource |
| [azurerm_key_vault_access_policy.infra_ci_kv_common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy)           | resource |
| [azurerm_resource_group.main](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group)                                           | resource |
| [azurerm_role_assignment.admins_group_rgs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                             | resource |
| [azurerm_role_assignment.admins_group_rgs_kv_admin](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                    | resource |
| [azurerm_role_assignment.admins_group_rgs_kv_data](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                     | resource |
| [azurerm_role_assignment.app_cd_rgs_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                  | resource |
| [azurerm_role_assignment.app_cd_rgs_cae_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                   | resource |
| [azurerm_role_assignment.app_cd_rgs_cdn_profile_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)           | resource |
| [azurerm_role_assignment.app_cd_rgs_static_webapp_secrets](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)             | resource |
| [azurerm_role_assignment.app_cd_rgs_website_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)               | resource |
| [azurerm_role_assignment.app_cd_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                   | resource |
| [azurerm_role_assignment.app_cd_tf_rg_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                | resource |
| [azurerm_role_assignment.app_ci_rgs_static_webapp_secrets](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)             | resource |
| [azurerm_role_assignment.app_ci_subscription_pagopa_iac_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)        | resource |
| [azurerm_role_assignment.app_ci_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                   | resource |
| [azurerm_role_assignment.devs_group_rgs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                               | resource |
| [azurerm_role_assignment.devs_group_tf_rgs_kv_secr](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                    | resource |
| [azurerm_role_assignment.externals_group_rgs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                          | resource |
| [azurerm_role_assignment.infra_cd_apim_service_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)            | resource |
| [azurerm_role_assignment.infra_cd_log_analytics_workspace_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.infra_cd_rg_nat_gw_network_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)       | resource |
| [azurerm_role_assignment.infra_cd_rg_network_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)              | resource |
| [azurerm_role_assignment.infra_cd_rg_private_dns_zone_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)     | resource |
| [azurerm_role_assignment.infra_cd_rgs_ca_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                  | resource |
| [azurerm_role_assignment.infra_cd_rgs_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                     | resource |
| [azurerm_role_assignment.infra_cd_rgs_kv_cert](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                         | resource |
| [azurerm_role_assignment.infra_cd_rgs_kv_crypto](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                       | resource |
| [azurerm_role_assignment.infra_cd_rgs_kv_secr](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                         | resource |
| [azurerm_role_assignment.infra_cd_rgs_st_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)             | resource |
| [azurerm_role_assignment.infra_cd_rgs_user_access_admin](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)               | resource |
| [azurerm_role_assignment.infra_cd_sbns_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                    | resource |
| [azurerm_role_assignment.infra_cd_st_tf_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)              | resource |
| [azurerm_role_assignment.infra_cd_subscription_rbac_admin](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)             | resource |
| [azurerm_role_assignment.infra_cd_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                 | resource |
| [azurerm_role_assignment.infra_cd_vnet_network_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)            | resource |
| [azurerm_role_assignment.infra_ci_rgs_ca_operator](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                     | resource |
| [azurerm_role_assignment.infra_ci_rgs_cosmos_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)              | resource |
| [azurerm_role_assignment.infra_ci_rgs_kv_cert](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                         | resource |
| [azurerm_role_assignment.infra_ci_rgs_kv_crypto](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                       | resource |
| [azurerm_role_assignment.infra_ci_rgs_kv_secr](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                         | resource |
| [azurerm_role_assignment.infra_ci_rgs_st_blob_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                  | resource |
| [azurerm_role_assignment.infra_ci_rgs_st_queue_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)            | resource |
| [azurerm_role_assignment.infra_ci_rgs_st_queue_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                 | resource |
| [azurerm_role_assignment.infra_ci_rgs_st_table_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)            | resource |
| [azurerm_role_assignment.infra_ci_rgs_st_table_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                 | resource |
| [azurerm_role_assignment.infra_ci_subscription_apim_secrets](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)           | resource |
| [azurerm_role_assignment.infra_ci_subscription_data_access](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)            | resource |
| [azurerm_role_assignment.infra_ci_subscription_pagopa_iac_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)      | resource |
| [azurerm_role_assignment.infra_ci_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                 | resource |
| [azurerm_role_assignment.infra_ci_tf_st_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)              | resource |
| [azurerm_role_assignment.opex_cd_rg_monitoring_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)            | resource |
| [azurerm_role_assignment.opex_cd_rg_opex_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                  | resource |
| [azurerm_role_assignment.opex_cd_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                  | resource |
| [azurerm_role_assignment.opex_cd_tf_rg_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)               | resource |
| [azurerm_role_assignment.opex_cd_tf_rg_blob_data_access](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)               | resource |
| [azurerm_role_assignment.opex_ci_subscription_data_access](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)             | resource |
| [azurerm_role_assignment.opex_ci_subscription_reader](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)                  | resource |
| [azurerm_role_assignment.opex_ci_tf_rg_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment)               | resource |
| [azurerm_user_assigned_identity.app_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity)                         | resource |
| [azurerm_user_assigned_identity.app_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity)                         | resource |
| [azurerm_user_assigned_identity.infra_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity)                       | resource |
| [azurerm_user_assigned_identity.infra_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity)                       | resource |
| [azurerm_user_assigned_identity.opex_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity)                        | resource |
| [azurerm_user_assigned_identity.opex_ci](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/user_assigned_identity)                        | resource |
| [github_actions_environment_secret.app_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret)                | resource |
| [github_actions_environment_secret.app_ci](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret)                | resource |
| [github_actions_environment_secret.infra_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret)              | resource |
| [github_actions_environment_secret.infra_ci](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret)              | resource |
| [github_actions_environment_secret.opex_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret)               | resource |
| [github_actions_environment_secret.opex_ci](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_environment_secret)               | resource |
| [github_actions_secret.repo_secrets](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret)                                  | resource |

## Inputs

| Name                                                                                                                                    | Description                                                                                                                                                                                            | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Default | Required |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | :------: |
| <a name="input_additional_resource_group_ids"></a> [additional_resource_group_ids](#input_additional_resource_group_ids)                | A set of IDs for existing resource groups owned by the domain team.                                                                                                                                    | `set(string)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `[]`    |    no    |
| <a name="input_apim_id"></a> [apim_id](#input_apim_id)                                                                                  | The ID of the Azure API Management (APIM) instance.                                                                                                                                                    | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`  |    no    |
| <a name="input_entraid_groups"></a> [entraid_groups](#input_entraid_groups)                                                             | The Azure Entra ID groups to give role to.                                                                                                                                                             | <pre>object({<br/> admins_object_id = string<br/> devs_object_id = string<br/> externals_object_id = optional(string, null)<br/> })</pre>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | n/a     |   yes    |
| <a name="input_environment"></a> [environment](#input_environment)                                                                      | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/> prefix = string<br/> env_short = string<br/> location = string<br/> domain = string<br/> instance_number = string<br/> })</pre>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | n/a     |   yes    |
| <a name="input_github_private_runner"></a> [github_private_runner](#input_github_private_runner)                                        | Configuration for GitHub private runners, including environment details, scaling options, and Key Vault integration.                                                                                   | <pre>object({<br/> container_app_environment_id = string<br/> container_app_environment_location = string<br/> replica_timeout_in_seconds = optional(number, 1800)<br/> polling_interval_in_seconds = optional(number, 30)<br/> min_instances = optional(number, 0)<br/> max_instances = optional(number, 30)<br/> labels = optional(list(string), [])<br/> key_vault = object({<br/> name = string<br/> resource_group_name = string<br/> secret_name = optional(string, "github-runner-pat")<br/> use_rbac = optional(bool, false)<br/> })<br/> cpu = optional(number, 1.5)<br/> memory = optional(string, "3Gi")<br/> })</pre> | n/a     |   yes    |
| <a name="input_keyvault_common_ids"></a> [keyvault_common_ids](#input_keyvault_common_ids)                                              | A list of IDs for Key Vaults containing common secrets.                                                                                                                                                | `list(string)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `[]`    |    no    |
| <a name="input_log_analytics_workspace_id"></a> [log_analytics_workspace_id](#input_log_analytics_workspace_id)                         | The ID of the Log Analytics Workspace for monitoring and diagnostics.                                                                                                                                  | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`  |    no    |
| <a name="input_nat_gateway_resource_group_id"></a> [nat_gateway_resource_group_id](#input_nat_gateway_resource_group_id)                | The ID of the resource group hosting NAT Gateways.                                                                                                                                                     | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`  |    no    |
| <a name="input_opex_resource_group_id"></a> [opex_resource_group_id](#input_opex_resource_group_id)                                     | The ID of the resource group containing Opex dashboards.                                                                                                                                               | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | n/a     |   yes    |
| <a name="input_pep_vnet_id"></a> [pep_vnet_id](#input_pep_vnet_id)                                                                      | The ID of the Virtual Network (VNet) containing the subnet dedicated to Private Endpoints.                                                                                                             | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | n/a     |   yes    |
| <a name="input_private_dns_zone_resource_group_id"></a> [private_dns_zone_resource_group_id](#input_private_dns_zone_resource_group_id) | The ID of the resource group containing private DNS zones.                                                                                                                                             | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | n/a     |   yes    |
| <a name="input_repository"></a> [repository](#input_repository)                                                                         | Details about the GitHub repository, including owner and name.                                                                                                                                         | <pre>object({<br/> owner = optional(string, "pagopa")<br/> name = string<br/> })</pre>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | n/a     |   yes    |
| <a name="input_sbns_id"></a> [sbns_id](#input_sbns_id)                                                                                  | The ID of the Azure Service Bus Namespace.                                                                                                                                                             | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`  |    no    |
| <a name="input_subscription_id"></a> [subscription_id](#input_subscription_id)                                                          | The Azure subscription ID where resources will be created.                                                                                                                                             | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | n/a     |   yes    |
| <a name="input_tags"></a> [tags](#input_tags)                                                                                           | A map of tags to assign to the resources.                                                                                                                                                              | `map(string)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | n/a     |   yes    |
| <a name="input_tenant_id"></a> [tenant_id](#input_tenant_id)                                                                            | The Azure tenant ID where resources will be created.                                                                                                                                                   | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | n/a     |   yes    |
| <a name="input_terraform_storage_account"></a> [terraform_storage_account](#input_terraform_storage_account)                            | Details of the Storage Account (name and resource group) hosting the Terraform state file.                                                                                                             | <pre>object({<br/> resource_group_name = string<br/> name = string<br/> })</pre>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | n/a     |   yes    |

## Outputs

| Name                                                                                               | Description                                                                                |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| <a name="output_github_private_runner"></a> [github_private_runner](#output_github_private_runner) | Details of the GitHub private runner, including ID, name, and resource group name.         |
| <a name="output_identities"></a> [identities](#output_identities)                                  | Details of the user-assigned identities for app, infra, and opex, including IDs and names. |
| <a name="output_repository"></a> [repository](#output_repository)                                  | GitHub repository name and owner.                                                          |
| <a name="output_resource_group"></a> [resource_group](#output_resource_group)                      | Details of the main resource group, including ID, name, and location.                      |
| <a name="output_subscription_id"></a> [subscription_id](#output_subscription_id)                   | The Azure Subscription ID of the Terraform state file.                                     |

<!-- END_TF_DOCS -->
