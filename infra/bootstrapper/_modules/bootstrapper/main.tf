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
