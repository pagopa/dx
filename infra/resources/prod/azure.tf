module "azure_core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 2.0"

  core_state = local.core_state
}

resource "azurerm_user_assigned_identity" "metrics_portal" {
  name = provider::azuredx::resource_name(merge(local.azure_naming_config, {
    domain        = "metrics"
    app_name      = "portal"
    resource_type = "managed_identity"
  }))

  location            = local.azure_naming_config.location
  resource_group_name = module.azure_core_values.common_resource_group_name
  tags                = local.tags
}

module "container_app_infra" {
  source  = "pagopa-dx/azure-container-app-environment/azurerm"
  version = "~> 4.0"

  environment         = merge(local.azure_naming_config, { env_short = local.azure_naming_config.environment, app_name = "common" })
  resource_group_name = module.azure_core_values.common_resource_group_name
  tags                = local.tags

  networking = {
    virtual_network_id            = module.azure_core_values.common_vnet.id
    public_network_access_enabled = true
  }

  log_analytics_workspace_id = module.azure_core_values.common_log_analytics_workspace.id
}

module "metrics_portal" {
  source = "../_modules/metrics_portal"

  environment = merge(local.azure_naming_config, {
    domain   = "metrics"
    app_name = "portal"
  })

  tenant_id = data.azurerm_client_config.current.tenant_id

  custom_domain_host_name = "metrics.dx.pagopa.it"

  resource_group_name = module.azure_core_values.common_resource_group_name
  tags                = local.tags

  subnet_pep_id                        = module.azure_core_values.common_pep_snet.id
  private_dns_zone_resource_group_name = module.azure_core_values.network_resource_group_name

  key_vault_id = module.azure_core_values.common_key_vault.id

  # Container App specific inputs
  container_app_env_id                              = module.container_app_infra.id
  container_app_user_assigned_identity_id           = azurerm_user_assigned_identity.metrics_portal.id
  container_app_user_assigned_identity_principal_id = azurerm_user_assigned_identity.metrics_portal.principal_id
  container_app_image                               = "ghcr.io/pagopa/dx-metrics:latest"

  network_resource_group_name = module.azure_core_values.network_resource_group_name
}

module "dx_website" {
  source = "../_modules/dx_website"

  resource_group_name         = module.azure_core_values.common_resource_group_name
  network_resource_group_name = module.azure_core_values.network_resource_group_name
  environment                 = local.azure_naming_config
  tags                        = local.tags
}
