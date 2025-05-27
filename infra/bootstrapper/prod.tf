module "prod_core" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 1.0"

  providers = {
    azurerm = azurerm.prod
  }

  test_enabled = false

  environment = merge(local.environment, { env_short = "p" })

  virtual_network_cidr = "10.52.0.0/16"
  pep_subnet_cidr      = "10.52.2.0/23"
  gh_runner_snet       = "10.52.242.0/24"

  vpn = {
    cidr_subnet              = "10.52.133.0/24"
    dnsforwarder_cidr_subnet = "10.52.252.8/29"
  }

  nat_enabled = true

  tags = merge(local.tags, { Environment = "Prod" })
}

resource "azurerm_resource_group" "opex_prod" {
  provider = azurerm.prod

  name     = format(local.opex_rg_name, "p")
  location = local.environment.location

  tags = merge(local.tags, { Environment = "Prod" })
}

module "prod_container_app_environment" {
  source  = "pagopa-dx/azure-container-app-environment/azurerm"
  version = "~> 1.0"

  providers = {
    azurerm = azurerm.prod
  }

  environment = merge(local.environment, { env_short = "p" })

  resource_group_name = module.prod_core.common_resource_group_name
  subnet_pep_id = module.prod_core.common_pep_snet.id
  log_analytics_workspace_id = module.prod_core.common_log_analytics_workspace.workspace_id

  tags = merge(local.tags, { Environment = "Prod" })
}

module "prod_bootstrap" {
  source = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
  version = "~> 2.0"

  providers = {
    azurerm = azurerm.prod
  }

  environment = merge(local.environment, { env_short = "p" })

  subscription_id = data.azurerm_subscription.current_prod.id
  tenant_id       = data.azurerm_client_config.current_prod.tenant_id

  entraid_groups = {
    admins_object_id    = data.azuread_group.admins_prod.object_id
    devs_object_id      = data.azuread_group.developers_prod.object_id
    externals_object_id = data.azuread_group.externals_prod.object_id
  }

  terraform_storage_account = {
    name                = format(local.tf_storage_account.name, "p")
    resource_group_name = format(local.tf_storage_account.resource_group_name, "p")
  }

  repository = local.repository

  github_private_runner = {
    container_app_environment_id       = module.prod_container_app_environment.id
    container_app_environment_location = local.environment.location
    key_vault = {
      name                = module.prod_core.common_key_vault.name
      resource_group_name = module.prod_core.common_key_vault.resource_group_name
    }
  }

  pep_vnet_id                        = module.prod_core.common_vnet.id
  private_dns_zone_resource_group_id = module.prod_core.network_resource_group_id
  opex_resource_group_id             = azurerm_resource_group.opex_prod.id

  tags = merge(local.tags, { Environment = "Prod" })
}
