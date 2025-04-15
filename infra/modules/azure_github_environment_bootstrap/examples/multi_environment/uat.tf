data "azurerm_subscription" "current_uat" {
  provider = azurerm.uat
}

data "azurerm_client_config" "current_uat" {
  provider = azurerm.uat
}

data "azurerm_container_app_environment" "runner_uat" {
  provider            = azurerm.uat
  name                = format(local.runner.cae_name, "u")
  resource_group_name = format(local.runner.cae_resource_group_name, "u")
}

data "azurerm_virtual_network" "common_uat" {
  provider            = azurerm.uat
  name                = format(local.vnet.name, "u")
  resource_group_name = format(local.vnet.resource_group_name, "u")
}

data "azurerm_resource_group" "dashboards_uat" {
  provider = azurerm.uat
  name     = "dashboards"
}

data "azurerm_resource_group" "common_uat" {
  provider = azurerm.uat
  name     = format(local.common.resource_group_name, "u")
}

data "azuread_group" "admins_uat" {
  display_name = local.adgroups.admins_name
}

data "azuread_group" "developers_uat" {
  display_name = local.adgroups.devs_name
}

data "azuread_group" "externals_uat" {
  display_name = local.adgroups.external_name
}

module "uat" {
  source = "../.."
  providers = {
    azurerm = azurerm.uat
  }

  environment = merge(local.environment, { env_short = "u" })

  subscription_id = data.azurerm_subscription.current_uat.id
  tenant_id       = data.azurerm_client_config.current_uat.tenant_id

  entraid_groups = {
    admins_object_id    = data.azuread_group.admins_uat.object_id
    devs_object_id      = data.azuread_group.developers_uat.object_id
    externals_object_id = data.azuread_group.externals_uat.object_id
  }

  terraform_storage_account = {
    name                = format(local.tf_storage_account.name, "uat")
    resource_group_name = local.tf_storage_account.resource_group_name
  }

  repository = merge(local.repository, { configure = false })

  github_private_runner = {
    container_app_environment_id       = data.azurerm_container_app_environment.runner_uat.id
    container_app_environment_location = data.azurerm_container_app_environment.runner_uat.location
    key_vault = {
      name                = format(local.runner.secret.kv_name, "u")
      resource_group_name = format(local.runner.secret.kv_resource_group_name, "u")
    }
  }

  pep_vnet_id                        = data.azurerm_virtual_network.common_uat.id
  private_dns_zone_resource_group_id = data.azurerm_resource_group.common_uat.id
  opex_resource_group_id             = data.azurerm_resource_group.dashboards_uat.id

  tags = merge(local.tags, { Environment = "Uat" })

  depends_on = [module.dev]
}
