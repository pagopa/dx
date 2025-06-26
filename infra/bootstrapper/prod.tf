module "prod_bootstrap" {
  source = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
  version = "~> 2.0"

  providers = {
    azurerm = azurerm.prod
  }

  environment = merge(local.environment, { env_short = "p", domain = "bootstrap" })

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
    container_app_environment_id       = module.prod_core.github_runner.environment_id
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
