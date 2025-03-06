resource "azurerm_private_dns_a_record" "this" {
  name                = azurerm_container_app.this.latest_revision_fqdn
  resource_group_name = var.container_app_environment.private_dns_zone.resource_group_name
  zone_name           = var.container_app_environment.private_dns_zone.name
  ttl                 = 3600
  records             = azurerm_container_app.this.outbound_ip_addresses
}