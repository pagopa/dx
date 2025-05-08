resource "azurerm_storage_account_network_rules" "network_rules" {
  count                      = anytrue([length(var.network_rules.bypass) > 0, length(var.network_rules.ip_rules) > 0, length(var.network_rules.virtual_network_subnet_ids) > 0]) ? 1 : 0
  storage_account_id         = azurerm_storage_account.this.id
  default_action             = var.network_rules.default_action
  bypass                     = toset(concat(var.network_rules.bypass, ["Metrics", "Logging", "AzureServices"]))
  ip_rules                   = var.network_rules.ip_rules
  virtual_network_subnet_ids = var.network_rules.virtual_network_subnet_ids
}

resource "azurerm_private_endpoint" "this" {
  for_each = { for subservice, status in local.peps.create_subservices : subservice => status if status }

  name                = local.peps[each.key].name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.peps[each.key].name
    private_connection_resource_id = azurerm_storage_account.this.id
    is_manual_connection           = false
    subresource_names              = [each.key]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.storage_account[each.key].id]
  }

  tags = local.tags
}
