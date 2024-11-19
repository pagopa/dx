#
# Private endpoints
#
resource "azurerm_private_endpoint" "vault" {
  name                = "${var.prefix}-kv-pep-${var.suffix}"
  location            = var.location
  resource_group_name = var.private_dns_zone.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${var.prefix}-kv-pep-${var.suffix}"
    private_connection_resource_id = azurerm_key_vault.common.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.private_dns_zone.id]
  }
}
