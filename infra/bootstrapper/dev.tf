module "dev_core" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 1.0"

  providers = {
    azurerm = azurerm.dev
  }

  test_enabled = false

  environment = merge(local.environment, { env_short = "d" })

  virtual_network_cidr = "10.51.0.0/16"
  pep_subnet_cidr      = "10.51.2.0/23"
  gh_runner_snet       = "10.51.242.0/24"

  vpn = {
    cidr_subnet              = "10.51.133.0/24"
    dnsforwarder_cidr_subnet = "10.51.252.8/29"
  }

  nat_enabled = true

  tags = merge(local.tags, { Environment = "Dev" })
}

resource "azurerm_resource_group" "opex_dev" {
  provider = azurerm.dev

  name     = format(local.opex_rg_name, "d")
  location = local.environment.location

  tags = merge(local.tags, { Environment = "Dev" })
}

module "dev_bootstrap" {
  source = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
  version = "~> 2.0"

  providers = {
    azurerm = azurerm.dev
  }

  environment = merge(local.environment, { env_short = "d", domain = "bootstrap" })

  subscription_id = data.azurerm_subscription.current_dev.id
  tenant_id       = data.azurerm_client_config.current_dev.tenant_id

  entraid_groups = {
    admins_object_id    = data.azuread_group.admins_dev.object_id
    devs_object_id      = data.azuread_group.developers_dev.object_id
    externals_object_id = data.azuread_group.externals_dev.object_id
  }

  terraform_storage_account = {
    name                = format(local.tf_storage_account.name, "d")
    resource_group_name = format(local.tf_storage_account.resource_group_name, "d")
  }

  repository = merge(local.repository, { configure = false })

  github_private_runner = {
    container_app_environment_id       = module.dev_core.github_runner.environment_id
    container_app_environment_location = local.environment.location
    key_vault = {
      name                = module.dev_core.common_key_vault.name
      resource_group_name = module.dev_core.common_key_vault.resource_group_name
    }
  }

  pep_vnet_id                        = module.dev_core.common_vnet.id
  private_dns_zone_resource_group_id = module.dev_core.network_resource_group_id
  opex_resource_group_id             = azurerm_resource_group.opex_dev.id

  tags = merge(local.tags, { Environment = "Dev" })

  depends_on = [module.prod_bootstrap]
}
