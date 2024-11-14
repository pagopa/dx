output "private_dns_zones" {
  value = {
    redis_cache   = azurerm_private_dns_zone.privatelink_redis_cache
    postgres      = azurerm_private_dns_zone.privatelink_postgres_database_azure_com
    table         = azurerm_private_dns_zone.privatelink_table_core
    queue         = azurerm_private_dns_zone.privatelink_queue_core
    file          = azurerm_private_dns_zone.privatelink_file_core
    blob          = azurerm_private_dns_zone.privatelink_blob_core
    vault         = azurerm_private_dns_zone.privatelink_vault
    search        = azurerm_private_dns_zone.privatelink_srch
    mongo         = azurerm_private_dns_zone.privatelink_mongo_cosmos
    cr            = azurerm_private_dns_zone.privatelink_azurecr_io
    mysql         = azurerm_private_dns_zone.privatelink_mysql_database_azure_com
    api           = azurerm_private_dns_zone.azure_api_net
    servicebus    = azurerm_private_dns_zone.privatelink_servicebus
    documents     = azurerm_private_dns_zone.privatelink_documents
    azurewebsites = azurerm_private_dns_zone.privatelink_azurewebsites

  }
}