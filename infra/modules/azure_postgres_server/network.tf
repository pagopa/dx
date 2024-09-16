resource "azurerm_private_endpoint" "postgre_pe" {
  name                = "${local.db_name_prefix}-psql-pep-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.db_name_prefix}-psql-pep-${var.environment.instance_number}"
    private_connection_resource_id = azurerm_postgresql_flexible_server.this.id
    is_manual_connection           = false
    subresource_names              = ["postgre"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.postgre_dns_zone.id]
  }

  tags = var.tags
}

#--------------------------#
# Replica Private Endpoint #
#--------------------------#

resource "azurerm_private_endpoint" "replica_postgre_pe" {
  count = var.tier == "premium" ? 1 : 0

  name                = "${local.db_name_prefix}-psql-pep-replica-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.db_name_prefix}-psql-pep-replica-${var.environment.instance_number}"
    private_connection_resource_id = azurerm_postgresql_flexible_server.replica[0].id
    is_manual_connection           = false
    subresource_names              = ["postgre-replica"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.postgre_dns_zone.id]
  }

  tags = var.tags
}