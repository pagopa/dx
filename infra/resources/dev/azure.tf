module "azure_core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"

  core_state = local.core_state
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

  application_insights_connection_string = try(module.azure_core_values.application_insights.connection_string, null)
}
