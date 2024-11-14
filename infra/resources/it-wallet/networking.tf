resource "azurerm_private_dns_zone" "cosno" {
  name                = "privatelink.documents.azure.com"
  resource_group_name = azurerm_resource_group.networking_01.name

  tags = local.tags
}

resource "azurerm_virtual_network" "ps_01" {
  name                = "${local.project}-vnet-01"
  resource_group_name = azurerm_resource_group.networking_01.name
  location            = local.location
  address_space       = ["10.20.0.0/16"]

  tags = local.tags
}

resource "azurerm_subnet" "pep_01" {
  name                 = "${local.project}-pep-snet-01"
  resource_group_name  = azurerm_virtual_network.ps_01.resource_group_name
  virtual_network_name = azurerm_virtual_network.ps_01.name

  address_prefixes = ["10.20.0.0/23"]
}

resource "azurerm_private_dns_zone_virtual_network_link" "cosno_ps_01" {
  name                  = azurerm_virtual_network.ps_01.name
  resource_group_name   = azurerm_virtual_network.ps_01.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.cosno.name
  virtual_network_id    = azurerm_virtual_network.ps_01.id
}

resource "azurerm_private_endpoint" "sql_01" {
  name                = "${local.project}-pep-cosno-01"
  location            = azurerm_cosmosdb_account.psn_01.location
  resource_group_name = azurerm_resource_group.ps_01.name
  subnet_id           = azurerm_subnet.pep_01.id

  private_service_connection {
    name                           = "${local.project}-pep-cosno-01"
    private_connection_resource_id = azurerm_cosmosdb_account.psn_01.id
    is_manual_connection           = false
    subresource_names              = ["Sql"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.cosno.id]
  }

  tags = local.tags
}
