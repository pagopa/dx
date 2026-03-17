module "azure_core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"

  core_state = local.core_state
}

# Container App Environment with dedicated subnet
module "container_app_infra" {
  source = "../_modules/container_app_environment"

  environment         = merge(local.environment, { app_name = "container-app" })
  resource_group_name = data.azurerm_resource_group.dx.name
  tags                = local.tags

  virtual_network_id                   = data.azurerm_virtual_network.common.id
  virtual_network_name                 = data.azurerm_virtual_network.common.name
  virtual_network_resource_group_name  = data.azurerm_virtual_network.common.resource_group_name
  private_dns_zone_resource_group_name = module.azure_core_values.network_resource_group_name
  log_analytics_workspace_id           = module.azure_core_values.common_log_analytics_workspace.id
}

module "metrics_portal" {
  source = "../_modules/metrics_portal"

  environment = merge(local.environment, {
    domain   = "metrics"
    app_name = "portal"
  })

  resource_group_name = data.azurerm_resource_group.dx.name
  tags                = local.tags

  subnet_pep_id                        = module.azure_core_values.common_pep_snet.id
  private_dns_zone_resource_group_name = module.azure_core_values.network_resource_group_name

  key_vault_id = module.azure_core_values.common_key_vault.id

  # Container App specific inputs
  container_app_env_id                    = module.container_app_infra.container_app_environment_id
  container_app_user_assigned_identity_id = module.container_app_infra.user_assigned_identity_id
  container_app_image                     = "ghcr.io/pagopa/dx/dx-metrics:latest"
}

module "dx_website" {
  source = "../_modules/dx_website"

  resource_group_name         = module.azure_core_values.common_resource_group_name
  network_resource_group_name = module.azure_core_values.network_resource_group_name
  naming_config               = local.azure_naming_config
  tags                        = local.tags
}
