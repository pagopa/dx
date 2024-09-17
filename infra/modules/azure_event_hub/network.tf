resource "azurerm_private_endpoint" "event_hub_pe" {
  name                = "${local.app_name_prefix}-evhns-pep-${var.environment.instance_number}"
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_pep_id

  private_service_connection {
    name                           = "${local.app_name_prefix}-evhns-pep-${var.environment.instance_number}"
    private_connection_resource_id = module.event_hub.namespace_id
    is_manual_connection           = false
    subresource_names              = ["namespace"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.this.id]
  }

  tags = var.tags
}