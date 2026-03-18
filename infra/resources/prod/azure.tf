module "azure_core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"

  core_state = local.core_state
}

# Generate available CIDR block for Container App subnet (/24 provides 256 addresses for multiple container apps)
resource "dx_available_subnet_cidr" "container_app" {
  provider           = azuredx
  virtual_network_id = module.azure_core_values.common_vnet.id
  prefix_length      = 24
}

# Container App Environment with dedicated subnet using pagopa-dx module
module "container_app_infra" {
  source  = "pagopa-dx/azure-container-app-environment/azurerm"
  version = "~> 1.1"

  environment         = merge(local.azure_naming_config, { env_short = local.azure_naming_config.environment, app_name = "common" })
  resource_group_name = module.azure_core_values.common_resource_group_name
  tags                = local.tags

  virtual_network = {
    name                = module.azure_core_values.common_vnet.name
    resource_group_name = module.azure_core_values.network_resource_group_name
  }

  subnet_cidr                          = dx_available_subnet_cidr.container_app.cidr_block
  subnet_pep_id                        = module.azure_core_values.common_pep_snet.id
  private_dns_zone_resource_group_name = module.azure_core_values.network_resource_group_name
  log_analytics_workspace_id           = module.azure_core_values.common_log_analytics_workspace.id
}

module "metrics_portal" {
  source = "../_modules/metrics_portal"

  environment = merge(local.azure_naming_config, {
    domain   = "metrics"
    app_name = "portal"
  })

  resource_group_name = module.azure_core_values.common_resource_group_name
  tags                = local.tags

  subnet_pep_id                        = module.azure_core_values.common_pep_snet.id
  private_dns_zone_resource_group_name = module.azure_core_values.network_resource_group_name

  key_vault_id = module.azure_core_values.common_key_vault.id

  # Container App specific inputs
  container_app_env_id                              = module.container_app_infra.id
  container_app_user_assigned_identity_id           = module.container_app_infra.user_assigned_identity.id
  container_app_user_assigned_identity_principal_id = module.container_app_infra.user_assigned_identity.principal_id
  container_app_image                               = "ghcr.io/pagopa/dx-metrics:latest"
}

module "dx_website" {
  source = "../_modules/dx_website"

  resource_group_name         = module.azure_core_values.common_resource_group_name
  network_resource_group_name = module.azure_core_values.network_resource_group_name
  environment                 = local.azure_naming_config
  tags                        = local.tags
}
