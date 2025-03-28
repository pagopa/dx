#
# Private endpoints
#
locals {
  pep_name = provider::dx::resource_name(merge(
    var.name_env,
    {
      resource_type = "key_vault_private_endpoint",
  }))
}

resource "azurerm_private_endpoint" "vault" {
  name                = local.pep_name
  location            = var.location
  resource_group_name = var.private_dns_zone.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = local.pep_name
    private_connection_resource_id = azurerm_key_vault.common.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.private_dns_zone.id]
  }
}
