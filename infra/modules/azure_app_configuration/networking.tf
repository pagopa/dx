resource "azurerm_private_endpoint" "app_config" {
  name                = local.appcs.private_endpoint_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.appcs.private_endpoint_name
    private_connection_resource_id = azurerm_app_configuration.this.id
    is_manual_connection           = false
    subresource_names              = ["configurationStores"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.appconfig.id]
  }

  tags = local.tags
}
