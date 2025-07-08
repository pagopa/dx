module "core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"

  core_state = var.core_state
}

module "bootstrap" {
  source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
  version = "~> 2.0"

  environment = var.environment

  subscription_id = data.azurerm_subscription.current.id
  tenant_id       = data.azurerm_client_config.current.tenant_id

  entraid_groups = {
    admins_object_id    = data.azuread_group.admins.object_id
    devs_object_id      = data.azuread_group.developers.object_id
    externals_object_id = data.azuread_group.externals.object_id
  }

  terraform_storage_account = {
    name                = local.tf_storage_account.name
    resource_group_name = local.tf_storage_account.resource_group_name
  }

  repository = var.repository

  github_private_runner = {
    container_app_environment_id       = module.core_values.github_runner.environment_id
    container_app_environment_location = var.environment.location
    labels = [
      local.env_long
    ]
    key_vault = {
      name                = module.core_values.common_key_vault.name
      resource_group_name = module.core_values.common_key_vault.resource_group_name
    }
  }

  pep_vnet_id                        = module.core_values.common_vnet.id
  private_dns_zone_resource_group_id = module.core_values.network_resource_group_id
  opex_resource_group_id             = module.core_values.opex_resource_group_id

  tags = var.tags
}

resource "azurerm_role_assignment" "user_access_administrator" {
  count                = var.environment.env_short == "d" ? 1 : 0
  scope                = module.core_values.test_resource_group_id
  role_definition_name = "User Access Administrator"
  principal_id         = module.bootstrap.identities.infra.ci.principal_id
}

module "roles_ci" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = module.bootstrap.identities.infra.ci.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [
    {
      name                = module.core_values.common_key_vault.name
      resource_group_name = module.core_values.common_key_vault.resource_group_name
      description         = "Allow dx repo CI to read secrets"
      roles = {
        secrets = "writer"
      }
    }
  ]
}

module "roles_cd" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = module.bootstrap.identities.infra.cd.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [
    {
      name                = module.core_values.common_key_vault.name
      resource_group_name = module.core_values.common_key_vault.resource_group_name
      description         = "Allow dx repo CD to read secrets"
      roles = {
        secrets = "reader"
      }
    }
  ]
}

resource "azurerm_role_assignment" "storage_blob_contributor" {
  count                = var.environment.env_short == "d" ? 1 : 0
  scope                = data.azurerm_resource_group.tfstate.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.bootstrap.identities.infra.ci.principal_id
}

resource "azurerm_role_assignment" "contributor" {
  count                = var.environment.env_short == "d" ? 1 : 0
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Contributor"
  principal_id         = module.bootstrap.identities.infra.ci.principal_id
}

resource "github_actions_secret" "codecov_token" {
  repository      = var.repository.name
  secret_name     = "CODECOV_TOKEN"
  plaintext_value = data.azurerm_key_vault_secret.codecov_token.value
}
