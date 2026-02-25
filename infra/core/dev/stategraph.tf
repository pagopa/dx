resource "azurerm_resource_group" "stategraph" {
  name = provider::azuredx::resource_name(merge(local.azure_environment, {
    resource_type = "resource_group",
    app_name      = "stategraph"
  }))
  location = local.azure_environment.location

  tags = local.tags
}

module "stategraph" {
  source = "../_modules/stategraph"

  providers = {
    dx = azuredx
  }

  environment         = merge(local.azure_environment, { app_name = "stategraph" })
  resource_group_name = azurerm_resource_group.stategraph.name

  tenant_id = data.azurerm_client_config.current.tenant_id
  admins = {
    for u in data.azuread_users.admin_members.users :
    u.user_principal_name => u.object_id
  }

  vnet = {
    id                  = module.azure.common_vnet.id
    name                = module.azure.common_vnet.name
    resource_group_name = module.azure.network_resource_group_name
  }
  pep_subnet_id        = module.azure.common_pep_snet.id
  postgres_dns_zone_id = data.azurerm_private_dns_zone.postgres.id
  cae_dns_zone_id      = data.azurerm_private_dns_zone.cae.id
  key_vault = {
    id   = module.azure.common_key_vault.id
    name = module.azure.common_key_vault.name
  }
  log_analytics_workspace_id = module.azure.common_log_analytics_workspace.id

  tags = local.tags
}
