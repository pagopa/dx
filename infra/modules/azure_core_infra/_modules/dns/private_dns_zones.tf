resource "azurerm_private_dns_zone" "private_dns_zones" {
  for_each            = var.private_dns_zones
  name                = each.value
  resource_group_name = var.resource_group_name

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "private_dns_links" {
  for_each = var.private_dns_zones

  name                 = var.virtual_network.name
  private_dns_zone_id  = azurerm_private_dns_zone.private_dns_zones[each.key].id
  virtual_network_id   = var.virtual_network.id
  registration_enabled = false

  tags = var.tags
}
