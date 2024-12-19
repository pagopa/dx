resource "azurerm_private_endpoint" "app_service_sites" {
  name                = module.naming_convention.name.app_private_endpoint["1"]
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = module.naming_convention.name.app_private_endpoint["1"]
    private_connection_resource_id = azurerm_linux_web_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.app_service.id]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "staging_app_service_sites" {
  count = local.app_service.is_slot_enabled

  name                = module.naming_convention.name.app_slot_private_endpoint["1"]
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = module.naming_convention.name.app_slot_private_endpoint["1"]
    private_connection_resource_id = azurerm_linux_web_app.this.id
    is_manual_connection           = false
    subresource_names              = ["sites-${azurerm_linux_web_app_slot.this[0].name}"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.app_service.id]
  }

  tags = var.tags
}
