resource "azurerm_storage_account_network_rules" "st_network_rules" {
  storage_account_id = azurerm_storage_account.this.id
  default_action     = "Deny"
  bypass             = ["Metrics", "Logging", "AzureServices"]
}

resource "azurerm_storage_account_network_rules" "network_rules" {
  for_each = var.network_rules
  storage_account_id = azurerm_storage_account.this.id
  default_action             = each.value.default_action
  ip_rules                   = each.value.ip_rules
  virtual_network_subnet_ids = each.value.virtual_network_subnet_ids
}

resource "azurerm_private_endpoint" "this" {
  for_each = { for subservice, status in var.subservices : subservice => status if status }
  name                = local.peps[each.key].name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.peps[each.key].name
    private_connection_resource_id = azurerm_storage_account.this.id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account[each.key].id]
  }

  tags = var.tags
}