data "azurerm_subscription" "current_dev" {
  provider = azurerm.dev
}

data "azurerm_client_config" "current_dev" {
  provider = azurerm.dev
}

data "azurerm_container_app_environment" "runner_dev" {
  provider            = azurerm.dev
  name                = format(local.runner.cae_name, "d")
  resource_group_name = format(local.runner.cae_resource_group_name, "d")
}

data "azurerm_virtual_network" "common_dev" {
  provider            = azurerm.dev
  name                = format(local.vnet.name, "d")
  resource_group_name = format(local.vnet.resource_group_name, "d")
}

data "azurerm_resource_group" "vnet_dev" {
  provider = azurerm.dev
  name     = format(local.vnet.resource_group_name, "d")
}

data "azurerm_resource_group" "dashboards_dev" {
  name = "dashboards"
}

data "azurerm_resource_group" "common_dev" {
  provider = azurerm.dev
  name     = format(local.common.resource_group_name, "d")
}

data "azuread_group" "admins_dev" {
  display_name = local.adgroups.admins_name
}

data "azuread_group" "developers_dev" {
  display_name = local.adgroups.devs_name
}

data "azuread_group" "externals_dev" {
  display_name = local.adgroups.external_name
}

module "dev" {
  source = "../.."
  providers = {
    azurerm = azurerm.dev
  }

  environment = merge(local.environment, { env_short = "d" })

  subscription_id = data.azurerm_subscription.current_dev.id
  tenant_id       = data.azurerm_client_config.current_dev.tenant_id

  entraid_groups = {
    admins_object_id    = data.azuread_group.admins_dev.object_id
    devs_object_id      = data.azuread_group.developers_dev.object_id
    externals_object_id = data.azuread_group.externals_dev.object_id
  }

  terraform_storage_account = {
    name                = format(local.tf_storage_account.name, "dev")
    resource_group_name = local.tf_storage_account.resource_group_name
  }

  repository = merge(local.repository, { configure = false })

  github_private_runner = {
    container_app_environment_id       = data.azurerm_container_app_environment.runner_dev.id
    container_app_environment_location = data.azurerm_container_app_environment.runner_dev.location
    key_vault = {
      name                = format(local.runner.secret.kv_name, "d")
      resource_group_name = format(local.runner.secret.kv_resource_group_name, "d")
    }
  }

  pep_vnet_id                        = data.azurerm_virtual_network.common_dev.id
  private_dns_zone_resource_group_id = data.azurerm_resource_group.common_dev.id
  opex_resource_group_id             = data.azurerm_resource_group.dashboards_dev.id

  tags = merge(local.tags, { Environment = "Dev" })
}
