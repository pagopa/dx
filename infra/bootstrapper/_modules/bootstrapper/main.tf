module "core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"
  # source = "github.com/pagopa/dx//infra/modules/azure_core_values_exporter?ref=application-insights-as-core-resource"

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

  additional_resource_group_ids = concat([module.core_values.common_resource_group_id], (module.core_values.test_resource_group_id != null ? [module.core_values.test_resource_group_id] : []))
  tags                          = var.tags
}

resource "github_actions_environment_secret" "appi_instrumentation_key" {
  count           = var.environment.env_short == "p" ? 1 : 0
  repository      = var.repository.name
  environment     = "github-pages"
  secret_name     = "APPLICATION_INSIGHTS_INSTRUMENTATION_KEY"
  plaintext_value = data.azurerm_key_vault_secret.appinsights_instrumentation_key[0].value
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

resource "azurerm_key_vault_secret" "codecov_token" {
  name         = "codecov-token"
  value        = "Dummy to be replaced"
  key_vault_id = module.core_values.common_key_vault.id

  lifecycle {
    ignore_changes = [
      value
    ]
  }
}

resource "github_actions_secret" "codecov_token" {
  count           = var.environment.env_short == "d" ? 1 : 0
  repository      = var.repository.name
  secret_name     = "CODECOV_TOKEN"
  plaintext_value = azurerm_key_vault_secret.codecov_token.value
}
