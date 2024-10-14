#
# Private endpoints
#
resource "azurerm_private_endpoint" "sql" {
  name                = "${module.naming_convention.prefix}-cosno-pep-${module.naming_convention.suffix}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${module.naming_convention.prefix}-cosno-pep-${module.naming_convention.suffix}"
    private_connection_resource_id = azurerm_cosmosdb_account.this.id
    is_manual_connection           = false
    subresource_names              = ["Sql"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.cosmos.id]
  }
}
