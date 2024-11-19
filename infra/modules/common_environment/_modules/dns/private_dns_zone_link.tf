resource "azurerm_private_dns_zone_virtual_network_link" "redis_private_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_redis_cache.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "privatelink_postgres_database_azure_com_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_postgres_database_azure_com.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "privatelink_mysql_database_azure_com_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_mysql_database_azure_com.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "privatelink_azurecr_io_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_azurecr_io.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}


resource "azurerm_private_dns_zone_virtual_network_link" "mongo_cosmos_private_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_mongo_cosmos.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "servicebus_private_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name # var.resource_groups.event
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_servicebus.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "documents_private_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_documents.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "blob_core_private_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_blob_core.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "file_core_private_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_file_core.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "queue_core_private_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_queue_core.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "table_core_private_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_table_core.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "azurewebsites_private_vnet" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_azurewebsites.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "srch_private_vnet_common" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_srch.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "vault_private_vnet_common" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.privatelink_vault.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "azure_api_net_vnet_common" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.azure_api_net.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "management_azure_api_net_vnet_common" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.management_azure_api_net.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "scm_azure_api_net_vnet_common" {
  name                  = var.virtual_network.name
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.scm_azure_api_net.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}