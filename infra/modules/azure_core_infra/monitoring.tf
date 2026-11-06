module "common_log_analytics" {
  source = "./modules/log_analytics"

  naming_config = local.naming_config

  resource_group_name = azurerm_resource_group.common.name
  location            = var.environment.location

  tags = local.tags
}

module "application_insights" {
  source = "./modules/application_insights"

  naming_config = local.naming_config

  resource_group_name = azurerm_resource_group.common.name
  location            = var.environment.location

  log_analytics_workspace_id = module.common_log_analytics.id
  mask_ip_address            = var.ai_mask_ip_address
  key_vault_id               = module.key_vault.id

  tags = local.tags
}
