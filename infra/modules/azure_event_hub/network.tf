resource "azurerm_private_endpoint" "event_hub_pep" {
  name                = provider::dx::resource_name(merge(local.naming_config, { resource_type = "eventhub_private_endpoint" }))
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = provider::dx::resource_name(merge(local.naming_config, { resource_type = "eventhub_private_endpoint" }))
    private_connection_resource_id = azurerm_eventhub_namespace.this.id
    is_manual_connection           = false
    subresource_names              = ["namespace"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.this.id]
  }

  tags = var.tags
}